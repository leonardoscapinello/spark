import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { CannedReplySchema } from "@spark/core";
import { getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";

export function createCannedRepliesCollection() {
  return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "canned_replies",
    schema: CannedReplySchema,
    getKey: (reply) => reply.id,
    shapeOptions: {
      url: `${getSparkApiBaseUrl()}/v1/shapes/canned_replies`,
      columnMapper: snakeCamelMapper(),
      headers: { authorization: () => { const token = getSparkAuthToken(); return token ? `Bearer ${token}` : ""; } },
    },
  }));
}

export type CannedRepliesCollection = ReturnType<typeof createCannedRepliesCollection>;
