import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { OrganizationThemeSchema } from "@spark/core";
import { sparkShapeOptions } from "./shape-options.js";

/** Tema compartilhado da organização, sincronizado localmente para evitar bloqueio de rede na interface. */
export function createOrganizationThemesCollection() {
  return createCollection(electricCollectionOptions({
    gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "organization-themes",
    schema: OrganizationThemeSchema,
    getKey: (theme) => theme.orgId,
    shapeOptions: sparkShapeOptions("organization_themes"),
  }));
}

export type OrganizationThemesCollection = ReturnType<typeof createOrganizationThemesCollection>;

