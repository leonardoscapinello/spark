/**
 * Singletons por sessão de navegador, mesmo motivo de
 * contacts-collection.client.ts — criados sob demanda, nunca no import do
 * módulo (as três collections leem base URL/token na hora da chamada).
 */
import { createPipelinesCollection, createStagesCollection, createDealsCollection } from "@spark/data";
import type { PipelinesCollection, StagesCollection, DealsCollection } from "@spark/data";

let pipelines: PipelinesCollection | undefined;
let stages: StagesCollection | undefined;
let deals: DealsCollection | undefined;

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
