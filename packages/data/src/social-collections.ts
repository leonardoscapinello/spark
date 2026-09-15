import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { SocialChannelSchema, SocialPostSchema } from "@spark/core";
import { sparkShapeOptions } from "./shape-options.js";

export function createSocialChannelsCollection() {
  return createCollection(
    electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "social_channels",
      schema: SocialChannelSchema,
      getKey: (item) => item.id,
      shapeOptions: sparkShapeOptions("social_channels"),
    }),
  );
}
export function createSocialPostsCollection() {
  return createCollection(
    electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "social_posts",
      schema: SocialPostSchema,
      getKey: (item) => item.id,
      shapeOptions: sparkShapeOptions("social_posts"),
    }),
  );
}
export type SocialChannelsCollection = ReturnType<typeof createSocialChannelsCollection>;
export type SocialPostsCollection = ReturnType<typeof createSocialPostsCollection>;
