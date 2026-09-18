import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { createAppDbClient, files, withOrgContext, type SparkDb } from "@spark/db";
import type { CreateFileUploadInput, FileDownloadResponse, FileId, FileUploadResponse, FileWriteResponse, OrgId, StoredFile, UserId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";
import { StorageResolver } from "./storage-resolver.service.js";

@Injectable()
export class FilesRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly resolver: StorageResolver, private readonly events: DomainEventWriter) {}
  async createUpload(orgId: OrgId, userId: UserId, input: CreateFileUploadInput): Promise<FileUploadResponse> {
    const resolved = await this.resolver.forNewUpload(orgId); const objectKey = `${input.id}/${safeName(input.name)}`;
    const target = await resolved.storage.createUpload(orgId, objectKey, input.mimeType);
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.insert(files).values({ id: input.id, orgId, storageConnectionId: resolved.connectionId, createdBy: userId, name: input.name, objectKey, mimeType: input.mimeType, sizeBytes: input.sizeBytes, folder: input.folder ?? null }).returning();
      if (!row) throw new Error("File insert returned no row."); const txid = await captureTxid(tx);
      await this.events.append(tx, { orgId, type: "file.upload_requested", data: { fileId: row.id, name: row.name, sizeBytes: row.sizeBytes } });
      return { file: toFile(row), uploadUrl: target.uploadUrl, expiresAt: target.expiresAt, txid };
    });
  }
  complete(orgId: OrgId, userId: UserId, id: FileId): Promise<FileWriteResponse> {
    return withOrgContext(this.db, orgId, async (tx) => { const [row] = await tx.update(files).set({ status: "ready", updatedAt: new Date() }).where(and(eq(files.id, id), eq(files.orgId, orgId), eq(files.status, "pending"))).returning(); if (!row) throw new NotFoundException("Arquivo pendente não encontrado."); const txid = await captureTxid(tx); await this.events.append(tx, { orgId, type: "file.upload_completed", data: { fileId: id, actorUserId: userId } }); return { file: toFile(row), txid }; });
  }
  async download(orgId: OrgId, id: FileId): Promise<FileDownloadResponse> {
    const row = await this.findReady(orgId, id); const storage = await this.resolver.byConnection(orgId, row.storageConnectionId as FileUploadResponse["file"]["storageConnectionId"]); return storage.createDownload(orgId, row.objectKey);
  }
  async remove(orgId: OrgId, userId: UserId, id: FileId): Promise<FileWriteResponse> {
    const existing = await this.findReady(orgId, id); const storage = await this.resolver.byConnection(orgId, existing.storageConnectionId as FileUploadResponse["file"]["storageConnectionId"]); await storage.remove(orgId, existing.objectKey);
    return withOrgContext(this.db, orgId, async (tx) => { const [row] = await tx.update(files).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(files.id, id), eq(files.orgId, orgId))).returning(); if (!row) throw new NotFoundException("Arquivo não encontrado."); const txid = await captureTxid(tx); await this.events.append(tx, { orgId, type: "file.deleted", data: { fileId: id, actorUserId: userId } }); return { file: toFile(row), txid }; });
  }
  private async findReady(orgId: OrgId, id: FileId) { return withOrgContext(this.db, orgId, async (tx) => { const [row] = await tx.select().from(files).where(and(eq(files.id, id), eq(files.orgId, orgId), eq(files.status, "ready"), sql`${files.deletedAt} is null`)).limit(1); if (!row) throw new NotFoundException("Arquivo não encontrado."); return row; }); }
}
async function captureTxid(tx: SparkDb): Promise<number> { const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`); if (!rows[0]) throw new Error("Could not obtain transaction id."); return Number(rows[0].txid); }
function safeName(value: string): string { return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-180) || "arquivo"; }
function toFile(row: typeof files.$inferSelect): StoredFile { return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), deletedAt: row.deletedAt?.toISOString() ?? null } as StoredFile; }
