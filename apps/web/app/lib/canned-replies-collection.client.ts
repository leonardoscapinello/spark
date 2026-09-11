import { createCannedRepliesCollection, type CannedRepliesCollection } from "@spark/data";

let collection: CannedRepliesCollection | undefined;
export function getCannedRepliesCollection(): CannedRepliesCollection {
  collection ??= createCannedRepliesCollection();
  return collection;
}
