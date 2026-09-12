import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { AutomationVersionSchema } from "@spark/core";
import { getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";

export function createAutomationVersionsCollection() {
  return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "automation_versions",
    schema: AutomationVersionSchema,
    getKey: (version) => version.id,
    shapeOptions: { url: `${getSparkApiBaseUrl()}/v1/shapes/automation_versions`, columnMapper: snakeCamelMapper(), headers: { authorization: () => bearer() } },
  }));
}
function bearer(): string { const token = getSparkAuthToken(); return token ? `Bearer ${token}` : ""; }
export type AutomationVersionsCollection = ReturnType<typeof createAutomationVersionsCollection>;
