import { createDiscountRulesCollection, createProductsCollection, createProductVariantsCollection, type DiscountRulesCollection, type ProductsCollection, type ProductVariantsCollection } from "@spark/data";
let products: ProductsCollection | undefined; let variants: ProductVariantsCollection | undefined; let discounts: DiscountRulesCollection | undefined;
export function getProductsCollection(): ProductsCollection { products ??= createProductsCollection(); return products; }
export function getProductVariantsCollection(): ProductVariantsCollection { variants ??= createProductVariantsCollection(); return variants; }
export function getDiscountRulesCollection(): DiscountRulesCollection { discounts ??= createDiscountRulesCollection(); return discounts; }
