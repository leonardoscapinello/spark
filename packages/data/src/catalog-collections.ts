import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { z } from "zod";
import { DiscountRuleSchema, ProductSchema, ProductVariantSchema, money, type Money } from "@spark/core";
import { getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";
const syncedMoney = z.union([z.number(), z.bigint()]).transform((value) => money(Number(value)));
const SyncedProductSchema = ProductSchema.extend({ price: syncedMoney });
const SyncedVariantSchema = ProductVariantSchema.extend({ priceAdjustment: syncedMoney });
const SyncedDiscountSchema = DiscountRuleSchema.extend({ minimumSubtotal: syncedMoney, value: z.union([z.number(), z.bigint()]).transform(Number) });
function options(id: string) { return { url: `${getSparkApiBaseUrl()}/v1/shapes/${id}`, columnMapper: snakeCamelMapper(), headers: { authorization: () => { const token = getSparkAuthToken(); return token ? `Bearer ${token}` : ""; } } }; }
export function createProductsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "products", schema: SyncedProductSchema, getKey: (item) => item.id, shapeOptions: options("products") })); }
export function createProductVariantsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "product_variants", schema: SyncedVariantSchema, getKey: (item) => item.id, shapeOptions: options("product_variants") })); }
export function createDiscountRulesCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "discount_rules", schema: SyncedDiscountSchema, getKey: (item) => item.id, shapeOptions: options("discount_rules") })); }
export function catalogMoney(value: unknown): Money { return typeof value === "object" && value !== null ? value as Money : money(Number(value)); }
export type ProductsCollection = ReturnType<typeof createProductsCollection>; export type ProductVariantsCollection = ReturnType<typeof createProductVariantsCollection>; export type DiscountRulesCollection = ReturnType<typeof createDiscountRulesCollection>;
