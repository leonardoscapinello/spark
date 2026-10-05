import { Catch, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { DomainError, type DomainErrorCode } from "@spark/core";

const STATUS: Record<DomainErrorCode, number> = {
  VALIDATION_FAILED: 422,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  PERMISSION_DENIED: 403,
  INVALID_STATE: 409,
};

/**
 * Erro de regra do core vira resposta HTTP com a mensagem da própria regra
 * (ADR-0026) — sem isso, "este cupom expirou" chegava à tela como 500.
 * Mesmo formato do Nest ({ statusCode, message, error }) mais o código.
 */
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost) {
    const statusCode = STATUS[error.code];
    void host.switchToHttp().getResponse<FastifyReply>().status(statusCode).send({ statusCode, error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) });
  }
}
