import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { createDbClient, notes, withOrgContext, type SparkDb } from "@spark/db";
import type { CreateNoteInput, Note, NoteId, OrgId, UpdateNoteInput, UserId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

/** Notas. Só quem escreveu pode editar ou apagar a sua — nota é fala de alguém. */
@Injectable()
export class NotesRepository {
  private readonly db: SparkDb;
  constructor(private readonly eventWriter: DomainEventWriter) {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  create(orgId: OrgId, authorId: UserId, input: CreateNoteInput): Promise<{ note: Note; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.insert(notes).values({
        id: input.id, orgId, authorId,
        dealId: input.dealId ?? null, contactId: input.contactId ?? null, companyId: input.companyId ?? null,
        body: input.body, pinned: input.pinned ?? false,
      }).returning();
      if (!row) throw new Error("Note insert returned no row.");
      const note = toNote(row);
      await this.eventWriter.append(tx, {
        orgId,
        ...(note.contactId ? { contactId: note.contactId } : {}),
        ...(note.companyId ? { companyId: note.companyId } : {}),
        ...(note.dealId ? { dealId: note.dealId } : {}),
        type: "note.created",
        data: { noteId: note.id },
      });
      return { note, txid: await captureTxid(tx) };
    });
  }

  update(orgId: OrgId, id: NoteId, authorId: UserId, input: UpdateNoteInput): Promise<{ note: Note; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.update(notes)
        .set({ ...(input.body !== undefined ? { body: input.body } : {}), ...(input.pinned !== undefined ? { pinned: input.pinned } : {}), updatedAt: new Date() })
        .where(and(eq(notes.id, id), eq(notes.authorId, authorId)))
        .returning();
      if (!row) throw new NotFoundException("Nota não encontrada, ou não é sua.");
      return { note: toNote(row), txid: await captureTxid(tx) };
    });
  }

  remove(orgId: OrgId, id: NoteId, authorId: UserId): Promise<{ note: null; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.delete(notes).where(and(eq(notes.id, id), eq(notes.authorId, authorId))).returning();
      if (!row) throw new NotFoundException("Nota não encontrada, ou não é sua.");
      return { note: null, txid: await captureTxid(tx) };
    });
  }
}

async function captureTxid(tx: SparkDb): Promise<number> {
  const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  const row = rows[0];
  if (!row) throw new Error("Could not obtain the transaction's txid.");
  return Number(row.txid);
}

function toNote(row: typeof notes.$inferSelect): Note {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } as Note;
}
