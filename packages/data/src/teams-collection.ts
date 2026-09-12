import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { TeamDirectorySchema } from "@spark/core";
import { getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";
export function createTeamsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "teams", schema: TeamDirectorySchema, getKey: (team) => team.id, shapeOptions: { url: `${getSparkApiBaseUrl()}/v1/shapes/teams`, columnMapper: snakeCamelMapper(), headers: { authorization: () => { const token = getSparkAuthToken(); return token ? `Bearer ${token}` : ""; } } } })); }
export type TeamsCollection = ReturnType<typeof createTeamsCollection>;
