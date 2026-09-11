import { createFormSubmissionsCollection, createLeadFormsCollection, type FormSubmissionsCollection, type LeadFormsCollection } from "@spark/data";
let forms: LeadFormsCollection | undefined; let submissions: FormSubmissionsCollection | undefined;
export function getLeadFormsCollection(): LeadFormsCollection { forms ??= createLeadFormsCollection(); return forms; }
export function getFormSubmissionsCollection(): FormSubmissionsCollection { submissions ??= createFormSubmissionsCollection(); return submissions; }
