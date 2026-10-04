import { createCustomFieldsCollection, createCustomFieldGroupsCollection, type CustomFieldsCollection } from "@spark/data"; let fields: CustomFieldsCollection | undefined; export function getCustomFieldsCollection() { fields ??= createCustomFieldsCollection(); return fields; }

let groups: ReturnType<typeof createCustomFieldGroupsCollection> | undefined; export function getCustomFieldGroupsCollection() { return groups ??= createCustomFieldGroupsCollection(); }
