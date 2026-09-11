import { createIdentitiesCollection, type IdentitiesCollection } from "@spark/data";

let identities: IdentitiesCollection | undefined;
export function getIdentitiesCollection(): IdentitiesCollection {
  identities ??= createIdentitiesCollection();
  return identities;
}
