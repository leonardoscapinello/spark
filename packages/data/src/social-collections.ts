import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { SocialChannelSchema, SocialPostSchema } from "@spark/core";
import { getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";

function shape(id: string) {
  return {
    url: `${getSparkApiBaseUrl()}/v1/shapes/${id}`,
    columnMapper: snakeCamelMapper(),
    headers: {
      authorization: () => {
        const token = getSparkAuthToken();
        return token ? `Bearer ${token}` : "";
      },
    },
  };
}

export function createSocialChannelsCollection() {
  return createCollection(
    electricCollectionOptions({
      id: "social_channels",
      schema: SocialChannelSchema,
      getKey: (item) => item.id,
      shapeOptions: shape("social_channels"),
    }),
  );
}
export function createSocialPostsCollection() {
  return createCollection(
    electricCollectionOptions({
      id: "social_posts",
      schema: SocialPostSchema,
      getKey: (item) => item.id,
      shapeOptions: shape("social_posts"),
    }),
  );
}
export type SocialChannelsCollection = ReturnType<typeof createSocialChannelsCollection>;
export type SocialPostsCollection = ReturnType<typeof createSocialPostsCollection>;
