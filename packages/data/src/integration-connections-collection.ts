import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { IntegrationConnectionSchema } from "@spark/core";
import { getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";
export function createIntegrationConnectionsCollection() { return createCollection(electricCollectionOptions({ id: "integration_connections", schema: IntegrationConnectionSchema, getKey: (connection) => connection.id, shapeOptions: { url: `${getSparkApiBaseUrl()}/v1/shapes/integration_connections`, columnMapper: snakeCamelMapper(), headers: { authorization: () => bearer() } } })); }
function bearer(): string { const token = getSparkAuthToken(); return token ? `Bearer ${token}` : ""; }
export type IntegrationConnectionsCollection = ReturnType<typeof createIntegrationConnectionsCollection>;
