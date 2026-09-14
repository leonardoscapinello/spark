import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { CompanyTagSchema, ContactTagSchema, ProductTagSchema, TagSchema } from "@spark/core";
import { sparkShapeOptions } from "./shape-options.js";

/**
 * Marcações e seus vínculos, agora como tabelas (ADR-0035).
 *
 * Só leitura: gravar continua sendo pela API do registro marcado, que troca a
 * lista inteira dentro da transação em que a pessoa, a empresa ou o produto
 * foi salvo. A tela junta catálogo e vínculo localmente (CLAUDE.md regra 5).
 */
export function createTagsCollection() {
  return createCollection(
    electricCollectionOptions({
      gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "tags",
      schema: TagSchema,
      getKey: (tag) => tag.id,
      shapeOptions: sparkShapeOptions("tags"),
    }),
  );
}

export function createContactTagsCollection() {
  return createCollection(
    electricCollectionOptions({
      gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "contact_tags",
      schema: ContactTagSchema,
      // A tabela tem chave composta; a coleção precisa de uma chave só.
      getKey: (link) => `${link.contactId}:${link.tagId}`,
      shapeOptions: sparkShapeOptions("contact_tags"),
    }),
  );
}

export function createCompanyTagsCollection() {
  return createCollection(
    electricCollectionOptions({
      gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "company_tags",
      schema: CompanyTagSchema,
      getKey: (link) => `${link.companyId}:${link.tagId}`,
      shapeOptions: sparkShapeOptions("company_tags"),
    }),
  );
}

export function createProductTagsCollection() {
  return createCollection(
    electricCollectionOptions({
      gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "product_tags",
      schema: ProductTagSchema,
      getKey: (link) => `${link.productId}:${link.tagId}`,
      shapeOptions: sparkShapeOptions("product_tags"),
    }),
  );
}

export type TagsCollection = ReturnType<typeof createTagsCollection>;
export type ContactTagsCollection = ReturnType<typeof createContactTagsCollection>;
export type CompanyTagsCollection = ReturnType<typeof createCompanyTagsCollection>;
export type ProductTagsCollection = ReturnType<typeof createProductTagsCollection>;
