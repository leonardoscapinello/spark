import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
/**
 * Local-first stages collection — same pattern as contacts-collection.ts
 * (docs/adr/0018, docs/adr/0026).
 */
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { StageSchema, stageId, type Stage, type CreateStageInput, type OrgId } from "@spark/core";
import { stagesControllerArchive, stagesControllerCreate, stagesControllerRename, stagesControllerReorder } from "@spark/api-client";
import { confirmed } from "./confirmed.js";
import { sparkShapeOptions } from "./shape-options.js";

export function optimisticStage(input: Omit<CreateStageInput, "id">, orgId: OrgId): Stage {
  const now = new Date().toISOString();
  return {
    id: stageId.create(),
    orgId,
    pipelineId: input.pipelineId,
    name: input.name,
    sortOrder: input.sortOrder,
    probability: input.probability ?? 0,
    slaMinutes: input.slaMinutes ?? null,
    allowWon: input.allowWon ?? true,
    allowLost: input.allowLost ?? true,
    restrictTransitions: input.restrictTransitions ?? false,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
}

export function createStagesCollection() {
  return createCollection(
    electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "stages",
      schema: StageSchema,
      getKey: (stage) => stage.id,
      shapeOptions: sparkShapeOptions("stages"),
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
          slaMinutes: stage.slaMinutes,
          allowWon: stage.allowWon,
          allowLost: stage.allowLost,
          restrictTransitions: stage.restrictTransitions,
        });

        return confirmed(response);
      },
      onUpdate: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onUpdate called with no pending mutation.");

        const changedFields = Object.keys(mutation.changes);
        // Uma mutação sincronizada é uma só decisão por vez — nome OU
        // arquivar, nunca os dois juntos. Mistura escondida numa única
        // chamada dificultaria dizer, depois, qual ação realmente aconteceu.
        if (changedFields.length === 1 && changedFields[0] === "name") {
          const response = await stagesControllerRename(mutation.original.id, { name: mutation.modified.name });
          return confirmed(response);
        }
        if (changedFields.length === 1 && changedFields[0] === "archivedAt") {
          const response = await stagesControllerArchive(mutation.original.id, { archived: mutation.modified.archivedAt !== null });
          return confirmed(response);
        }
        throw new Error(
          `Only renaming or archiving a stage is possible today — changed field(s): ${changedFields.join(", ")}.`,
        );
      },
    }),
  );
}

export type StagesCollection = ReturnType<typeof createStagesCollection>;

/**
 * Reordena todo o funil numa chamada — fora do caminho de mutação da
 * coleção de propósito. `onUpdate` decide uma etapa por vez; arrastar uma
 * etapa desloca todas as outras entre a origem e o destino, e mandar isso
 * como N mutações otimistas separadas arriscaria o quadro passar por uma
 * posição inconsistente entre a primeira confirmar e a última falhar.
 */
export async function reorderStages(pipelineId: string, orderedIds: readonly string[]): Promise<void> {
  await stagesControllerReorder({ pipelineId, orderedIds: [...orderedIds] });
}
