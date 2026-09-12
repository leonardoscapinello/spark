import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { AutomationRunSchema } from "@spark/core";
import { getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";
export function createAutomationRunsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "automation_runs", schema: AutomationRunSchema, getKey: (run) => run.id, shapeOptions: { url: `${getSparkApiBaseUrl()}/v1/shapes/automation_runs`, columnMapper: snakeCamelMapper(), headers: { authorization: () => bearer() } } })); }
function bearer(): string { const token = getSparkAuthToken(); return token ? `Bearer ${token}` : ""; }
export type AutomationRunsCollection = ReturnType<typeof createAutomationRunsCollection>;
