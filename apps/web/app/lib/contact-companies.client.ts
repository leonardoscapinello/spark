import { createContactCompaniesCollection } from "@spark/data";
let collection: ReturnType<typeof createContactCompaniesCollection> | undefined;
export function getContactCompaniesCollection() { return collection ??= createContactCompaniesCollection(); }
