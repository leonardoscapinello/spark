import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { FormSubmissionSchema, LeadFormFieldOptionSchema, LeadFormFieldRowSchema, LeadFormSchema } from "@spark/core";
import { sparkShapeOptions } from "./shape-options.js";
export function createLeadFormsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "lead_forms", schema: LeadFormSchema, getKey: (item) => item.id, shapeOptions: sparkShapeOptions("lead_forms") })); }
export function createFormSubmissionsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "form_submissions", schema: FormSubmissionSchema, getKey: (item) => item.id, shapeOptions: sparkShapeOptions("form_submissions") })); }
/* O desenho do formulário é linha (ADR-0035); a tela junta campo e opções. */
export function createLeadFormFieldsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "lead_form_fields", schema: LeadFormFieldRowSchema, getKey: (item) => item.id, shapeOptions: sparkShapeOptions("lead_form_fields") })); }
export function createLeadFormFieldOptionsCollection() { return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS, id: "lead_form_field_options", schema: LeadFormFieldOptionSchema, getKey: (item) => item.id, shapeOptions: sparkShapeOptions("lead_form_field_options") })); }
export type LeadFormFieldsCollection = ReturnType<typeof createLeadFormFieldsCollection>; export type LeadFormFieldOptionsCollection = ReturnType<typeof createLeadFormFieldOptionsCollection>;
export type LeadFormsCollection = ReturnType<typeof createLeadFormsCollection>; export type FormSubmissionsCollection = ReturnType<typeof createFormSubmissionsCollection>;
