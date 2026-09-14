import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { sparkShapeOptions } from "./shape-options.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { AutomationVersionSchema } from "@spark/core";

export function createAutomationVersionsCollection() {
  return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "automation_versions",
    schema: AutomationVersionSchema,
    getKey: (version) => version.id,
    shapeOptions: sparkShapeOptions("automation_versions"),
  }));
}
export type AutomationVersionsCollection = ReturnType<typeof createAutomationVersionsCollection>;
