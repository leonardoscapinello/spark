import { createCustomFieldOptionsCollection, createCustomFieldValuesCollection, type CustomFieldOptionsCollection, type CustomFieldValuesCollection } from "@spark/data";
let options: CustomFieldOptionsCollection | undefined;
let values: CustomFieldValuesCollection | undefined;
export function getCustomFieldOptionsCollection(): CustomFieldOptionsCollection { options ??= createCustomFieldOptionsCollection(); return options; }
export function getCustomFieldValuesCollection(): CustomFieldValuesCollection { values ??= createCustomFieldValuesCollection(); return values; }
