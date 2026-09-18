import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import {
  CompanyRegistrationActivitySchema,
  CompanyRegistrationMemberSchema,
  CompanyRegistrationSchema,
  CompanyRegistrationTaxRegimeSchema,
} from "@spark/core";
import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { sparkShapeOptions } from "./shape-options.js";

/**
 * O cadastro da Receita chega por sincronização, como todo o resto: a tela
 * pede a consulta uma vez pela API e daí em diante lê local (CLAUDE.md, 5).
 *
 * Quatro coleções porque são quatro tabelas — atividade, sócio e regime não
 * cabem numa coluna JSON (ADR-0035), e separadas dá para perguntar «quais
 * empresas deste CNAE» sem varrer documento.
 */
export function createCompanyRegistrationsCollection() {
  return createCollection(electricCollectionOptions({
    gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "company_registrations",
    schema: CompanyRegistrationSchema,
    getKey: (registration) => registration.id,
    shapeOptions: sparkShapeOptions("company_registrations"),
  }));
}
export type CompanyRegistrationsCollection = ReturnType<typeof createCompanyRegistrationsCollection>;

export function createCompanyRegistrationActivitiesCollection() {
  return createCollection(electricCollectionOptions({
    gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "company_registration_activities",
    schema: CompanyRegistrationActivitySchema,
    getKey: (activity) => activity.id,
    shapeOptions: sparkShapeOptions("company_registration_activities"),
  }));
}
export type CompanyRegistrationActivitiesCollection = ReturnType<typeof createCompanyRegistrationActivitiesCollection>;

export function createCompanyRegistrationMembersCollection() {
  return createCollection(electricCollectionOptions({
    gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "company_registration_members",
    schema: CompanyRegistrationMemberSchema,
    getKey: (member) => member.id,
    shapeOptions: sparkShapeOptions("company_registration_members"),
  }));
}
export type CompanyRegistrationMembersCollection = ReturnType<typeof createCompanyRegistrationMembersCollection>;

export function createCompanyRegistrationTaxRegimesCollection() {
  return createCollection(electricCollectionOptions({
    gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "company_registration_tax_regimes",
    schema: CompanyRegistrationTaxRegimeSchema,
    getKey: (regime) => regime.id,
    shapeOptions: sparkShapeOptions("company_registration_tax_regimes"),
  }));
}
export type CompanyRegistrationTaxRegimesCollection = ReturnType<typeof createCompanyRegistrationTaxRegimesCollection>;
