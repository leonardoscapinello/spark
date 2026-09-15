import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { z } from "zod";
import { StoredFileSchema } from "@spark/core";
import { sparkShapeOptions } from "./shape-options.js";
const SyncedFileSchema = StoredFileSchema.extend({ sizeBytes: z.union([z.number(), z.bigint()]).transform(Number) });
export function createFilesCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "files", schema: SyncedFileSchema, getKey: (file) => file.id, shapeOptions: sparkShapeOptions("files") })); }
export type FilesCollection = ReturnType<typeof createFilesCollection>;
