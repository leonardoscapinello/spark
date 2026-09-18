import { z } from "zod";
import {
  zCompanyRegistrationActivityId,
  zCompanyRegistrationId,
  zCompanyRegistrationMemberId,
  zCompanyRegistrationTaxRegimeId,
  zOrgId,
  zServerTimestamp,
} from "./zodHelpers.js";

/**
 * O cadastro público de uma empresa na Receita Federal, guardado por CNPJ.
 *
 * **Não é a entidade Empresa.** Empresa é o que a organização escreve: quem é
 * o responsável, em que etapa está, o que foi combinado. Isto aqui é o que o
 * governo publica, e ninguém edita — só é buscado de novo quando envelhece.
 * Misturar os dois faria a próxima consulta apagar o que uma pessoa digitou.
 *
 * Separado também porque é uma **base de consulta**: o mesmo CNPJ citado num
 * campo de negócio, num campo de pessoa e no cadastro de uma empresa aponta
 * para esta linha única. Buscar uma vez serve a todos, e permite depois
 * perguntar «quais registros meus citam empresas de Minas em atividade?».
 *
 * Tudo em coluna, nada em JSON (ADR-0035): atividades, sócios e regimes
 * tributários têm tabela própria logo abaixo. É o que permite relatório e BI
 * por cima do dado, em vez de abrir um documento em cada linha.
 */
export const CompanyRegistrationStatusSchema = z.enum(["ready", "not_found", "failed"]);
export type CompanyRegistrationStatus = z.infer<typeof CompanyRegistrationStatusSchema>;

