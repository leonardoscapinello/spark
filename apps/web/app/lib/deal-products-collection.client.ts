import { createDealProductsCollection, type DealProductsCollection } from "@spark/data";
let items: DealProductsCollection | undefined;
export function getDealProductsCollection(): DealProductsCollection { items ??= createDealProductsCollection(); return items; }
