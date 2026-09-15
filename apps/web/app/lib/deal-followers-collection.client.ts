import { createDealFollowersCollection, type DealFollowersCollection } from "@spark/data";
import type { DealId } from "@spark/core";

const collections = new Map<DealId, DealFollowersCollection>();

/** Uma coleção pequena e isolada por negócio aberto. */
export function getDealFollowersCollection(dealId: DealId): DealFollowersCollection {
  let collection = collections.get(dealId);
  if (!collection) {
    collection = createDealFollowersCollection({ dealId });
    collections.set(dealId, collection);
  }
  return collection;
}