export const CompanyRegistrationSchema = z.object({
  id: zCompanyRegistrationId,
  orgId: zOrgId,
  /** Só os 14 dígitos, sem máscara — a máscara é de saída (packages/core/format). */
  taxId: z.string().length(14),

  legalName: z.string().max(300).nullable(),
  tradeName: z.string().max(300).nullable(),

  /** «ATIVA», «BAIXADA», «SUSPENSA», «INAPTA», «NULA». */
  registrationStatus: z.string().max(60).nullable(),
  registrationStatusCode: z.number().int().nullable(),
  registrationStatusDate: z.string().max(10).nullable(),
  registrationStatusReason: z.string().max(200).nullable(),
  specialStatus: z.string().max(200).nullable(),
  specialStatusDate: z.string().max(10).nullable(),

  /** Matriz ou filial. O CNPJ diz nos dígitos 9 a 12, mas o cadastro confirma. */
  headOffice: z.boolean().nullable(),
  openedOn: z.string().max(10).nullable(),

  legalNature: z.string().max(200).nullable(),
  legalNatureCode: z.number().int().nullable(),
  size: z.string().max(60).nullable(),
  sizeCode: z.number().int().nullable(),
  /** Capital social em CENTAVOS inteiros, como todo dinheiro aqui. */
  shareCapital: z.number().int().nullable(),

  streetKind: z.string().max(60).nullable(),
  street: z.string().max(300).nullable(),
  streetNumber: z.string().max(60).nullable(),
  complement: z.string().max(300).nullable(),
  district: z.string().max(200).nullable(),
  postalCode: z.string().max(8).nullable(),
  city: z.string().max(200).nullable(),
  cityIbgeCode: z.number().int().nullable(),
  state: z.string().max(2).nullable(),
  country: z.string().max(100).nullable(),
  foreignCity: z.string().max(200).nullable(),

  phone: z.string().max(20).nullable(),
  secondaryPhone: z.string().max(20).nullable(),
  fax: z.string().max(20).nullable(),
  email: z.string().max(320).nullable(),

  simplesOptant: z.boolean().nullable(),
  simplesOptedOn: z.string().max(10).nullable(),
  simplesLeftOn: z.string().max(10).nullable(),
  meiOptant: z.boolean().nullable(),
  meiOptedOn: z.string().max(10).nullable(),
  meiLeftOn: z.string().max(10).nullable(),

  federativeEntity: z.string().max(200).nullable(),

  /** De onde veio, para saber o que reconsultar quando a fonte mudar. */
  source: z.string().max(200),
  status: CompanyRegistrationStatusSchema,
  httpStatus: z.number().int().min(100).max(599).nullable(),
  fetchedAt: zServerTimestamp,
  expiresAt: zServerTimestamp,
  failureCount: z.number().int().nonnegative(),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type CompanyRegistration = z.infer<typeof CompanyRegistrationSchema>;

/** CNAE. `main` marca a atividade principal; o resto são as secundárias. */
export const CompanyRegistrationActivitySchema = z.object({
  id: zCompanyRegistrationActivityId,
  orgId: zOrgId,
  registrationId: zCompanyRegistrationId,
  code: z.string().max(10),
  description: z.string().max(400),
  main: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
});
export type CompanyRegistrationActivity = z.infer<typeof CompanyRegistrationActivitySchema>;

/**
 * Quadro societário. O CPF vem mascarado da própria Receita («***550179**») e
 * é guardado assim: é o que a fonte publica, e completá-lo não é nosso papel.
 */
export const CompanyRegistrationMemberSchema = z.object({
  id: zCompanyRegistrationMemberId,
  orgId: zOrgId,
  registrationId: zCompanyRegistrationId,
  name: z.string().max(300),
  maskedTaxId: z.string().max(20).nullable(),
  role: z.string().max(200).nullable(),
  roleCode: z.number().int().nullable(),
  joinedOn: z.string().max(10).nullable(),
  ageRange: z.string().max(60).nullable(),
  country: z.string().max(100).nullable(),
  legalRepresentative: z.string().max(300).nullable(),
  legalRepresentativeMaskedTaxId: z.string().max(20).nullable(),
  legalRepresentativeRole: z.string().max(200).nullable(),
  sortOrder: z.number().int().nonnegative(),
});
export type CompanyRegistrationMember = z.infer<typeof CompanyRegistrationMemberSchema>;

/** Forma de tributação por ano — «LUCRO REAL», «SIMPLES NACIONAL», etc. */
export const CompanyRegistrationTaxRegimeSchema = z.object({
  id: zCompanyRegistrationTaxRegimeId,
  orgId: zOrgId,
  registrationId: zCompanyRegistrationId,
  year: z.number().int(),
  taxation: z.string().max(200).nullable(),
  bookkeepingCount: z.number().int().nullable(),
  scpTaxId: z.string().max(14).nullable(),
});
export type CompanyRegistrationTaxRegime = z.infer<typeof CompanyRegistrationTaxRegimeSchema>;

export const ResolveCompanyRegistrationInputSchema = z.object({
  taxId: z.string().trim().min(1).max(20),
  /** Força a ida à fonte mesmo dentro da validade — o botão «atualizar». */
  refresh: z.boolean().default(false),
});
export type ResolveCompanyRegistrationInput = z.infer<typeof ResolveCompanyRegistrationInputSchema>;

export const ResolveCompanyRegistrationResponseSchema = z.object({
  registration: CompanyRegistrationSchema,
  activities: z.array(CompanyRegistrationActivitySchema),
  members: z.array(CompanyRegistrationMemberSchema),
  taxRegimes: z.array(CompanyRegistrationTaxRegimeSchema),
  txid: z.number().int(),
});
export type ResolveCompanyRegistrationResponse = z.infer<typeof ResolveCompanyRegistrationResponseSchema>;

/** Passou da validade: vale ir à fonte de novo. */
export function companyRegistrationNeedsRefresh(registration: Pick<CompanyRegistration, "expiresAt">, now = new Date()): boolean {
  return new Date(registration.expiresAt).getTime() <= now.getTime();
}

/** Uma linha de endereço legível, sem os campos vazios que a Receita devolve. */
export function companyRegistrationAddress(registration: CompanyRegistration): string {
  const logradouro = [registration.streetKind, registration.street].filter(Boolean).join(" ");
  const linha = [logradouro, registration.streetNumber, registration.complement, registration.district].filter((parte) => parte !== null && parte !== "").join(", ");
  const cidade = [registration.city, registration.state].filter(Boolean).join(" · ");
  return [linha, cidade].filter(Boolean).join(" · ");
}
