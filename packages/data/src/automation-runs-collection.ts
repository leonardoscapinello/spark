import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { sparkShapeOptions } from "./shape-options.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { AutomationRunSchema } from "@spark/core";
export function createAutomationRunsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "automation_runs", schema: AutomationRunSchema, getKey: (run) => run.id, shapeOptions: sparkShapeOptions("automation_runs") })); }
export type AutomationRunsCollection = ReturnType<typeof createAutomationRunsCollection>;
