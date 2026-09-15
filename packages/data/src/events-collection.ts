import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { EventSchema } from "@spark/core";
import { sparkShapeOptions } from "./shape-options.js";

export function createEventsCollection() {
  return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "events",
    schema: EventSchema,
    getKey: (event) => event.id,
    shapeOptions: sparkShapeOptions("events"),
  }));
}
export type EventsCollection = ReturnType<typeof createEventsCollection>;
