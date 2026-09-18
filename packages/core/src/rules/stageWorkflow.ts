import type { BusinessHour, Holiday } from "../schema/stageWorkflow.js";

export const STAGE_MOVE_COOLDOWN_MS = 3_000;

export interface WorkflowStage {
  id: string;
  pipelineId: string;
  restrictTransitions: boolean;
  allowWon: boolean;
  allowLost: boolean;
}

export function canMoveBetweenStages(source: WorkflowStage, target: WorkflowStage, transitions: readonly { fromStageId: string; toStageId: string }[]): boolean {
  if (source.id === target.id || source.pipelineId !== target.pipelineId) return false;
  if (!source.restrictTransitions) return true;
  return transitions.some((transition) => transition.fromStageId === source.id && transition.toStageId === target.id);
}

export function canCloseAtStage(stage: Pick<WorkflowStage, "allowWon" | "allowLost">, status: "won" | "lost"): boolean {
  return status === "won" ? stage.allowWon : stage.allowLost;
}

export function stageMoveCooldownRemaining(stageEnteredAt: string, now: Date): number {
  return Math.max(0, STAGE_MOVE_COOLDOWN_MS - (now.getTime() - new Date(stageEnteredAt).getTime()));
}

/**
 * Uma etapa só é arquivada quando está vazia. Arquivar com negócio aberto
 * dentro faria aquele negócio sumir de todo quadro que lista só etapas
 * ativas — não é "esconder a etapa", é "esconder o negócio por engano".
 */
export function canArchiveStage(openDealCount: number): boolean {
  return openDealCount === 0;
}

/**
 * A nova ordem precisa ser exatamente as mesmas etapas, só reorganizadas —
 * nem uma a mais, nem uma a menos, nem repetida. Aceitar qualquer lista
 * apagaria etapa por omissão (uma que o cliente esqueceu de incluir) ou
 * duplicaria posição (a mesma etapa duas vezes, a outra nenhuma).
 */
export function isValidStageOrder(currentIds: readonly string[], orderedIds: readonly string[]): boolean {
  if (currentIds.length !== orderedIds.length) return false;
  const current = new Set(currentIds);
  if (current.size !== currentIds.length) return false; // defeito de quem chamou, não deveria acontecer
  const proposed = new Set(orderedIds);
  if (proposed.size !== orderedIds.length) return false;
  for (const id of proposed) if (!current.has(id)) return false;
  return true;
}

export interface StageProbabilityWindow {
  /** Negócios que saíram desta etapa no período — para outra etapa ou fechados. */
  left: number;
  /** Desses, quantos saíram avançando (etapa de destino com sortOrder maior). */
  advanced: number;
}

export interface StageProbabilityInput {
  /** Janela longa (ex.: 90 dias) — a tendência de fundo. */
  longWindow: StageProbabilityWindow;
  /** Janela curta (ex.: 14 dias) — reage à sazonalidade recente. */
  shortWindow: StageProbabilityWindow;
}

/** Sem histórico nenhum ainda, começa otimista — não em zero, que
 * puniria toda etapa nova antes mesmo do primeiro negócio passar por ela. */
export const STAGE_PROBABILITY_DEFAULT = 100;

/** Abaixo disso, a taxa de um período é ruído — sujeita a virar de 100%
 * para 0% com um único negócio. Cai para o outro período, ou para o padrão. */
const MINIMUM_SAMPLE_SIZE = 5;

/** Quanto a janela curta pesa quando as duas têm amostra suficiente — mais
 * que a longa, porque é ela que carrega a sazonalidade recente, mas não
 * tudo, para uma semana atípica não virar a métrica sozinha. */
const SHORT_WINDOW_WEIGHT = 0.65;

/**
 * A probabilidade de uma etapa nunca é preenchida na mão (pedido do
 * usuário, 18/09) — só isto calcula, a partir de quem realmente saiu da
 * etapa e para onde. Pura de propósito: os números vêm de fora
 * (packages/db/deal-stage-moves), a decisão de como combiná-los mora aqui.
 */
