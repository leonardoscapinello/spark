import { createNotesCollection, type NotesCollection } from "@spark/data";
let notes: NotesCollection | undefined;
export function getNotesCollection(): NotesCollection { notes ??= createNotesCollection(); return notes; }
