import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { z } from "zod";
import { StoredFileSchema } from "@spark/core";
import { getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";
const SyncedFileSchema = StoredFileSchema.extend({ sizeBytes: z.union([z.number(), z.bigint()]).transform(Number) });
export function createFilesCollection() { return createCollection(electricCollectionOptions({ id: "files", schema: SyncedFileSchema, getKey: (file) => file.id, shapeOptions: { url: `${getSparkApiBaseUrl()}/v1/shapes/files`, columnMapper: snakeCamelMapper(), headers: { authorization: () => { const token = getSparkAuthToken(); return token ? `Bearer ${token}` : ""; } } } })); }
export type FilesCollection = ReturnType<typeof createFilesCollection>;
