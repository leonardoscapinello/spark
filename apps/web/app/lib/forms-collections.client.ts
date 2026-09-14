import { useMemo } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import {
  createFormSubmissionsCollection,
  createLeadFormFieldOptionsCollection,
  createLeadFormFieldsCollection,
  createLeadFormsCollection,
  type FormSubmissionsCollection,
  type LeadFormFieldOptionsCollection,
  type LeadFormFieldsCollection,
  type LeadFormsCollection,
} from "@spark/data";
import type { LeadFormField } from "@spark/core";

let forms: LeadFormsCollection | undefined;
let submissions: FormSubmissionsCollection | undefined;
let fields: LeadFormFieldsCollection | undefined;
let fieldOptions: LeadFormFieldOptionsCollection | undefined;

export function getLeadFormsCollection(): LeadFormsCollection { forms ??= createLeadFormsCollection(); return forms; }
export function getFormSubmissionsCollection(): FormSubmissionsCollection { submissions ??= createFormSubmissionsCollection(); return submissions; }
export function getLeadFormFieldsCollection(): LeadFormFieldsCollection { fields ??= createLeadFormFieldsCollection(); return fields; }
export function getLeadFormFieldOptionsCollection(): LeadFormFieldOptionsCollection { fieldOptions ??= createLeadFormFieldOptionsCollection(); return fieldOptions; }

/**
 * O desenho de um formulário, montado das tabelas (ADR-0035) no formato que o
 * editor e a visualização já usam.
 */
export function useLeadFormFields(formId: string | undefined): LeadFormField[] {
  const { data: rows = [] } = useLiveQuery({ query: (q) => q.from({ field: getLeadFormFieldsCollection() }) });
  const { data: options = [] } = useLiveQuery({ query: (q) => q.from({ option: getLeadFormFieldOptionsCollection() }) });

  return useMemo(() => {
    if (!formId) return [];
    return rows
      .filter((row) => row.formId === formId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((row) => ({
        id: row.key,
        label: row.label,
        type: row.type,
        mapping: row.mapping,
        required: row.required,
        options: options
          .filter((option) => option.fieldId === row.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((option) => option.value),
      }));
  }, [formId, options, rows]);
}
