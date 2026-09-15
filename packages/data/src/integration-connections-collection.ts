import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { IntegrationConnectionSchema } from "@spark/core";
import { sparkShapeOptions } from "./shape-options.js";
export function createIntegrationConnectionsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "integration_connections", schema: IntegrationConnectionSchema, getKey: (connection) => connection.id, shapeOptions: sparkShapeOptions("integration_connections") })); }
export type IntegrationConnectionsCollection = ReturnType<typeof createIntegrationConnectionsCollection>;
