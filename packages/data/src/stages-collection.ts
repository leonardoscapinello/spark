/**
 * Local-first stages collection — same pattern as contacts-collection.ts
 * (docs/adr/0018, docs/adr/0026).
 */
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { snakeCamelMapper } from "@electric-sql/client";
import { StageSchema, stageId, type Stage, type CreateStageInput, type OrgId } from "@spark/core";
import { stagesControllerCreate, stagesControllerRename, getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";

export function optimisticStage(input: Omit<CreateStageInput, "id">, orgId: OrgId): Stage {
  const now = new Date().toISOString();
  return {
    id: stageId.create(),
    orgId,
    pipelineId: input.pipelineId,
    name: input.name,
    sortOrder: input.sortOrder,
    probability: input.probability ?? 0,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
}

export function createStagesCollection() {
  return createCollection(
    electricCollectionOptions({
      id: "stages",
      schema: StageSchema,
      getKey: (stage) => stage.id,
      shapeOptions: {
        url: `${getSparkApiBaseUrl()}/v1/shapes/stages`,
        // Electric replicates the Postgres column (snake_case); the Zod
        // schema is camelCase (ADR-0019) — see the same comment in
        // contacts-collection.ts.
        columnMapper: snakeCamelMapper(),
        headers: {
          authorization: () => {
            const token = getSparkAuthToken();
            return token ? `Bearer ${token}` : "";
          },
        },
      },
      onInsert: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onInsert called with no pending mutation.");
        const stage = mutation.modified;

        const response = await stagesControllerCreate({
          id: stage.id,
          pipelineId: stage.pipelineId,
          name: stage.name,
          sortOrder: stage.sortOrder,
          probability: stage.probability,
        });

        return { txid: response.txid };
      },
      onUpdate: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onUpdate called with no pending mutation.");

        const changedFields = Object.keys(mutation.changes);
        if (changedFields.length !== 1 || changedFields[0] !== "name") {
          throw new Error(
            `Only renaming a stage is possible today — changed field(s): ${changedFields.join(", ")}.`,
          );
        }

        const response = await stagesControllerRename(mutation.original.id, { name: mutation.modified.name });
        return { txid: response.txid };
      },
    }),
  );
}

export type StagesCollection = ReturnType<typeof createStagesCollection>;
