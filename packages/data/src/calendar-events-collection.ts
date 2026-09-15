import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { CalendarEventSchema } from "@spark/core";
import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { sparkShapeOptions } from "./shape-options.js";

export function createCalendarEventsCollection() {
  return createCollection(electricCollectionOptions({
    gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "calendar_events",
    schema: CalendarEventSchema,
    getKey: (event) => event.id,
    shapeOptions: sparkShapeOptions("calendar_events"),
  }));
}

export type CalendarEventsCollection = ReturnType<typeof createCalendarEventsCollection>;
