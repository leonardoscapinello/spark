import type { Contact } from "../schema/contact.js";
/** O cadastro escolhido prevalece; a mesclagem só completa seus dados vazios. */
export function contactMergePatch(target: Contact, source: Contact) {
  if (target.id === source.id) throw new Error("Escolha duas pessoas diferentes.");
  if (target.orgId !== source.orgId) throw new Error("As pessoas precisam pertencer à mesma organização.");
  if (target.deletedAt || source.deletedAt) throw new Error("Só é possível mesclar pessoas ativas.");
  return { email: target.email ?? source.email, phone: target.phone ?? source.phone, companyId: target.companyId ?? source.companyId, ownerId: target.ownerId ?? source.ownerId, source: target.source ?? source.source };
}
