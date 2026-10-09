import { DomainError } from "../errors/index.js";
import type { StoredFile } from "../schema/file.js";

/** Só publica o arquivo quando o objeto recebido corresponde ao upload solicitado. */
export function assertUploadedFile(expected: Pick<StoredFile, "sizeBytes" | "mimeType">, actual: { sizeBytes: number; contentType: string | null }): void {
  if (actual.sizeBytes !== expected.sizeBytes || actual.contentType?.toLowerCase() !== expected.mimeType.toLowerCase()) {
    throw new DomainError("VALIDATION_FAILED", "O arquivo recebido não corresponde ao tamanho ou tipo informado. Envie o arquivo novamente.");
  }
}
