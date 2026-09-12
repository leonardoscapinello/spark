import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { EventSchema } from "@spark/core";
import { getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";

export function createEventsCollection() {
  return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "events",
    schema: EventSchema,
    getKey: (event) => event.id,
    shapeOptions: {
      url: `${getSparkApiBaseUrl()}/v1/shapes/events`,
      columnMapper: snakeCamelMapper(),
      headers: { authorization: () => { const token = getSparkAuthToken(); return token ? `Bearer ${token}` : ""; } },
    },
  }));
}
export type EventsCollection = ReturnType<typeof createEventsCollection>;
