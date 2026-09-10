/**
 * Coleção local-first de atividades — mesmo padrão de deals-collection.ts
 * (docs/adr/0018, docs/adr/0026). `onUpdate` só cobre concluir/reabrir
 * (`concluida`, e só junto com `concluidaEm`) — é a única mutação que a
 * API aceita hoje (PATCH /v1/activities/:id/complete); editar outro
 * campo é rota futura.
 */
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { ActivitySchema, activityId, type Activity, type CreateActivityInput, type OrgId } from "@spark/core";
import { activitiesControllerCreate, activitiesControllerComplete, getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";

export function atividadeOtimista(entrada: Omit<CreateActivityInput, "id">, orgId: OrgId): Activity {
  const agora = new Date().toISOString();
  return {
    id: activityId.novo(),
    orgId,
    contactId: entrada.contactId ?? null,
    dealId: entrada.dealId ?? null,
    tipo: entrada.tipo,
    titulo: entrada.titulo,
    notas: entrada.notas ?? null,
    dataHora: entrada.dataHora,
    concluida: false,
    concluidaEm: null,
    criadoEm: agora,
    atualizadoEm: agora,
  };
}

export function createActivitiesCollection() {
  return createCollection(
    electricCollectionOptions({
      id: "activities",
      schema: ActivitySchema,
      getKey: (atividade) => atividade.id,
      shapeOptions: {
        url: `${getSparkApiBaseUrl()}/v1/shapes/activities`,
        // Electric replica coluna do Postgres (snake_case); schema Zod é
        // camelCase (ADR-0019) — ver o mesmo comentário em contacts-collection.ts.
        columnMapper: snakeCamelMapper(),
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
        const atividade = mutacao.modified;

        const resposta = await activitiesControllerCreate({
          id: atividade.id,
          contactId: atividade.contactId,
          dealId: atividade.dealId,
          tipo: atividade.tipo,
          titulo: atividade.titulo,
          notas: atividade.notas,
          dataHora: atividade.dataHora,
        });

        return { txid: resposta.txid };
      },
      onUpdate: async ({ transaction }) => {
        const mutacao = transaction.mutations[0];
        if (!mutacao) throw new Error("onUpdate chamado sem mutação pendente.");

        const camposAlterados = Object.keys(mutacao.changes);
        const ehConclusao =
          camposAlterados.includes("concluida") &&
          camposAlterados.every((campo) => campo === "concluida" || campo === "concluidaEm");
        if (!ehConclusao) {
          throw new Error(
            `Só é possível concluir ou reabrir atividade hoje — campo(s) alterado(s): ${camposAlterados.join(", ")}.`,
          );
        }

        const resposta = await activitiesControllerComplete(mutacao.original.id, {
          concluida: mutacao.modified.concluida,
        });
        return { txid: resposta.txid };
      },
    }),
  );
}

export type ActivitiesCollection = ReturnType<typeof createActivitiesCollection>;
