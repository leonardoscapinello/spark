/** Empresa é opcional; quando presente, exige uma pessoa vinculada. */
export function dealCompanyIssue(contactId: string | null, companyId: string | null, linked: boolean): string | null {
  if (!companyId) return null;
  if (!contactId) return "Selecione uma pessoa antes de adicionar a empresa.";
  return linked ? null : "Vincule a pessoa à empresa antes de adicioná-la ao negócio.";
}
