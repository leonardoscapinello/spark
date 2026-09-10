/**
 * Catálogo de erro tipado. Toda regra de core lança um DomainError — nunca
 * `throw new Error("...")` solto. É o que a API traduz para Problem Details
 * (RFC 9457) sem inventar mensagem no meio do caminho (docs/adr/0026).
 */
export type DomainErrorCode =
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "PERMISSION_DENIED"
  | "INVALID_STATE";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details?: Record<string, unknown> | undefined;

  constructor(code: DomainErrorCode, message: string, details?: Record<string, unknown> | undefined) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
