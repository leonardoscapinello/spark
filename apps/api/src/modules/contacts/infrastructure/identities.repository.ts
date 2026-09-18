import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { contacts, createAppDbClient, identities, type SparkDb, withOrgContext } from "@spark/db";
import {
  identityId,
  normalizeIdentityValue,
  type AddContactIdentityInput,
  type ContactId,
  type Identity,
  type OrgId,
} from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

@Injectable()
export class IdentitiesRepository {
  private readonly db: SparkDb;

  constructor(private readonly eventWriter: DomainEventWriter) {
    this.db = createAppDbClient();
  }

  async add(orgId: OrgId, contactId: ContactId, input: AddContactIdentityInput): Promise<{ identity: Identity; txid: number }> {
    const externalValue = normalizeIdentityValue(input.channel, input.externalValue);
    return withOrgContext(this.db, orgId, async (tx) => {
      const [contact] = await tx.select({ id: contacts.id }).from(contacts).where(and(eq(contacts.id, contactId), eq(contacts.orgId, orgId))).limit(1);
      if (!contact) throw new NotFoundException(`Contact ${contactId} not found.`);

      const [existing] = await tx.select({ id: identities.id }).from(identities).where(and(eq(identities.orgId, orgId), eq(identities.channel, input.channel), eq(identities.externalValue, externalValue))).limit(1);
      if (existing) throw new ConflictException("Este canal já está vinculado a outro contato.");

      const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
      const txidRow = txidRows[0];
      if (!txidRow) throw new Error("Could not obtain the transaction's txid.");

      const [row] = await tx.insert(identities).values({ id: identityId.create(), orgId, contactId, channel: input.channel, externalValue, verified: false }).returning();
      if (!row) throw new Error("Identity insert returned no row.");

      const identity = {
        id: identityId.from(row.id),
        orgId,
        contactId,
        channel: input.channel,
        externalValue: row.externalValue,
        verified: row.verified,
        createdAt: row.createdAt.toISOString(),
      } satisfies Identity;
      await this.eventWriter.append(tx, { orgId, contactId, type: "identity.added", data: { channel: identity.channel, externalValue: identity.externalValue } });
      return { identity, txid: Number(txidRow.txid) };
    });
  }
}
