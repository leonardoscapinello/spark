import { createAudiencesCollection, createCampaignRecipientsCollection, createCampaignsCollection, type AudiencesCollection, type CampaignRecipientsCollection, type CampaignsCollection } from "@spark/data";
let audiences: AudiencesCollection | undefined; let campaigns: CampaignsCollection | undefined; let recipients: CampaignRecipientsCollection | undefined;
export function getAudiencesCollection() { audiences ??= createAudiencesCollection(); return audiences; }
export function getCampaignsCollection() { campaigns ??= createCampaignsCollection(); return campaigns; }
export function getCampaignRecipientsCollection() { recipients ??= createCampaignRecipientsCollection(); return recipients; }
