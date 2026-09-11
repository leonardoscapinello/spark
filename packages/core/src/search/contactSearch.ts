import type { Contact } from "../schema/contact.js";

/**
 * Contact search runs entirely over the local collection — a synced
 * screen never makes a network call to search (docs/adr/0018, CLAUDE.md
 * rule 5). Ignores accents: Brazilian names have them, and nobody types
 * "Jose" expecting not to find "José".
 */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function contactMatches(contact: Pick<Contact, "name" | "email" | "phone">, term: string): boolean {
  const target = normalize(term.trim());
  if (!target) return true;

  return (
    normalize(contact.name).includes(target) ||
    (contact.email !== null && normalize(contact.email).includes(target)) ||
    (contact.phone !== null && normalize(contact.phone).includes(target))
  );
}
