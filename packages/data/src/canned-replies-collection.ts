import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { CannedReplySchema } from "@spark/core";
import { sparkShapeOptions } from "./shape-options.js";

export function createCannedRepliesCollection() {
  return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "canned_replies",
    schema: CannedReplySchema,
    getKey: (reply) => reply.id,
    shapeOptions: sparkShapeOptions("canned_replies"),
  }));
}

export type CannedRepliesCollection = ReturnType<typeof createCannedRepliesCollection>;
