import { createAudienceLeadStatusesCollection, createAudiencesCollection, createAudienceTagsCollection, createCampaignRecipientsCollection, createCampaignsCollection, type AudienceLeadStatusesCollection, type AudiencesCollection, type AudienceTagsCollection, type CampaignRecipientsCollection, type CampaignsCollection } from "@spark/data";
let audiences: AudiencesCollection | undefined; let audienceLeadStatuses: AudienceLeadStatusesCollection | undefined; let audienceTags: AudienceTagsCollection | undefined; let campaigns: CampaignsCollection | undefined; let recipients: CampaignRecipientsCollection | undefined;
export function getAudiencesCollection() { audiences ??= createAudiencesCollection(); return audiences; }
export function getAudienceLeadStatusesCollection() { audienceLeadStatuses ??= createAudienceLeadStatusesCollection(); return audienceLeadStatuses; }
export function getAudienceTagsCollection() { audienceTags ??= createAudienceTagsCollection(); return audienceTags; }
export function getCampaignsCollection() { campaigns ??= createCampaignsCollection(); return campaigns; }
export function getCampaignRecipientsCollection() { recipients ??= createCampaignRecipientsCollection(); return recipients; }
