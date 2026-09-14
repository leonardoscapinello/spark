import type { Contact } from "../schema/contact.js";

/**
 * Contact search runs entirely over the local collection — a synced
 * screen never makes a network call to search (docs/adr/0018, CLAUDE.md
 * rule 5). Ignores accents: Brazilian names have them, and nobody types
 * "Jose" expecting not to find "José".
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function contactMatches(contact: Pick<Contact, "name" | "email" | "phone">, term: string): boolean {
  const target = normalizeSearchText(term.trim());
  if (!target) return true;

  return (
    normalizeSearchText(contact.name).includes(target) ||
    (contact.email !== null && normalizeSearchText(contact.email).includes(target)) ||
    (contact.phone !== null && normalizeSearchText(contact.phone).includes(target))
  );
}
