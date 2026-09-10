/**
 * Coleção local-first de estágios — mesmo padrão de contacts-collection.ts
 * (docs/adr/0018, docs/adr/0026).
 */
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { StageSchema, stageId, type Stage, type CreateStageInput, type OrgId } from "@spark/core";
import { stagesControllerCreate, getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";

export function estagioOtimista(entrada: Omit<CreateStageInput, "id">, orgId: OrgId): Stage {
  const agora = new Date().toISOString();
  return {
    id: stageId.novo(),
    orgId,
    pipelineId: entrada.pipelineId,
    nome: entrada.nome,
    ordem: entrada.ordem,
    probabilidade: entrada.probabilidade ?? 0,
    criadoEm: agora,
    atualizadoEm: agora,
    arquivadoEm: null,
  };
}

export function createStagesCollection() {
  return createCollection(
    electricCollectionOptions({
      id: "stages",
      schema: StageSchema,
      getKey: (estagio) => estagio.id,
      shapeOptions: {
        url: `${getSparkApiBaseUrl()}/v1/shapes/stages`,
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
        const estagio = mutacao.modified;

        const resposta = await stagesControllerCreate({
          id: estagio.id,
          pipelineId: estagio.pipelineId,
          nome: estagio.nome,
          ordem: estagio.ordem,
          probabilidade: estagio.probabilidade,
        });

        return { txid: resposta.txid };
      },
    }),
  );
}

export type StagesCollection = ReturnType<typeof createStagesCollection>;
