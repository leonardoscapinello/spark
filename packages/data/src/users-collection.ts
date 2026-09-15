import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { UserSchema } from "@spark/core";
import { sparkShapeOptions } from "./shape-options.js";

/** Read-only local directory used by ownership selectors throughout the product. */
export function createUsersCollection() {
  return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "users",
    schema: UserSchema,
    getKey: (user) => user.id,
    shapeOptions: sparkShapeOptions("users"),
  }));
}

export type UsersCollection = ReturnType<typeof createUsersCollection>;
