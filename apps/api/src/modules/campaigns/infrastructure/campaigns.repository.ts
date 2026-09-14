import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { audiences, campaignRecipients, campaigns, contactTags, contacts, createDbClient, emailSuppressions, tags, withOrgContext, type SparkDb } from "@spark/db";
import { campaignRecipientId, matchesAudience, type Campaign, type CampaignId, type CreateAudienceInput, type CreateCampaignInput, type OrgId, type UserId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

@Injectable()
export class CampaignsRepository {
  private readonly db: SparkDb = createDbClient(process.env.DATABASE_URL ?? "");
  constructor(private readonly events: DomainEventWriter) {}
  createAudience(orgId: OrgId, userId: UserId, input: CreateAudienceInput) { return withOrgContext(this.db, orgId, async (tx) => {
    const [row] = await tx.insert(audiences).values({ id: input.id, orgId, name: input.name, description: input.description ?? null, filter: input.filter, createdBy: userId }).returning();
    if (!row) throw new Error("Audience insert returned no row."); const txid = await captureTxid(tx); await this.events.append(tx, { orgId, type: "audience.created", data: { audienceId: input.id } });
    return { audience: toAudience(row), txid };
  }); }
  createCampaign(orgId: OrgId, userId: UserId, input: CreateCampaignInput) { return withOrgContext(this.db, orgId, async (tx) => {
    const [audience] = await tx.select().from(audiences).where(and(eq(audiences.orgId, orgId), eq(audiences.id, input.audienceId))).limit(1); if (!audience) throw new NotFoundException("Público não encontrado.");
    const candidates = await tx.select().from(contacts).where(and(eq(contacts.orgId, orgId), isNull(contacts.deletedAt)));
    // As marcações são linhas (ADR-0035): uma consulta para a organização
    // inteira, e o público é avaliado sobre ela — não uma consulta por pessoa.
    const tagRows = await tx.select({ contactId: contactTags.contactId, name: tags.name }).from(contactTags).innerJoin(tags, eq(contactTags.tagId, tags.id)).where(eq(contactTags.orgId, orgId));
    const tagsByContact = new Map<string, string[]>();
    for (const row of tagRows) tagsByContact.set(row.contactId, [...(tagsByContact.get(row.contactId) ?? []), row.name]);
    const matching = candidates.filter((contact) => matchesAudience({ ...contact, deletedAt: contact.deletedAt?.toISOString() ?? null, tags: tagsByContact.get(contact.id) ?? [] }, audience.filter));
    const [row] = await tx.insert(campaigns).values({ ...input, orgId, createdBy: userId, recipientCount: matching.length }).returning(); if (!row) throw new Error("Campaign insert returned no row.");
    if (matching.length) await tx.insert(campaignRecipients).values(matching.map((contact) => ({ id: campaignRecipientId.create(), orgId, campaignId: input.id, contactId: contact.id, email: contact.email! })));
    const txid = await captureTxid(tx); await this.events.append(tx, { orgId, type: "campaign.created", data: { campaignId: input.id, recipientCount: matching.length } }); return { campaign: toCampaign(row), txid };
  }); }
  async prepareSend(orgId: OrgId, id: CampaignId) { return withOrgContext(this.db, orgId, async (tx) => {
    const [campaign] = await tx.select().from(campaigns).where(and(eq(campaigns.orgId, orgId), eq(campaigns.id, id))).limit(1); if (!campaign) throw new NotFoundException("Campanha não encontrada."); if (campaign.status !== "draft") throw new ConflictException("Esta campanha já foi processada.");
    const recipients = await tx.select().from(campaignRecipients).where(and(eq(campaignRecipients.orgId, orgId), eq(campaignRecipients.campaignId, id), eq(campaignRecipients.status, "pending")));
    const emails = recipients.map((item) => item.email.toLowerCase()); const suppressed = emails.length ? await tx.select({ email: emailSuppressions.email }).from(emailSuppressions).where(and(eq(emailSuppressions.orgId, orgId), inArray(emailSuppressions.email, emails))) : [];
    const blocked = new Set(suppressed.map((item) => item.email.toLowerCase())); const blockedIds = recipients.filter((item) => blocked.has(item.email.toLowerCase())).map((item) => item.id);
    if (blockedIds.length) await tx.update(campaignRecipients).set({ status: "suppressed" }).where(inArray(campaignRecipients.id, blockedIds));
    await tx.update(campaigns).set({ status: "sending", suppressedCount: blockedIds.length, updatedAt: new Date() }).where(eq(campaigns.id, id));
    return { campaign, recipients: recipients.filter((item) => !blocked.has(item.email.toLowerCase())) };
  }); }
  markRecipient(orgId: OrgId, id: string, outcome: { providerMessageId?: string; error?: string }) { return withOrgContext(this.db, orgId, async (tx) => { await tx.update(campaignRecipients).set(outcome.error ? { status: "failed", error: outcome.error } : { status: "sent", providerMessageId: outcome.providerMessageId, sentAt: new Date(), error: null }).where(and(eq(campaignRecipients.orgId, orgId), eq(campaignRecipients.id, id))); }); }
  finishSend(orgId: OrgId, id: CampaignId) { return withOrgContext(this.db, orgId, async (tx) => {
    const rows = await tx.select({ status: campaignRecipients.status, total: sql<number>`count(*)::int` }).from(campaignRecipients).where(and(eq(campaignRecipients.orgId, orgId), eq(campaignRecipients.campaignId, id))).groupBy(campaignRecipients.status);
    const counts = Object.fromEntries(rows.map((row) => [row.status, row.total])); const sent = counts.sent ?? 0, failed = counts.failed ?? 0, suppressed = counts.suppressed ?? 0; const status = failed === 0 ? "sent" : sent > 0 ? "partial" : "failed";
    const [row] = await tx.update(campaigns).set({ status, sentCount: sent, failedCount: failed, suppressedCount: suppressed, sentAt: new Date(), updatedAt: new Date() }).where(and(eq(campaigns.orgId, orgId), eq(campaigns.id, id))).returning(); if (!row) throw new NotFoundException("Campanha não encontrada.");
    const txid = await captureTxid(tx); await this.events.append(tx, { orgId, type: "campaign.sent", data: { campaignId: id, sent, failed, suppressed } }); return { campaign: toCampaign(row), txid };
  }); }
}
async function captureTxid(tx: SparkDb): Promise<number> { const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`); if (!rows[0]) throw new Error("Could not obtain transaction id."); return Number(rows[0].txid); }
function toAudience(row: typeof audiences.$inferSelect) { return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }; }
function toCampaign(row: typeof campaigns.$inferSelect): Campaign { return { ...row, sentAt: row.sentAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } as Campaign; }
