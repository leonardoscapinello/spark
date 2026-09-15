import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { TeamDirectorySchema } from "@spark/core";
import { sparkShapeOptions } from "./shape-options.js";
export function createTeamsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "teams", schema: TeamDirectorySchema, getKey: (team) => team.id, shapeOptions: sparkShapeOptions("teams") })); }
export type TeamsCollection = ReturnType<typeof createTeamsCollection>;
