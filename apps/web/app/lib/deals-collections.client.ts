/**
 * Singletons por sessão de navegador, mesmo motivo de
 * contacts-collection.client.ts — criados sob demanda, nunca no import do
 * módulo (as três collections leem base URL/token na hora da chamada).
 */
import { createPipelinesCollection, createStagesCollection, createDealsCollection } from "@spark/data";
import type { PipelinesCollection, StagesCollection, DealsCollection } from "@spark/data";
import type { DealStatus, PipelineId } from "@spark/core";

let pipelines: PipelinesCollection | undefined;
let stages: StagesCollection | undefined;
let deals: DealsCollection | undefined;
const boardDeals = new Map<string, DealsCollection>();

export function getPipelinesCollection(): PipelinesCollection {
  pipelines ??= createPipelinesCollection();
  return pipelines;
}

export function getStagesCollection(): StagesCollection {
  stages ??= createStagesCollection();
  return stages;
}

export function getDealsCollection(): DealsCollection {
  deals ??= createDealsCollection();
  return deals;
}

/** Um shape por visão do quadro: nunca baixa negócios de outros funis/estados. */
export function getBoardDealsCollection(pipelineId: PipelineId, status: DealStatus | "all"): DealsCollection {
  const key = `${pipelineId}:${status}`;
  let collection = boardDeals.get(key);
  if (!collection) {
    collection = createDealsCollection({ pipelineId, status, collectionId: `deals-board-${key}` });
    boardDeals.set(key, collection);
  }
  return collection;
}
