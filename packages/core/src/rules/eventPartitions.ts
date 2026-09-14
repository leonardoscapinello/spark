/**
 * `events` é particionada por mês (ADR-0021) e o Postgres recusa uma linha
 * cujo mês não tem partição. A migration 0000 criou só quatro meses; sem
 * alguém criar os seguintes, no primeiro dia do mês descoberto TODO write
 * de negócio que registra evento — criar pessoa, mover negócio, concluir
 * atividade — falha, porque o evento entra na mesma transação
 * (DomainEventWriter.append recebe o tx de quem chama).
 *
 * Esta é a parte que decide; quem cria a tabela é packages/db. Pura: o
 * relógio entra por parâmetro (CLAUDE.md, nova-regra-de-dominio lei 1), e
 * é isso que permite testar a virada de ano sem esperar dezembro.
 *
 * Meses em UTC: `occurred_at` é timestamptz e os limites das partições
 * existentes (migration 0000) são datas civis — mesma convenção.
 */
export interface EventPartition {
  /** ex.: events_y2027m01 — mesmo padrão da migration 0000 */
  name: string;
  /** primeiro dia do mês, YYYY-MM-DD */
  from: string;
  /** primeiro dia do mês seguinte (limite exclusivo), YYYY-MM-DD */
  to: string;
}

function monthStart(year: number, monthIndex: number): { year: number; month: number } {
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function isoDay(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/** As partições que precisam existir em `now`: o mês corrente e os `monthsAhead` seguintes. */
export function eventPartitionsFor(now: Date, monthsAhead = 3): EventPartition[] {
  if (!Number.isInteger(monthsAhead) || monthsAhead < 0) throw new RangeError("monthsAhead precisa ser inteiro ≥ 0.");
  const year = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth();
  const partitions: EventPartition[] = [];
  for (let offset = 0; offset <= monthsAhead; offset += 1) {
    const current = monthStart(year, monthIndex + offset);
    const next = monthStart(year, monthIndex + offset + 1);
    partitions.push({
      name: `events_y${current.year}m${String(current.month).padStart(2, "0")}`,
      from: isoDay(current.year, current.month),
      to: isoDay(next.year, next.month),
    });
  }
  return partitions;
}
