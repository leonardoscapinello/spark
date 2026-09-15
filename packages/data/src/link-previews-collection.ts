import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { LinkPreviewSchema } from "@spark/core";
import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { sparkShapeOptions } from "./shape-options.js";

export function createLinkPreviewsCollection() {
  return createCollection(electricCollectionOptions({
    gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "link_previews",
    schema: LinkPreviewSchema,
    getKey: (preview) => preview.id,
    shapeOptions: sparkShapeOptions("link_previews"),
  }));
}
export type LinkPreviewsCollection = ReturnType<typeof createLinkPreviewsCollection>;
