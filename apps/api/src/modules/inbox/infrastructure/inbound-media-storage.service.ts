import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { FileId, OrgId } from "@spark/core";
import { StorageResolver } from "../../files/infrastructure/storage-resolver.service.js";

/**
 * Sobe mídia recebida (áudio, imagem, documento) pro mesmo armazenamento S3
 * de qualquer outro `files` (ADR-0028) — só que o upload parte do próprio
 * servidor, não do navegador, porque quem manda os bytes é o canal (Meta,
 * Postmark...), não uma pessoa com um `<input type=file>`.
 */
@Injectable()
export class InboundMediaStorage {
  constructor(private readonly resolver: StorageResolver) {}

  async store(orgId: OrgId, fileId: FileId, name: string, mimeType: string, bytes: Buffer): Promise<{ storageConnectionId: string; objectKey: string }> {
    const { connectionId, storage } = await this.resolver.forNewUpload(orgId);
    const objectKey = `${fileId}/${safeName(name)}`;
    const target = await storage.createUpload(orgId, objectKey, mimeType);
    const response = await fetch(target.uploadUrl, { method: "PUT", headers: { "Content-Type": mimeType }, body: bytes });
    if (!response.ok) throw new ServiceUnavailableException("Não foi possível guardar a mídia recebida.");
    // `files.objectKey` guarda a chave SEM o prefixo de org — download()/remove() reaplicam
    // safeObjectKey(orgId, ...) por conta própria, mesma convenção de FilesRepository.createUpload.
    return { storageConnectionId: connectionId, objectKey };
  }
}

function safeName(value: string): string {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-180) || "arquivo";
}
