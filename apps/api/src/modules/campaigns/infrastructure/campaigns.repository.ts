import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { audienceLeadStatuses, audienceTags, audiences, campaignRecipients, campaigns, contactTags, contacts, createAppDbClient, emailSuppressions, tags, withOrgContext, type SparkDb } from "@spark/db";
import { campaignRecipientId, matchesAudience, normalizeTagNames, tagDisplayName, tagSlug, type AudienceFilter, type Campaign, type CampaignId, type CreateAudienceInput, type CreateCampaignInput, type OrgId, type UserId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

@Injectable()
export class CampaignsRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly events: DomainEventWriter) {}
  createAudience(orgId: OrgId, userId: UserId, input: CreateAudienceInput) { return withOrgContext(this.db, orgId, async (tx) => {
    const [row] = await tx.insert(audiences).values({ id: input.id, orgId, name: input.name, description: input.description ?? null, operator: input.filter.operator, minimumScore: input.filter.minimumScore, createdBy: userId }).returning();
    if (!row) throw new Error("Audience insert returned no row.");
    // As duas listas do público são linhas (ADR-0035); a marcação aponta para
    // o catálogo, criando a que ainda não existir.
    if (input.filter.leadStatuses.length > 0) await tx.insert(audienceLeadStatuses).values(input.filter.leadStatuses.map((leadStatus) => ({ orgId, audienceId: row.id, leadStatus }))).onConflictDoNothing();
    const wantedTags = normalizeTagNames(input.filter.tags);
    if (wantedTags.length > 0) {
      await tx.insert(tags).values(wantedTags.map((name) => ({ orgId, name: tagDisplayName(name), slug: tagSlug(name) }))).onConflictDoNothing();
      const catalog = await tx.select({ id: tags.id, slug: tags.slug }).from(tags).where(and(eq(tags.orgId, orgId), inArray(tags.slug, wantedTags.map(tagSlug))));
      if (catalog.length > 0) await tx.insert(audienceTags).values(catalog.map((tag) => ({ orgId, audienceId: row.id, tagId: tag.id }))).onConflictDoNothing();
    }
    const txid = await captureTxid(tx); await this.events.append(tx, { orgId, type: "audience.created", data: { audienceId: input.id } });
    return { audience: toAudience(row, input.filter), txid };
  }); }
  createCampaign(orgId: OrgId, userId: UserId, input: CreateCampaignInput) { return withOrgContext(this.db, orgId, async (tx) => {
    const [audience] = await tx.select().from(audiences).where(and(eq(audiences.orgId, orgId), eq(audiences.id, input.audienceId))).limit(1); if (!audience) throw new NotFoundException("Público não encontrado.");
    const candidates = await tx.select().from(contacts).where(and(eq(contacts.orgId, orgId), isNull(contacts.deletedAt)));
    // As marcações são linhas (ADR-0035): uma consulta para a organização
    // inteira, e o público é avaliado sobre ela — não uma consulta por pessoa.
    const tagRows = await tx.select({ contactId: contactTags.contactId, name: tags.name }).from(contactTags).innerJoin(tags, eq(contactTags.tagId, tags.id)).where(eq(contactTags.orgId, orgId));
    const tagsByContact = new Map<string, string[]>();
    for (const row of tagRows) tagsByContact.set(row.contactId, [...(tagsByContact.get(row.contactId) ?? []), row.name]);
    // O filtro do público é montado das linhas (ADR-0035).
    const audienceFilter = await readAudienceFilter(tx, audience);
    const matching = candidates.filter((contact) => matchesAudience({ ...contact, deletedAt: contact.deletedAt?.toISOString() ?? null, tags: tagsByContact.get(contact.id) ?? [] }, audienceFilter));
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
/* `filter` não é coluna (ADR-0035): a API devolve o público montado das
 * linhas, no formato que a tela e as regras de `matchesAudience` já usam. */
function toAudience(row: typeof audiences.$inferSelect, filter: AudienceFilter) { return { ...row, filter, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }; }
function toCampaign(row: typeof campaigns.$inferSelect): Campaign { return { ...row, sentAt: row.sentAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } as Campaign; }

/** O público montado das suas linhas, no formato que `matchesAudience` recebe. */
async function readAudienceFilter(tx: SparkDb, audience: typeof audiences.$inferSelect): Promise<AudienceFilter> {
  const statuses = await tx.select({ leadStatus: audienceLeadStatuses.leadStatus }).from(audienceLeadStatuses).where(eq(audienceLeadStatuses.audienceId, audience.id));
  const chosenTags = await tx.select({ name: tags.name }).from(audienceTags).innerJoin(tags, eq(audienceTags.tagId, tags.id)).where(eq(audienceTags.audienceId, audience.id));
  return {
    operator: audience.operator === "any" ? "any" : "all",
    leadStatuses: statuses.map((row) => row.leadStatus),
    tags: chosenTags.map((row) => row.name),
    minimumScore: audience.minimumScore,
  };
}
