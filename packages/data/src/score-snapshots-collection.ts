import { registerSessionCollection } from "./session-collections.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { ScoreSnapshotSchema } from "@spark/core";
import { sparkShapeOptions } from "./shape-options.js";
import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
export function createScoreSnapshotsCollection(contactId: string) {
 const options = sparkShapeOptions("score_snapshots");
 const url = new URL(options.url); url.searchParams.set("contactId",contactId);
 return registerSessionCollection(createCollection(electricCollectionOptions({ id: `score:${contactId}`, gcTime: INACTIVE_COLLECTION_GC_MS, schema: ScoreSnapshotSchema, getKey: row => row.id, shapeOptions: { ...options, url: url.toString() } })));
}
