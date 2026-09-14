import { Injectable } from "@nestjs/common";
import { asc, eq, inArray } from "drizzle-orm";
import { formSubmissionValues, leadFormFieldOptions, leadFormFields, type SparkDb } from "@spark/db";
import type { LeadFormField, OrgId } from "@spark/core";

/**
 * O desenho de um formulário e as respostas dadas a ele, em linha (ADR-0035).
 *
 * Tudo aqui roda **dentro da transação de quem salvou** — o formulário ou o
 * envio — para que o relacional e o jsonb que ainda existe nunca discordem.
 */
@Injectable()
export class LeadFormFieldsRepository {
  /** Substitui o desenho inteiro do formulário: apaga os campos e regrava. */
  async replaceFields(tx: SparkDb, orgId: OrgId, formId: string, fields: readonly LeadFormField[]): Promise<void> {
    await tx.delete(leadFormFields).where(eq(leadFormFields.formId, formId));
    if (fields.length === 0) return;

    const rows = await tx.insert(leadFormFields).values(fields.map((field, index) => ({
      orgId,
      formId,
      key: field.id,
      label: field.label,
      type: field.type,
      mapping: field.mapping,
      required: field.required,
      sortOrder: index,
    }))).returning({ id: leadFormFields.id, key: leadFormFields.key });

    const idByKey = new Map(rows.map((row) => [row.key, row.id]));
    const options = fields.flatMap((field) =>
      field.options.map((value, index) => {
        const fieldId = idByKey.get(field.id);
        return fieldId === undefined ? null : { orgId, fieldId, value, label: value, sortOrder: index };
      }).filter((option): option is { orgId: OrgId; fieldId: string; value: string; label: string; sortOrder: number } => option !== null),
    );
    if (options.length > 0) await tx.insert(leadFormFieldOptions).values(options).onConflictDoNothing();
  }

  /** O desenho de um formulário, na ordem em que os campos aparecem. */
  async fieldsOf(tx: SparkDb, formId: string): Promise<LeadFormField[]> {
    const rows = await tx.select().from(leadFormFields)
      .where(eq(leadFormFields.formId, formId))
      .orderBy(asc(leadFormFields.sortOrder));
    if (rows.length === 0) return [];

    const options = await tx.select().from(leadFormFieldOptions)
      .where(inArray(leadFormFieldOptions.fieldId, rows.map((row) => row.id)))
      .orderBy(asc(leadFormFieldOptions.sortOrder));

    return rows.map((row) => ({
      id: row.key,
      label: row.label,
      type: row.type,
      mapping: row.mapping,
      required: row.required,
      options: options.filter((option) => option.fieldId === row.id).map((option) => option.value),
    } as LeadFormField));
  }

  /**
   * Grava as respostas de um envio, cada tipo na sua coluna. Quando o campo
   * ainda existe no formulário a resposta aponta para ele; quando não existe
   * mais, `fieldKey` preserva o que foi perguntado.
   */
  async writeSubmissionValues(
    tx: SparkDb,
    orgId: OrgId,
    submissionId: string,
    formId: string,
    values: Record<string, string | boolean>,
  ): Promise<void> {
    const entries = Object.entries(values);
    if (entries.length === 0) return;

    const fields = await tx.select({ id: leadFormFields.id, key: leadFormFields.key })
      .from(leadFormFields).where(eq(leadFormFields.formId, formId));
    const idByKey = new Map(fields.map((field) => [field.key, field.id]));

    await tx.insert(formSubmissionValues).values(entries.map(([key, value]) => ({
      orgId,
      submissionId,
      fieldId: idByKey.get(key) ?? null,
      fieldKey: key,
      valueText: typeof value === "string" ? value : null,
      valueBoolean: typeof value === "boolean" ? value : null,
    }))).onConflictDoNothing();
  }
}
