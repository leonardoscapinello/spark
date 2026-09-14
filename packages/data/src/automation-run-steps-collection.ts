import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { sparkShapeOptions } from "./shape-options.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { AutomationRunStepSchema } from "@spark/core";
export function createAutomationRunStepsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "automation_run_steps", schema: AutomationRunStepSchema, getKey: (step) => step.id, shapeOptions: sparkShapeOptions("automation_run_steps") })); }
export type AutomationRunStepsCollection = ReturnType<typeof createAutomationRunStepsCollection>;
