/**
 * Coleção local-first de pipelines — mesmo padrão de contacts-collection.ts
 * (docs/adr/0018, docs/adr/0026).
 */
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { PipelineSchema, pipelineId, type Pipeline, type CreatePipelineInput, type OrgId } from "@spark/core";
import { pipelinesControllerCreate, getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";

export function pipelineOtimista(entrada: Omit<CreatePipelineInput, "id">, orgId: OrgId): Pipeline {
  const agora = new Date().toISOString();
  return {
    id: pipelineId.novo(),
    orgId,
    nome: entrada.nome,
    padrao: entrada.padrao ?? false,
    criadoEm: agora,
    atualizadoEm: agora,
    arquivadoEm: null,
  };
}

export function createPipelinesCollection() {
  return createCollection(
    electricCollectionOptions({
      id: "pipelines",
      schema: PipelineSchema,
      getKey: (pipeline) => pipeline.id,
      shapeOptions: {
        url: `${getSparkApiBaseUrl()}/v1/shapes/pipelines`,
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
        const pipeline = mutacao.modified;

        const resposta = await pipelinesControllerCreate({
          id: pipeline.id,
          nome: pipeline.nome,
          padrao: pipeline.padrao,
        });

        return { txid: resposta.txid };
      },
    }),
  );
}

export type PipelinesCollection = ReturnType<typeof createPipelinesCollection>;
