import { z } from "zod";
import { zFileId, zIntegrationConnectionId, zOrgId, zServerTimestamp, zUserId } from "./zodHelpers.js";

export const FileStatusSchema = z.enum(["pending", "ready", "failed"]);
export const StoredFileSchema = z.object({
  /** Nulo quando o arquivo veio de ingestão automática (mídia recebida por um canal), não de upload humano. */
  id: zFileId, orgId: zOrgId, storageConnectionId: zIntegrationConnectionId, createdBy: zUserId.nullable(),
  name: z.string().trim().min(1).max(240), objectKey: z.string().min(1).max(700),
  mimeType: z.string().trim().min(1).max(160), sizeBytes: z.number().int().nonnegative().max(5_000_000_000),
  folder: z.string().trim().max(240).nullable(), status: FileStatusSchema,
  createdAt: zServerTimestamp, updatedAt: zServerTimestamp, deletedAt: zServerTimestamp.nullable(),
});
export type StoredFile = z.infer<typeof StoredFileSchema>;

export const CreateFileUploadInputSchema = z.object({
  id: zFileId, name: z.string().trim().min(1).max(240), mimeType: z.string().trim().min(1).max(160),
  sizeBytes: z.number().int().positive().max(5_000_000_000), folder: z.string().trim().max(240).nullable().optional(),
});
export type CreateFileUploadInput = z.infer<typeof CreateFileUploadInputSchema>;
export const FileUploadResponseSchema = z.object({ file: StoredFileSchema, uploadUrl: z.url(), expiresAt: zServerTimestamp, txid: z.number().int() });
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;
export const FileWriteResponseSchema = z.object({ file: StoredFileSchema, txid: z.number().int() });
export type FileWriteResponse = z.infer<typeof FileWriteResponseSchema>;
export const FileDownloadResponseSchema = z.object({ downloadUrl: z.url(), expiresAt: zServerTimestamp, mimeType: z.string(), name: z.string() });
export type FileDownloadResponse = z.infer<typeof FileDownloadResponseSchema>;