export function calculateStageProbability({ longWindow, shortWindow }: StageProbabilityInput): number {
  const hasShort = shortWindow.left >= MINIMUM_SAMPLE_SIZE;
  const hasLong = longWindow.left >= MINIMUM_SAMPLE_SIZE;
  if (hasShort && hasLong) {
    return Math.round(advanceRate(shortWindow) * SHORT_WINDOW_WEIGHT + advanceRate(longWindow) * (1 - SHORT_WINDOW_WEIGHT));
  }
  if (hasShort) return Math.round(advanceRate(shortWindow));
  if (hasLong) return Math.round(advanceRate(longWindow));
  return STAGE_PROBABILITY_DEFAULT;
}

function advanceRate(window: StageProbabilityWindow): number {
  return window.left === 0 ? STAGE_PROBABILITY_DEFAULT : (window.advanced / window.left) * 100;
}

export interface SlaProgressState {
  elapsedMinutes: number;
  limitMinutes: number;
  remainingMinutes: number;
  percent: number;
  state: "on_track" | "due_soon" | "breached";
}

export function stageSlaProgress(elapsedMilliseconds: number, limitMinutes: number): SlaProgressState {
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMilliseconds / 60_000));
  const percent = Math.max(0, Math.round((elapsedMinutes / limitMinutes) * 100));
  return {
    elapsedMinutes,
    limitMinutes,
    remainingMinutes: Math.max(0, limitMinutes - elapsedMinutes),
    percent,
    state: percent >= 100 ? "breached" : percent >= 80 ? "due_soon" : "on_track",
  };
}

/** Counts only configured working intervals, replacing them with a reduced-hours exception when present. */
export function operatingMillisecondsBetween(start: Date, end: Date, hours: readonly BusinessHour[], exceptions: readonly Holiday[]): number {
  if (end <= start || hours.length === 0) return 0;
  const timeZone = hours[0]?.timeZone ?? "America/Sao_Paulo";
  const startDay = zonedDay(start, timeZone);
  const endDay = zonedDay(end, timeZone);
  let cursor = new Date(`${startDay}T00:00:00.000Z`);
  const last = new Date(`${endDay}T00:00:00.000Z`);
  let total = 0;
  while (cursor <= last) {
    const day = cursor.toISOString().slice(0, 10);
    const weekday = cursor.getUTCDay();
    const exception = exceptions.find((item) => dateFallsInException(day, item));
    const base = hours.find((item) => item.weekday === weekday && item.enabled);
    const periods = exception?.kind === "closed" ? [] : exception?.kind === "reduced"
      ? periodsFromTimes(exception.startTime, exception.breakStartTime, exception.breakEndTime, exception.endTime)
      : base ? periodsFromTimes(base.startTime, base.breakStartTime, base.breakEndTime, base.endTime) : [];
    for (const [from, to] of periods) {
      const intervalStart = zonedLocalToUtc(day, from, timeZone);
      const intervalEnd = zonedLocalToUtc(day, to, timeZone);
      total += Math.max(0, Math.min(end.getTime(), intervalEnd.getTime()) - Math.max(start.getTime(), intervalStart.getTime()));
    }
    cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return total;
}

function periodsFromTimes(start: string | null, breakStart: string | null, breakEnd: string | null, end: string | null): [string, string][] {
  if (!start || !end) return [];
  if (breakStart && breakEnd) return [[start, breakStart], [breakEnd, end]];
  return [[start, end]];
}

function dateFallsInException(day: string, exception: Holiday): boolean {
  if (!exception.repeatsAnnually) return day >= exception.startDate && day <= exception.endDate;
  const value = day.slice(5);
  return value >= exception.startDate.slice(5) && value <= exception.endDate.slice(5);
}

function zonedDay(value: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function zonedLocalToUtc(day: string, time: string, timeZone: string): Date {
  const [year, month, date] = day.split("-").map(Number) as [number, number, number];
  const [hour, minute] = time.split(":").map(Number) as [number, number];
  const nominal = Date.UTC(year, month - 1, date, hour, minute);
  let result = nominal;
  for (let index = 0; index < 2; index += 1) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(result));
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value ?? 0);
    const represented = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    result += nominal - represented;
  }
  return new Date(result);
}
