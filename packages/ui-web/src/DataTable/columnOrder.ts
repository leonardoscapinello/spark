/** Reordenação trabalha sobre a lista completa de colunas, não sobre a lista
 * visível: assim uma coluna escondida entre duas visíveis não engole o
 * movimento, e a ordem devolvida continua descrevendo todas as colunas. */
export function moveColumn(all: readonly string[], fromId: string, toId: string): string[] {
  const from = all.indexOf(fromId), to = all.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return [...all];
  const next = [...all];
  next.splice(from, 1);
  next.splice(to, 0, fromId);
  return next;
}

/** Aplica a ordem escolhida. Coluna que o consumidor acrescentou depois e que
 * a ordem ainda não conhece entra no fim, em vez de sumir. */
export function applyColumnOrder<T extends { id: string }>(columns: readonly T[], order: readonly string[] | undefined): readonly T[] {
  if (!order) return columns;
  const known = new Set(order);
  const byId = new Map(columns.map(column => [column.id, column]));
  return [...order.flatMap(id => { const column = byId.get(id); return column ? [column] : []; }), ...columns.filter(column => !known.has(column.id))];
}
