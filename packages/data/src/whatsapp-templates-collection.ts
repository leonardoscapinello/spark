import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { WhatsAppTemplateSchema } from "@spark/core";
import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { sparkShapeOptions } from "./shape-options.js";

/** Catálogo de modelos da Meta, sincronizado como todo o resto — a tela pede pra sincronizar uma vez, daí em diante lê local (CLAUDE.md, 5). */
export function createWhatsAppTemplatesCollection() {
  return createCollection(electricCollectionOptions({
    gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "whatsapp_templates",
    schema: WhatsAppTemplateSchema,
    getKey: (template) => template.id,
    shapeOptions: sparkShapeOptions("whatsapp_templates"),
  }));
}
export type WhatsAppTemplatesCollection = ReturnType<typeof createWhatsAppTemplatesCollection>;
