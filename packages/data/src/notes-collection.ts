import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { NoteSchema, noteId, type CreateNoteInput, type Note, type OrgId, type UserId } from "@spark/core";
import { notesControllerCreate, notesControllerUpdate, notesControllerRemove } from "@spark/api-client";
import { sparkShapeOptions } from "./shape-options.js";
import { confirmed } from "./confirmed.js";

export function optimisticNote(input: Omit<CreateNoteInput, "id">, orgId: OrgId, authorId: UserId): Note {
  const now = new Date().toISOString();
  return {
    id: noteId.create(), orgId, authorId,
    dealId: input.dealId ?? null, contactId: input.contactId ?? null, companyId: input.companyId ?? null,
    body: input.body, pinned: input.pinned ?? false,
    createdAt: now, updatedAt: now,
  };
}

export function createNotesCollection() {
  return createCollection(
    electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "notes",
      schema: NoteSchema,
      getKey: (note) => note.id,
      shapeOptions: sparkShapeOptions("notes"),
      onInsert: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onInsert called with no pending mutation.");
        const note = mutation.modified;
        const response = await notesControllerCreate({ id: note.id, dealId: note.dealId, contactId: note.contactId, companyId: note.companyId, body: note.body, pinned: note.pinned });
        return confirmed(response);
      },
      onUpdate: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onUpdate called with no pending mutation.");
        const response = await notesControllerUpdate(mutation.original.id, { body: mutation.modified.body, pinned: mutation.modified.pinned });
        return confirmed(response);
      },
      onDelete: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onDelete called with no pending mutation.");
        const response = await notesControllerRemove(mutation.original.id);
        return confirmed(response);
      },
    }),
  );
}

export type NotesCollection = ReturnType<typeof createNotesCollection>;
