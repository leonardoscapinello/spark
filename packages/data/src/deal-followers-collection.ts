import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { DealFollowerSchema, type DealFollower, type DealId, type OrgId, type UserId } from "@spark/core";
import { dealFollowersControllerAdd, dealFollowersControllerRemove } from "@spark/api-client";
import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { confirmed } from "./confirmed.js";
import { sparkShapeOptions } from "./shape-options.js";

export interface DealFollowersCollectionScope {
  dealId: DealId;
  collectionId?: string;
}

export function optimisticDealFollower(dealId: DealId, userId: UserId, orgId: OrgId, createdBy: UserId): DealFollower {
  return { orgId, dealId, userId, createdBy, createdAt: new Date().toISOString() };
}

export function createDealFollowersCollection(scope: DealFollowersCollectionScope) {
  const sharedShapeOptions = sparkShapeOptions("deal_followers");
  const shapeUrl = new URL(sharedShapeOptions.url);
  shapeUrl.searchParams.set("dealId", scope.dealId);
  return createCollection(electricCollectionOptions({
    gcTime: INACTIVE_COLLECTION_GC_MS,
    id: scope.collectionId ?? `deal-followers-${scope.dealId}`,
    schema: DealFollowerSchema,
    getKey: (follower) => `${follower.dealId}:${follower.userId}`,
    shapeOptions: { ...sharedShapeOptions, url: shapeUrl.toString() },
    onInsert: async ({ transaction }) => {
      const mutation = transaction.mutations[0];
      if (!mutation) throw new Error("onInsert called with no pending mutation.");
      const follower = mutation.modified;
      return confirmed(await dealFollowersControllerAdd(follower.dealId, { userId: follower.userId }));
    },
    onDelete: async ({ transaction }) => {
      const mutation = transaction.mutations[0];
      if (!mutation) throw new Error("onDelete called with no pending mutation.");
      return confirmed(await dealFollowersControllerRemove(mutation.original.dealId, mutation.original.userId));
    },
  }));
}

export type DealFollowersCollection = ReturnType<typeof createDealFollowersCollection>;
