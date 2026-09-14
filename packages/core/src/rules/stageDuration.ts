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
export interface StageVisit { stageId: string; enteredAt: string; leftAt: string | null }

export interface StageChange { stageId: string; occurredAt: string }

export function stageVisits(
  createdAt: string,
  createdStageId: string,
  changes: readonly StageChange[],
  now: Date,
): StageVisit[] {
  // O histórico chega do mais novo para o mais velho na tela; aqui a ordem é cronológica.
  const ordered = [...changes].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  const visits: StageVisit[] = [{ stageId: createdStageId, enteredAt: createdAt, leftAt: null }];
  for (const change of ordered) {
    const previous = visits[visits.length - 1];
    if (previous) {
      if (previous.stageId === change.stageId) continue; // evento repetido não abre visita nova
      previous.leftAt = change.occurredAt;
    }
    visits.push({ stageId: change.stageId, enteredAt: change.occurredAt, leftAt: null });
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

/** "3 dias", "5 h", "agora" — curto o bastante para caber dentro da seta. */
export function formatStageDuration(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 60) return minutes <= 1 ? "agora" : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 dia" : `${days} dias`;
}
