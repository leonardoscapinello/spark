import { createIntegrationConnectionsCollection, type IntegrationConnectionsCollection } from "@spark/data";
let connections: IntegrationConnectionsCollection | undefined;
export function getIntegrationConnectionsCollection(): IntegrationConnectionsCollection { connections ??= createIntegrationConnectionsCollection(); return connections; }
