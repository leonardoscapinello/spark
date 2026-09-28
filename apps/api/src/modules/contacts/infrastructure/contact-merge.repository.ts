import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { contacts, contactTags, customFieldValues, identities, createAppDbClient, withOrgContext } from "@spark/db";
import { ContactSchema, contactMergePatch, type ContactId, type OrgId, type UserId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";
@Injectable()
export class ContactMergeRepository {
  private readonly db = createAppDbClient();
  constructor(private readonly events: DomainEventWriter) {}
  async merge(orgId: OrgId, actorUserId: UserId, targetId: ContactId, sourceId: ContactId) {
    return withOrgContext(this.db, orgId, async (tx) => {
      const rows = await tx.select().from(contacts).where(and(eq(contacts.orgId, orgId), inArray(contacts.id, [targetId, sourceId]))).orderBy(contacts.id).for("update");
      const targetRow = rows.find((r) => r.id === targetId); const sourceRow = rows.find((r) => r.id === sourceId);
      if (!targetRow || !sourceRow) throw new NotFoundException("Pessoa não encontrada.");
      const parse = (row: typeof targetRow) => ContactSchema.parse({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), deletedAt: row.deletedAt?.toISOString() ?? null });
      let patch;
      try { patch = contactMergePatch(parse(targetRow), parse(sourceRow)); } catch (cause) { throw new BadRequestException(cause instanceof Error ? cause.message : "Mesclagem inválida."); }
      // Os canais secundários passam a resolver para a pessoa mantida.
      await tx.update(identities).set({ contactId: targetId }).where(and(eq(identities.orgId, orgId), eq(identities.contactId, sourceId)));
      for (const [channel, externalValue] of [["email", sourceRow.email], ["whatsapp", sourceRow.phone]] as const) {
        if (!externalValue) continue;
        const [owner] = await tx.select({ contactId: identities.contactId }).from(identities).where(and(eq(identities.orgId, orgId), eq(identities.channel, channel), eq(identities.externalValue, externalValue)));
        if (owner && owner.contactId !== targetId) throw new BadRequestException("Um dos canais pertence a uma terceira pessoa. Revise antes de mesclar.");
        await tx.insert(identities).values({ orgId, contactId: targetId, channel, externalValue }).onConflictDoNothing();
      }
      const links = await tx.select().from(contactTags).where(and(eq(contactTags.orgId, orgId), eq(contactTags.contactId, sourceId)));
      if (links.length) await tx.insert(contactTags).values(links.map((row) => ({ ...row, contactId: targetId }))).onConflictDoNothing();
      const values = await tx.select().from(customFieldValues).where(and(eq(customFieldValues.orgId, orgId), eq(customFieldValues.entityType, "contact"), inArray(customFieldValues.entityId, [targetId, sourceId])));
      const targetFields = new Set(values.filter((v) => v.entityId === targetId).map((v) => v.fieldId));
      for (const value of values.filter((v) => v.entityId === sourceId && !targetFields.has(v.fieldId))) {
        const { id: _id, ...copy } = value;
        await tx.insert(customFieldValues).values({ ...copy, entityId: targetId }).onConflictDoNothing();
      }
      // Lista explícita de relações: nenhuma descoberta ou alteração de schema em runtime.
      for (const table of ["deals", "activities", "notes", "conversations", "messages", "events", "form_submissions", "automation_runs"] as const) {
        await tx.execute(sql`UPDATE ${sql.identifier(table)} SET contact_id = ${targetId}::uuid WHERE org_id = ${orgId}::uuid AND contact_id = ${sourceId}::uuid`);
      }
      // O envio histórico continua intacto quando o destino já participa da campanha.
      await tx.execute(sql`UPDATE campaign_recipients AS source SET contact_id = ${targetId}::uuid WHERE source.org_id = ${orgId}::uuid AND source.contact_id = ${sourceId}::uuid AND NOT EXISTS (SELECT 1 FROM campaign_recipients AS target WHERE target.campaign_id = source.campaign_id AND target.contact_id = ${targetId}::uuid)`);
      await tx.update(contacts).set({ ...patch, updatedAt: new Date() }).where(eq(contacts.id, targetId));
      // Mantém a ficha original e os valores conflitantes arquivados, sem exclusão física.
      await tx.update(contacts).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(contacts.id, sourceId));
      await this.events.append(tx, { orgId, actorUserId, contactId: targetId, type: "contact.updated", data: { action: "merged", sourceContactId: sourceId, sourceName: sourceRow.name, sourceSnapshot: parse(sourceRow) } });
      const [clock] = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text AS txid`);
      if (!clock) throw new Error("Não foi possível confirmar a mesclagem.");
      return { contactId: targetId, txid: Number(clock.txid) };
    });
  }
}
