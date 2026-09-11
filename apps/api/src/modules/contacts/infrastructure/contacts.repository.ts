import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { createDbClient, withOrgContext, contacts, type SparkDb } from "@spark/db";
import type { Contact, CreateContactInput, UpdateContactInput, OrgId, ContactId } from "@spark/core";

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

  constructor() {
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
          score: input.score ?? 0,
          customFields: input.customFields ?? {},
          tags: input.tags ?? [],
        })
        .returning();

      if (!row) throw new Error("Contact insert returned no row.");

      return {
        contact: toContact(row),
        txid: Number(txid),
      };
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
          score: input.score,
          customFields: input.customFields,
          tags: input.tags,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, id))
        .returning();

      if (!row) throw new NotFoundException(`Contact ${id} not found.`);

      return { contact: toContact(row), txid: Number(txid) };
    });
  }
}

function toContact(row: {
  id: string;
  orgId: string;
  name: string;
  email: string | null;
  phone: string | null;
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
    score: row.score,
    customFields: (row.customFields ?? {}) as Record<string, unknown>,
    tags: (row.tags ?? []) as string[],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  } as Contact;
}
