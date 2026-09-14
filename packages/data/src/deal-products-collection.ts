import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { DealProductSchema, dealProductId, toCents, type CreateDealProductInput, type DealProduct, type OrgId } from "@spark/core";
import { dealProductsControllerAdd, dealProductsControllerChange, dealProductsControllerRemove } from "@spark/api-client";
import { sparkShapeOptions } from "./shape-options.js";
import { confirmed } from "./confirmed.js";

export function optimisticDealProduct(input: Omit<CreateDealProductInput, "id">, orgId: OrgId): DealProduct {
  const now = new Date().toISOString();
  return {
    id: dealProductId.create(),
    orgId,
    dealId: input.dealId,
    productId: input.productId ?? null,
    variantId: input.variantId ?? null,
    name: input.name,
    quantityMilli: input.quantityMilli,
    unitAmount: input.unitAmount,
    discountBasisPoints: input.discountBasisPoints ?? 0,
    taxBasisPoints: input.taxBasisPoints ?? 0,
    sortOrder: input.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Itens do negócio. Cada escrita devolve o valor recalculado do negócio; a
 * linha de `deals` chega depois pelo Electric, então a tela não precisa
 * atualizar o total à mão (docs/adr/0018).
 */
export function createDealProductsCollection() {
  return createCollection(
    electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "deal_products",
      schema: DealProductSchema,
      getKey: (item) => item.id,
      shapeOptions: sparkShapeOptions("deal_products"),
      onInsert: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onInsert called with no pending mutation.");
        const item = mutation.modified;
        const response = await dealProductsControllerAdd({
          id: item.id, dealId: item.dealId, productId: item.productId, variantId: item.variantId,
          name: item.name, quantityMilli: item.quantityMilli, unitAmount: toCents(item.unitAmount),
          discountBasisPoints: item.discountBasisPoints, taxBasisPoints: item.taxBasisPoints, sortOrder: item.sortOrder,
        });
        return confirmed(response);
      },
      onUpdate: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onUpdate called with no pending mutation.");
        const item = mutation.modified;
        const response = await dealProductsControllerChange(mutation.original.id, {
          name: item.name, quantityMilli: item.quantityMilli, unitAmount: toCents(item.unitAmount),
          discountBasisPoints: item.discountBasisPoints, taxBasisPoints: item.taxBasisPoints, sortOrder: item.sortOrder,
        });
        return confirmed(response);
      },
      onDelete: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onDelete called with no pending mutation.");
        const response = await dealProductsControllerRemove(mutation.original.id);
        return confirmed(response);
      },
    }),
  );
}

export type DealProductsCollection = ReturnType<typeof createDealProductsCollection>;

/** Mesmo motivo de `forInsert` em deals-collection: a coleção guarda centavos. */
export function itemForInsert(item: DealProduct) {
  return { ...item, unitAmount: toCents(item.unitAmount) };
}
