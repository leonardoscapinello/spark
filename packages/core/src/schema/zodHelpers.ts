/**
 * Ponte entre Zod e os tipos marcados de core. Um schema aqui é a ÚNICA
 * fonte de validação — dela derivam tipo TypeScript, validação de runtime,
 * OpenAPI, formulário e schema Drizzle (docs/adr/0004, docs/adr/0019).
 *
 * Padrão: `z.string().min(1).transform((valor, ctx) => {...})` chamando o
 * construtor do tipo marcado. Se o construtor lança, viramos `z.NEVER` com
 * uma mensagem de issue — nunca duplicamos a regra de validação aqui.
 *
 * O `.min(1)` não é só validação — string vazia já cairia no catch do
 * construtor de qualquer forma. É o que faz o zod v4 gerar o JSON Schema
 * de ".nullable()" como `anyOf: [{type}, {type:"null"}]` em vez do atalho
 * `type: [X,"null"]`. O atalho é json-schema-2020-12 válido, mas
 * `@nestjs/swagger` lê `type` array como "propriedade é um array" — vira
 * `{type:"array"}` errado no DTO de entrada de qualquer campo opcional e
 * nulável construído com bridged(). anyOf sobrevive intacto até o
 * cleanupOpenApiDoc da nestjs-zod, que aí sim converte pra
 * `nullable: true` corretamente (confirmado testando os dois caminhos
 * direto no gerador do zod — ver histórico do Bloco 6).
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
  permissionGroupId as toPermissionGroupId,
  pipelineId as toPipelineId,
  stageId as toStageId,
  activityId as toActivityId,
  type OrgId,
  type ContactId,
  type UserId,
  type DealId,
  type PermissionGroupId,
  type PipelineId,
  type StageId,
  type ActivityId,
} from "../identity/id.js";

function bridged<Out>(construir: (valor: string) => Out) {
  return z.string().min(1, { error: "não pode ser vazio" }).transform((valor, ctx) => {
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
export const zPermissionGroupId = bridged<PermissionGroupId>(toPermissionGroupId.de);
export const zPipelineId = bridged<PipelineId>(toPipelineId.de);
export const zStageId = bridged<StageId>(toStageId.de);
export const zActivityId = bridged<ActivityId>(toActivityId.de);

/**
 * Aceita centavos inteiros — é o formato de transporte, nunca decimal.
 * Fica estrito de propósito (só `number`, nunca `bigint`): este mesmo
 * schema alimenta o OpenAPI via `createZodDto`, e `z.toJSONSchema()` da
 * zod (usado por trás) lança `Error: BigInt cannot be representable in
 * JSON Schema` — achado tentando fazer `zMoney` aceitar bigint aqui pra
 * resolver a revalidação da TanStack DB numa linha sincronizada; JSON
 * Schema não tem como representar bigint, ponto final, não é limite que
 * dê pra contornar. O acomodo certo pra bigint fica só em
 * packages/data/src/deals-collection.ts, que NUNCA passa por
 * createZodDto — é o mesmo motivo de `valorSincronizado` já existir lá
 * pra leitura, não aqui.
 */
export const zMoney = z.number().int().transform((valor, ctx) => {
  try {
    return toMoney(valor);
  } catch (erro) {
    ctx.addIssue({ code: "custom", message: erro instanceof Error ? erro.message : "inválido" });
    return z.NEVER;
  }
});

/**
 * Carimbo de tempo gerado pelo servidor (criadoEm/atualizadoEm/etc. — não
 * campo digitado por gente). Aceita ISO 8601 estrito (o que a API
 * devolve, e o que escrita local já validada tem) ou qualquer string não
 * vazia: o texto que o Postgres/Electric manda numa linha sincronizada
 * não é ISO estrito ("2026-09-10 22:42:39.07083+00" — espaço em vez de
 * "T", offset sem dois-pontos) e a precisão/formato pode variar por
 * DateStyle do ambiente — travar num regex específico só troca uma
 * fragilidade por outra. Mesmo motivo de `zMoney` aceitar bigint: o
 * campo nunca é escrito por um cliente, só relido pela própria TanStack
 * DB ao revalidar o registro inteiro em `update()`.
 */
export const zTimestampServidor = z.union([z.iso.datetime(), z.string().min(1)]);
