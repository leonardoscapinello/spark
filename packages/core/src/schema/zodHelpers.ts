/**
 * Ponte entre Zod e os tipos marcados de core. Um schema aqui é a ÚNICA
 * fonte de validação — dela derivam tipo TypeScript, validação de runtime,
 * OpenAPI, formulário e schema Drizzle (docs/adr/0004, docs/adr/0019).
 *
 * Padrão: `z.string().transform((valor, ctx) => {...})` chamando o
 * construtor do tipo marcado. Se o construtor lança, viramos `z.NEVER` com
 * uma mensagem de issue — nunca duplicamos a regra de validação aqui.
 */
import { z } from "zod";
import { email as toEmail, type Email } from "../format/email.js";
import { telefone as toTelefone, type Telefone } from "../format/phone.js";
import { cpf as toCpf, cnpj as toCnpj, type CPF, type CNPJ } from "../format/document.js";
import { money as toMoney } from "../money/money.js";
import {
  orgId as toOrgId,
  contactId as toContactId,
  userId as toUserId,
  dealId as toDealId,
  type OrgId,
  type ContactId,
  type UserId,
  type DealId,
} from "../identity/id.js";

function bridged<Out>(construir: (valor: string) => Out) {
  return z.string().transform((valor, ctx) => {
    try {
      return construir(valor);
    } catch (erro) {
      ctx.addIssue({ code: "custom", message: erro instanceof Error ? erro.message : "inválido" });
      return z.NEVER;
    }
  });
}

export const zEmail = bridged<Email>(toEmail);
export const zTelefone = bridged<Telefone>(toTelefone);
export const zCpf = bridged<CPF>(toCpf);
export const zCnpj = bridged<CNPJ>(toCnpj);

export const zOrgId = bridged<OrgId>(toOrgId.de);
export const zContactId = bridged<ContactId>(toContactId.de);
export const zUserId = bridged<UserId>(toUserId.de);
export const zDealId = bridged<DealId>(toDealId.de);

/** Aceita centavos inteiros (número) — é o formato de transporte, nunca decimal. */
export const zMoney = z.number().int().transform((valor, ctx) => {
  try {
    return toMoney(valor);
  } catch (erro) {
    ctx.addIssue({ code: "custom", message: erro instanceof Error ? erro.message : "inválido" });
    return z.NEVER;
  }
});
