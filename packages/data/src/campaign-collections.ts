import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { AudienceLeadStatusSchema, AudienceRowSchema, AudienceTagSchema, CampaignRecipientSchema, CampaignSchema } from "@spark/core";
import { getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";
function shape(id: string) { return { url: `${getSparkApiBaseUrl()}/v1/shapes/${id}`, columnMapper: snakeCamelMapper(), headers: { authorization: () => { const token = getSparkAuthToken(); return token ? `Bearer ${token}` : ""; } } }; }
export function createAudiencesCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "audiences", schema: AudienceRowSchema, getKey: (item) => item.id, shapeOptions: shape("audiences") })); }
export function createAudienceLeadStatusesCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "audience_lead_statuses", schema: AudienceLeadStatusSchema, getKey: (item) => `${item.audienceId}:${item.leadStatus}`, shapeOptions: shape("audience_lead_statuses") })); }
export function createAudienceTagsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "audience_tags", schema: AudienceTagSchema, getKey: (item) => `${item.audienceId}:${item.tagId}`, shapeOptions: shape("audience_tags") })); }
export function createCampaignsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "campaigns", schema: CampaignSchema, getKey: (item) => item.id, shapeOptions: shape("campaigns") })); }
export function createCampaignRecipientsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "campaign_recipients", schema: CampaignRecipientSchema, getKey: (item) => item.id, shapeOptions: shape("campaign_recipients") })); }
export type AudiencesCollection = ReturnType<typeof createAudiencesCollection>; export type AudienceLeadStatusesCollection = ReturnType<typeof createAudienceLeadStatusesCollection>; export type AudienceTagsCollection = ReturnType<typeof createAudienceTagsCollection>; export type CampaignsCollection = ReturnType<typeof createCampaignsCollection>; export type CampaignRecipientsCollection = ReturnType<typeof createCampaignRecipientsCollection>;
