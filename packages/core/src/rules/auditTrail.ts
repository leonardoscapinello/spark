export interface AuditChange {
  field: string;
  before: unknown;
  after: unknown;
}

/**
 * Produz o delta imutável gravado no evento. O histórico guarda fatos, não
 * uma referência ao registro atual; por isso os dois valores são serializados
 * no instante da transação.
 */
export function auditChanges(
  before: Readonly<Record<string, unknown>>,
  after: Readonly<Record<string, unknown>>,
  fields: readonly string[],
): AuditChange[] {
  return [...new Set(fields)].flatMap((field) => {
    const previous = auditValue(before[field]);
    const next = auditValue(after[field]);
    return JSON.stringify(previous) === JSON.stringify(next)
      ? []
      : [{ field, before: previous, after: next }];
  });
}

function auditValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(auditValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, auditValue(nested)]));
  }
  return value;
}
