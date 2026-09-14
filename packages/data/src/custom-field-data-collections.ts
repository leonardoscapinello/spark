import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { CustomFieldOptionSchema, CustomFieldValueSchema } from "@spark/core";
import { sparkShapeOptions } from "./shape-options.js";

/**
 * Opções e valores dos campos personalizados, agora como tabelas (ADR-0035).
 *
 * Só leitura: gravar continua sendo pela API do registro dono do valor — é ela
 * que sabe trocar o valor inteiro de um campo dentro da transação em que a
 * pessoa, a empresa ou o negócio foi salvo.
 */
export function createCustomFieldOptionsCollection() {
  return createCollection(
    electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "custom_field_options",
      schema: CustomFieldOptionSchema,
      getKey: (option) => option.id,
      shapeOptions: sparkShapeOptions("custom_field_options"),
    }),
  );
}

export function createCustomFieldValuesCollection() {
  return createCollection(
    electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
      id: "custom_field_values",
      schema: CustomFieldValueSchema,
      getKey: (value) => value.id,
      shapeOptions: sparkShapeOptions("custom_field_values"),
    }),
  );
}

export type CustomFieldOptionsCollection = ReturnType<typeof createCustomFieldOptionsCollection>;
export type CustomFieldValuesCollection = ReturnType<typeof createCustomFieldValuesCollection>;
