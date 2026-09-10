/**
 * Coleção local-first de contatos — TanStack DB + Electric (docs/adr/0018).
 *
 * O ShapeStream nunca fala com o Electric direto: `shapeOptions.url` aponta
 * pro proxy de autorização em apps/api (GET /v1/shapes/contacts), que é
 * quem decide o filtro por organização — aqui o cliente só escolhe QUE
 * tabela, nunca COM QUE FILTRO (docs/adr/0026).
 *
 * `createContactsCollection` é uma factory, não um singleton pronto no
 * módulo: `shapeOptions.url` é um campo estático, resolvido no momento em
 * que a config é montada — se isto fosse `createCollection(...)` direto no
 * top-level do módulo, a URL seria calculada na hora do `import`, antes do
 * app chamar `setSparkApiBaseUrl` na inicialização (mesmo risco de ordem
 * já documentado em http-client.ts). Cada app chama a factory DEPOIS de
 * configurar base URL e token.
 */
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { ContactSchema, contactId, type Contact, type CreateContactInput, type OrgId } from "@spark/core";
import { contactsControllerCreate, getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";

/**
 * Monta a linha completa que `collection.insert()` exige — o schema de
 * validação da coleção é `ContactSchema` inteiro (o formato que o Electric
 * sincroniza), não só o que o formulário coleta. `id` já é o definitivo
 * (docs/adr/0030); `orgId` e os timestamps são só placeholder otimista —
 * o servidor nunca lê nenhum dos dois do corpo da requisição
 * (docs/adr/0026), e quando o Electric replicar a linha real de volta,
 * estes valores são substituídos pelos que o Postgres gravou de fato.
 */
export function contatoOtimista(entrada: Omit<CreateContactInput, "id">, orgId: OrgId): Contact {
  const agora = new Date().toISOString();
  return {
    id: contactId.novo(),
    orgId,
    nome: entrada.nome,
    email: entrada.email ?? null,
    telefone: entrada.telefone ?? null,
    score: entrada.score ?? 0,
    customFields: entrada.customFields ?? {},
    tags: entrada.tags ?? [],
    criadoEm: agora,
    atualizadoEm: agora,
    excluidoEm: null,
  };
}

export function createContactsCollection() {
  return createCollection(
    electricCollectionOptions({
      id: "contacts",
      schema: ContactSchema,
      getKey: (contato) => contato.id,
      shapeOptions: {
        url: `${getSparkApiBaseUrl()}/v1/shapes/contacts`,
        // Electric replica coluna do Postgres (snake_case) — nosso schema
        // Zod é todo camelCase (ADR-0019). Sem isto, campo composto
        // (orgId, criadoEm...) chega undefined em runtime, sem erro de
        // tipo nenhum (achado testando de verdade no navegador, não só
        // no compilador — a suíte de teste só exercitava campo de uma
        // palavra só, onde snake_case e camelCase são idênticos).
        columnMapper: snakeCamelMapper(),
        headers: {
          // função, não string — reavaliada a cada request do stream, pra
          // acompanhar renovação de token sem recriar a coleção inteira.
          authorization: () => {
            const token = getSparkAuthToken();
            return token ? `Bearer ${token}` : "";
          },
        },
      },
      onInsert: async ({ transaction }) => {
        const mutacao = transaction.mutations[0];
        if (!mutacao) throw new Error("onInsert chamado sem mutação pendente.");

        const contato = mutacao.modified;

        // Literal direto, não passando por uma variável tipada como
        // CreateContactInput: Contact tem email/telefone sempre presentes
        // (nunca `undefined`, só `| null`), mas o TIPO da propriedade
        // opcional de CreateContactInput é `Email | null | undefined` —
        // sob exactOptionalPropertyTypes (tsconfig.base.json), coagir por
        // essa variável intermediária faria o `undefined` da declaração
        // "vazar" pro argumento, mesmo o valor de verdade nunca sendo
        // undefined aqui. Literal inline infere o tipo de cada campo da
        // própria expressão (Email | null), que já bate com CreateContactDto.
        const resposta = await contactsControllerCreate({
          id: contato.id,
          nome: contato.nome,
          email: contato.email,
          telefone: contato.telefone,
          score: contato.score,
          customFields: contato.customFields,
          tags: contato.tags,
        });

        // { txid } no retorno — é o que o TanStack DB usa (awaitTxId por
        // baixo dos panos) pra saber que o Electric já replicou esta
        // escrita antes de soltar o estado otimista local.
        return { txid: resposta.txid };
      },
    }),
  );
}

export type ContactsCollection = ReturnType<typeof createContactsCollection>;
