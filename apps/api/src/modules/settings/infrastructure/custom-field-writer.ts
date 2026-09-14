import { Injectable } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { customFieldDefinitions, customFieldOptions, customFieldValues, type SparkDb } from "@spark/db";
import { toCustomFieldRows, type CustomFieldEntity, type OrgId } from "@spark/core";

/**
 * Grava os valores de campo personalizado nas colunas tipadas
 * (`custom_field_values`, ADR-0035).
 *
 * Roda **dentro da transação de quem salvou o registro** — a pessoa, a empresa
 * ou o negócio — para que o dado relacional e a coluna `custom_fields` (ainda
 * presente enquanto a migração termina) nunca fiquem em desacordo.
 *
 * Uma escrita substitui o valor daquele campo por inteiro: apaga o que havia e
 * insere o que veio. É a semântica de «este campo agora vale isto», e é a
 * única que funciona para seleção múltipla, onde um valor são várias linhas.
 */
@Injectable()
export class CustomFieldWriter {
  async write(tx: SparkDb, orgId: OrgId, entityType: CustomFieldEntity, entityId: string, values: Record<string, unknown>): Promise<void> {
    const keys = Object.keys(values);
    if (keys.length === 0) return;

    // O índice único (org_id, entity_type, key) torna a edição inline uma
    // busca pontual. Não carregamos mais todas as definições da organização a
    // cada blur de um único campo.
    const wanted = await tx.select().from(customFieldDefinitions)
      .where(and(
        eq(customFieldDefinitions.orgId, orgId),
        eq(customFieldDefinitions.entityType, entityType),
        inArray(customFieldDefinitions.key, keys),
      ));
    if (wanted.length === 0) return;

    const fieldIds = wanted.map((definition) => definition.id);
    const options = await tx.select().from(customFieldOptions).where(inArray(customFieldOptions.fieldId, fieldIds));

    for (const definition of wanted) {
      const optionsOfField = options.filter((option) => option.fieldId === definition.id);
      const rows = toCustomFieldRows(
        definition,
        values[definition.key],
        (optionValue) => optionsOfField.find((option) => option.value === optionValue)?.id,
      );

      await tx.delete(customFieldValues)
        .where(and(eq(customFieldValues.fieldId, definition.id), eq(customFieldValues.entityId, entityId)));

      if (rows.length === 0) continue;
      await tx.insert(customFieldValues).values(rows.map((row) => ({
        orgId,
        fieldId: definition.id,
        entityType,
        entityId,
        valueText: row.valueText ?? null,
        valueNumber: row.valueNumber === undefined || row.valueNumber === null ? null : String(row.valueNumber),
        valueMoney: row.valueMoney ?? null,
        valueDate: row.valueDate ?? null,
        valueTimestamp: row.valueTimestamp ? new Date(row.valueTimestamp) : null,
        valueBoolean: row.valueBoolean ?? null,
        optionId: row.optionId ?? null,
      })));
    }
  }
}
