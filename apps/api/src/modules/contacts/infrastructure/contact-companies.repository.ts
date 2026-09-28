import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";
import { createAppDbClient, withOrgContext, contacts, companies, contactCompanies } from "@spark/db";
import type { OrgId, UserId, ContactId, CompanyId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";
@Injectable()
export class ContactCompaniesRepository {
 private readonly db = createAppDbClient();
 constructor(private readonly events: DomainEventWriter) {}
 async link(orgId: OrgId, actorUserId: UserId, contactId: ContactId, companyId: CompanyId) {
  return withOrgContext(this.db, orgId, async (tx) => {
   const [contact] = await tx.select().from(contacts).where(and(eq(contacts.orgId, orgId), eq(contacts.id, contactId), isNull(contacts.deletedAt))).limit(1);
   const [company] = await tx.select().from(companies).where(and(eq(companies.orgId, orgId), eq(companies.id, companyId), isNull(companies.deletedAt))).limit(1);
   if (!contact || !company) throw new NotFoundException("Pessoa ou empresa indisponível.");
   const inserted = await tx.insert(contactCompanies).values({ orgId, contactId, companyId }).onConflictDoNothing().returning();
   if (!contact.companyId) await tx.update(contacts).set({ companyId, updatedAt: new Date() }).where(eq(contacts.id, contactId));
   if (inserted.length) await this.events.append(tx, { orgId, actorUserId, contactId, companyId, type: "contact.updated", data: { title: "Empresa vinculada", name: company.name } });
   const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
   if (!rows[0]) throw new Error("Não foi possível confirmar o vínculo.");
   return { txid: Number(rows[0].txid) };
  });
 }
}
