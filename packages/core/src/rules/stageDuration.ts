/**
 * Quanto tempo o negócio passou em cada etapa — o número que o Pipedrive
 * mostra dentro de cada seta da trilha.
 *
 * Não existe coluna para isso, e não precisa: o histórico já conta. Cada
 * `deal.stage_changed` marca a entrada numa etapa; a saída é o próximo evento,
 * ou agora, se é onde o negócio está. Antes do primeiro evento, o negócio
 * esteve na etapa em que foi criado desde a criação.
 *
 * Função pura: quem chama passa o "agora" (packages/core, lei 1).
 */
export interface StageVisit {
  stageId: string;
  enteredAt: string;
  leftAt: string | null;
  enteredFromStageId: string | null;
  leftToStageId: string | null;
}

export interface StageChange { stageId: string; occurredAt: string; sequence?: string }

export function stageVisits(
  createdAt: string,
  createdStageId: string,
  changes: readonly StageChange[],
  now: Date,
): StageVisit[] {
  // O histórico chega do mais novo para o mais velho na tela; aqui a ordem é cronológica.
  const ordered = [...changes].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || (left.sequence ?? "").localeCompare(right.sequence ?? ""));
  const visits: StageVisit[] = [{ stageId: createdStageId, enteredAt: createdAt, leftAt: null, enteredFromStageId: null, leftToStageId: null }];
  for (const change of ordered) {
    const previous = visits[visits.length - 1];
    if (previous) {
      if (previous.stageId === change.stageId) continue; // evento repetido não abre visita nova
      previous.leftAt = change.occurredAt;
      previous.leftToStageId = change.stageId;
    }
    visits.push({ stageId: change.stageId, enteredAt: change.occurredAt, leftAt: null, enteredFromStageId: previous?.stageId ?? null, leftToStageId: null });
  }
  void now;
  return visits;
}

/** Milissegundos somados por etapa — uma etapa visitada duas vezes soma as duas. */
export function millisecondsByStage(visits: readonly StageVisit[], now: Date): Map<string, number> {
  const totals = new Map<string, number>();
  for (const visit of visits) {
    const start = new Date(visit.enteredAt).getTime();
    const end = visit.leftAt ? new Date(visit.leftAt).getTime() : now.getTime();
    totals.set(visit.stageId, (totals.get(visit.stageId) ?? 0) + Math.max(0, end - start));
  }
  return totals;
}

/** Tempo apenas da passagem mais recente por etapa — o número exibido na trilha. */
export function millisecondsOfLatestVisitByStage(visits: readonly StageVisit[], now: Date): Map<string, number> {
  const latest = new Map<string, number>();
  for (const visit of visits) {
    const start = new Date(visit.enteredAt).getTime();
    const end = visit.leftAt ? new Date(visit.leftAt).getTime() : now.getTime();
    latest.set(visit.stageId, Math.max(0, end - start));
  }
  return latest;
}

/** "42 s", "18 min", "5 h", "3 dias" — curto o bastante para a trilha. */
export function formatStageDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 dia" : `${days} dias`;
}

/** Forma completa usada no detalhe/tooltip, sem sacrificar espaço na trilha. */
export function formatDetailedStageDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
  if (seconds < 60) return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `${hours} ${hours === 1 ? "hora" : "horas"}${remainingMinutes ? ` e ${remainingMinutes} min` : ""}`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days} ${days === 1 ? "dia" : "dias"}${remainingHours ? ` e ${remainingHours} h` : ""}`;
}
