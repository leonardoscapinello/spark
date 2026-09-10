/**
 * Coleção local-first de negócios — mesmo padrão de contacts-collection.ts
 * (docs/adr/0018, docs/adr/0026). `onUpdate` só cobre mover de estágio
 * (arrastar-e-soltar) — é a única mutação que a API aceita hoje
 * (PATCH /v1/deals/:id/move); editar outro campo do negócio é rota futura.
 */
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { DealSchema, dealId, toCentavos, type Deal, type CreateDealInput, type OrgId } from "@spark/core";
import { dealsControllerCreate, dealsControllerMove, getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";

export function negocioOtimista(entrada: Omit<CreateDealInput, "id">, orgId: OrgId): Deal {
  const agora = new Date().toISOString();
  return {
    id: dealId.novo(),
    orgId,
    pipelineId: entrada.pipelineId,
    stageId: entrada.stageId,
    contactId: entrada.contactId ?? null,
    nome: entrada.nome,
    valor: entrada.valor,
    status: entrada.status ?? "aberto",
    dataFechamentoEsperada: entrada.dataFechamentoEsperada ?? null,
    motivoPerda: entrada.motivoPerda ?? null,
    criadoEm: agora,
    atualizadoEm: agora,
    excluidoEm: null,
  };
}

export function createDealsCollection() {
  return createCollection(
    electricCollectionOptions({
      id: "deals",
      schema: DealSchema,
      getKey: (negocio) => negocio.id,
      shapeOptions: {
        url: `${getSparkApiBaseUrl()}/v1/shapes/deals`,
        headers: {
          authorization: () => {
            const token = getSparkAuthToken();
            return token ? `Bearer ${token}` : "";
          },
        },
      },
      onInsert: async ({ transaction }) => {
        const mutacao = transaction.mutations[0];
        if (!mutacao) throw new Error("onInsert chamado sem mutação pendente.");
        const negocio = mutacao.modified;

        const resposta = await dealsControllerCreate({
          id: negocio.id,
          pipelineId: negocio.pipelineId,
          stageId: negocio.stageId,
          contactId: negocio.contactId,
          nome: negocio.nome,
          // wire é número (centavos) — zMoney faz o caminho inverso na
          // validação de entrada da API (packages/core/src/schema/zodHelpers.ts).
          valor: toCentavos(negocio.valor),
          status: negocio.status,
          dataFechamentoEsperada: negocio.dataFechamentoEsperada,
          motivoPerda: negocio.motivoPerda,
        });

        return { txid: resposta.txid };
      },
      onUpdate: async ({ transaction }) => {
        const mutacao = transaction.mutations[0];
        if (!mutacao) throw new Error("onUpdate chamado sem mutação pendente.");

        const camposAlterados = Object.keys(mutacao.changes);
        if (camposAlterados.length !== 1 || camposAlterados[0] !== "stageId") {
          throw new Error(
            `Só é possível mover negócio de estágio hoje — campo(s) alterado(s): ${camposAlterados.join(", ")}.`,
          );
        }

        const resposta = await dealsControllerMove(mutacao.original.id, { stageId: mutacao.modified.stageId });
        return { txid: resposta.txid };
      },
    }),
  );
}

export type DealsCollection = ReturnType<typeof createDealsCollection>;
