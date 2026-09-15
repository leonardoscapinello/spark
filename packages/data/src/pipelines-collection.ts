import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
/**
 * Local-first pipelines collection — same pattern as contacts-collection.ts
 * (docs/adr/0018, docs/adr/0026).
 */
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { PipelineSchema, pipelineId, type Pipeline, type CreatePipelineInput, type OrgId } from "@spark/core";
import { pipelinesControllerCreate } from "@spark/api-client";
import { confirmed } from "./confirmed.js";
import { sparkShapeOptions } from "./shape-options.js";

export function optimisticPipeline(input: Omit<CreatePipelineInput, "id">, orgId: OrgId): Pipeline {
  const now = new Date().toISOString();
  return {
    id: pipelineId.create(),
    orgId,
    name: input.name,
    isDefault: input.isDefault ?? false,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
}

export function createPipelinesCollection() {
  return createCollection(
    electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "pipelines",
      schema: PipelineSchema,
      getKey: (pipeline) => pipeline.id,
      shapeOptions: sparkShapeOptions("pipelines"),
      onInsert: async ({ transaction }) => {
        const mutation = transaction.mutations[0];
        if (!mutation) throw new Error("onInsert called with no pending mutation.");
        const pipeline = mutation.modified;

        const response = await pipelinesControllerCreate({
          id: pipeline.id,
          name: pipeline.name,
          isDefault: pipeline.isDefault,
        });

        return confirmed(response);
      },
    }),
  );
}

export type PipelinesCollection = ReturnType<typeof createPipelinesCollection>;
