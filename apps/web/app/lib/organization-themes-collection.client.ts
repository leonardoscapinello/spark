import { createOrganizationThemesCollection, type OrganizationThemesCollection } from "@spark/data";

let collection: OrganizationThemesCollection | undefined;

export function getOrganizationThemesCollection(): OrganizationThemesCollection {
  collection ??= createOrganizationThemesCollection();
  return collection;
}

