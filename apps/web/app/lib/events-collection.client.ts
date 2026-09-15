import { createEventsCollection, type EventsCollection } from "@spark/data";
import type { CompanyId, ContactId, DealId } from "@spark/core";

const collections = new Map<string, EventsCollection>();

function scoped(key: string, scope: Parameters<typeof createEventsCollection>[0]): EventsCollection {
  let collection = collections.get(key);
  if (!collection) {
    collection = createEventsCollection({ ...scope, collectionId: `events:${key}` });
    collections.set(key, collection);
  }
  return collection;
}

export const getDealEventsCollection = (id: DealId) => scoped(`deal:${id}`, { dealId: id });
export const getContactEventsCollection = (id: ContactId) => scoped(`contact:${id}`, { contactId: id });
export const getCompanyEventsCollection = (id: CompanyId) => scoped(`company:${id}`, { companyId: id });
