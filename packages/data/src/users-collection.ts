import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { UserSchema } from "@spark/core";
import { getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";

/** Read-only local directory used by ownership selectors throughout the product. */
export function createUsersCollection() {
  return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "users",
    schema: UserSchema,
    getKey: (user) => user.id,
    shapeOptions: {
      url: `${getSparkApiBaseUrl()}/v1/shapes/users`,
      columnMapper: snakeCamelMapper(),
      headers: {
        authorization: () => {
          const token = getSparkAuthToken();
          return token ? `Bearer ${token}` : "";
        },
      },
    },
  }));
}

export type UsersCollection = ReturnType<typeof createUsersCollection>;
