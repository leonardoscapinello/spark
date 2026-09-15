import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { EventSchema, type CompanyId, type ContactId, type DealId } from "@spark/core";
import { sparkShapeOptions } from "./shape-options.js";

export interface EventsCollectionScope {
  dealId?: DealId;
  contactId?: ContactId;
  companyId?: CompanyId;
  collectionId?: string;
}

export function createEventsCollection(scope: EventsCollectionScope = {}) {
  const sharedShapeOptions = sparkShapeOptions("events");
  const shapeUrl = new URL(sharedShapeOptions.url);
  if (scope.dealId) shapeUrl.searchParams.set("dealId", scope.dealId);
  if (scope.contactId) shapeUrl.searchParams.set("contactId", scope.contactId);
  if (scope.companyId) shapeUrl.searchParams.set("companyId", scope.companyId);
  return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
    id: scope.collectionId ?? "events",
    schema: EventSchema,
    getKey: (event) => event.id,
    shapeOptions: { ...sharedShapeOptions, url: shapeUrl.toString() },
  }));
}
export type EventsCollection = ReturnType<typeof createEventsCollection>;
