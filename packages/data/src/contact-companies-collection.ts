import { registerSessionCollection } from "./session-collections.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { ContactCompanySchema } from "@spark/core";
import { sparkShapeOptions } from "./shape-options.js";
import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
export function createContactCompaniesCollection() {
 return registerSessionCollection(createCollection(electricCollectionOptions({ id: "contact_companies", gcTime: INACTIVE_COLLECTION_GC_MS, schema: ContactCompanySchema, getKey: (item) => item.contactId + ":" + item.companyId, shapeOptions: sparkShapeOptions("contact_companies") })));
}
