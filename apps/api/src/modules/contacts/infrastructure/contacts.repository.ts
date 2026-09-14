import { Injectable, NotFoundException } from "@nestjs/common";
import { CustomFieldWriter } from "../../settings/infrastructure/custom-field-writer.js";
import { TagWriter } from "../../settings/infrastructure/tag-writer.js";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { createDbClient, withOrgContext, contacts, type SparkDb } from "@spark/db";
import type { Contact, CreateContactInput, ImportContactsInput, ImportContactsResponse, UpdateContactInput, OrgId, ContactId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

/**
 * Every business write goes through withOrgContext — RLS actually
 * enforced, not the admin connection (docs/adr/0022, docs/adr/0026).
 * Unlike UsersRepository (which resolves WHO the user is and therefore
 * needs to cross organizations), here we already know the org_id — no
 * reason to bypass RLS.
 */
@Injectable()
export class ContactsRepository {
  private readonly db: SparkDb;

  constructor(private readonly eventWriter: DomainEventWriter, private readonly customFields: CustomFieldWriter, private readonly tagWriter: TagWriter) {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  /**
   * Creates the contact and also returns the transaction's txid — that's
   * what TanStack DB uses (`collection.utils.awaitTxId`) to know when the
   * client's optimistic write was confirmed by Electric, not before.
   */
  async create(orgId: OrgId, input: CreateContactInput): Promise<{ contact: Contact; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
      const txidRow = txidRows[0];
      if (!txidRow) throw new Error("Could not obtain the transaction's txid.");
      const { txid } = txidRow;
      const [row] = await tx
        .insert(contacts)
        .values({
          id: input.id,
          orgId,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          leadStatus: input.leadStatus ?? "new",
          source: input.source ?? null,
          ownerId: input.ownerId ?? null,
          companyId: input.companyId ?? null,
          score: input.score ?? 0,
          customFields: input.customFields ?? {},
          tags: input.tags ?? [],
        })
        .returning();

      if (!row) throw new Error("Contact insert returned no row.");

      const contact = toContact(row);

      // Espelha os campos personalizados nas colunas tipadas, na mesma transação (ADR-0035).

      if (input.customFields !== undefined) await this.customFields.write(tx, orgId, "contact", contact.id, input.customFields);
      if (input.tags !== undefined) await this.tagWriter.write(tx, orgId, "contact", contact.id, input.tags);
      await this.eventWriter.append(tx, { orgId, contactId: contact.id, companyId: contact.companyId, type: "contact.created", data: { name: contact.name, source: contact.source } });
      return { contact, txid: Number(txid) };
    });
  }

  /**
   * Busca no banco pelo índice GIN de search_vector (migration 0029). Só a
   * API usa: a tela lê a coleção local (CLAUDE.md regra 5). `query` já é
   * uma tsquery montada por core — o usuário nunca escreve sintaxe aqui —
   * e entra como bind parameter, não interpolada.
   */
  async search(orgId: OrgId, query: string, limit: number): Promise<Contact[]> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const vector = sql.raw('"contacts"."search_vector"');
      const rows = await tx
        .select()
        .from(contacts)
        // org_id explícito além do RLS: em teste a API conecta como postgres, que ignora RLS —
        // e leitura pela API é exatamente onde vazar entre organizações custa mais (ADR-0026).
        .where(and(eq(contacts.orgId, orgId), isNull(contacts.deletedAt), sql`${vector} @@ to_tsquery('simple', ${query})`))
        .orderBy(sql`ts_rank(${vector}, to_tsquery('simple', ${query})) DESC`, contacts.name)
        .limit(limit);
      return rows.map(toContact);
    });
  }

  async update(orgId: OrgId, id: ContactId, input: UpdateContactInput): Promise<{ contact: Contact; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
      const txidRow = txidRows[0];
      if (!txidRow) throw new Error("Could not obtain the transaction's txid.");
      const { txid } = txidRow;

      const [row] = await tx
        .update(contacts)
        .set({
          name: input.name,
          email: input.email,
          phone: input.phone,
          leadStatus: input.leadStatus,
          source: input.source,
          ownerId: input.ownerId,
          companyId: input.companyId,
          score: input.score,
          customFields: input.customFields,
          tags: input.tags,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, id))
        .returning();

      if (!row) throw new NotFoundException(`Contact ${id} not found.`);

      const contact = toContact(row);

      // Espelha os campos personalizados nas colunas tipadas, na mesma transação (ADR-0035).

      if (input.customFields !== undefined) await this.customFields.write(tx, orgId, "contact", contact.id, input.customFields);
      if (input.tags !== undefined) await this.tagWriter.write(tx, orgId, "contact", contact.id, input.tags);
      await this.eventWriter.append(tx, { orgId, contactId: contact.id, companyId: contact.companyId, type: "contact.updated", data: { fields: Object.keys(input) } });
      return { contact, txid: Number(txid) };
    });
  }

  async archive(orgId: OrgId, id: ContactId, archived: boolean): Promise<{ contact: Contact; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
      const txidRow = txidRows[0];
      if (!txidRow) throw new Error("Could not obtain the transaction's txid.");
      const [row] = await tx.update(contacts).set({ deletedAt: archived ? new Date() : null, updatedAt: new Date() }).where(eq(contacts.id, id)).returning();
      if (!row) throw new NotFoundException(`Contact ${id} not found.`);
      const contact = toContact(row);
      await this.eventWriter.append(tx, { orgId, contactId: contact.id, companyId: contact.companyId, type: archived ? "contact.archived" : "contact.restored" });
      return { contact, txid: Number(txidRow.txid) };
    });
  }

  async import(orgId: OrgId, input: ImportContactsInput): Promise<ImportContactsResponse> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
      const txid = Number(txidRows[0]?.txid);
      if (!Number.isInteger(txid)) throw new Error("Could not obtain the transaction's txid.");

      const emailValues = input.contacts.flatMap((contact) => contact.email ? [contact.email] : []);
      const phoneValues = input.contacts.flatMap((contact) => contact.phone ? [contact.phone] : []);
      const existingEmails = emailValues.length
        ? await tx.select({ value: contacts.email }).from(contacts).where(and(eq(contacts.orgId, orgId), inArray(contacts.email, emailValues)))
        : [];
      const existingPhones = phoneValues.length
        ? await tx.select({ value: contacts.phone }).from(contacts).where(and(eq(contacts.orgId, orgId), inArray(contacts.phone, phoneValues)))
        : [];
      const seenEmails = new Set(existingEmails.flatMap((item) => item.value ? [item.value] : []));
      const seenPhones = new Set(existingPhones.flatMap((item) => item.value ? [item.value] : []));
      const accepted = input.contacts.filter((contact) => {
        if ((contact.email && seenEmails.has(contact.email)) || (contact.phone && seenPhones.has(contact.phone))) return false;
        if (contact.email) seenEmails.add(contact.email);
        if (contact.phone) seenPhones.add(contact.phone);
        return true;
      });

      if (accepted.length) {
        await tx.insert(contacts).values(accepted.map((contact) => ({
          id: contact.id,
          orgId,
          name: contact.name,
          email: contact.email ?? null,
          phone: contact.phone ?? null,
          source: contact.source ?? "csv",
          tags: contact.tags ?? [],
        })));
        await this.eventWriter.appendMany(tx, accepted.map((contact) => ({
          orgId,
          contactId: contact.id,
          type: "contact.created" as const,
          data: { name: contact.name, source: contact.source ?? "csv", imported: true },
        })));
      }
      return { imported: accepted.length, skipped: input.contacts.length - accepted.length, txid };
    });
  }
}

function toContact(row: {
  id: string;
  orgId: string;
  name: string;
  email: string | null;
  phone: string | null;
  leadStatus: string;
  source: string | null;
  ownerId: string | null;
  companyId: string | null;
  score: number;
  customFields: unknown;
  tags: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): Contact {
  return {
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    leadStatus: row.leadStatus,
    source: row.source,
    ownerId: row.ownerId,
    companyId: row.companyId,
    score: row.score,
    customFields: (row.customFields ?? {}) as Record<string, unknown>,
    tags: (row.tags ?? []) as string[],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  } as Contact;
}
