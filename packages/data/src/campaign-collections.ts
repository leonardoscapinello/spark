import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { AudienceSchema, CampaignRecipientSchema, CampaignSchema } from "@spark/core";
import { getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";
function shape(id: string) { return { url: `${getSparkApiBaseUrl()}/v1/shapes/${id}`, columnMapper: snakeCamelMapper(), headers: { authorization: () => { const token = getSparkAuthToken(); return token ? `Bearer ${token}` : ""; } } }; }
export function createAudiencesCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "audiences", schema: AudienceSchema, getKey: (item) => item.id, shapeOptions: shape("audiences") })); }
export function createCampaignsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "campaigns", schema: CampaignSchema, getKey: (item) => item.id, shapeOptions: shape("campaigns") })); }
export function createCampaignRecipientsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "campaign_recipients", schema: CampaignRecipientSchema, getKey: (item) => item.id, shapeOptions: shape("campaign_recipients") })); }
export type AudiencesCollection = ReturnType<typeof createAudiencesCollection>; export type CampaignsCollection = ReturnType<typeof createCampaignsCollection>; export type CampaignRecipientsCollection = ReturnType<typeof createCampaignRecipientsCollection>;
