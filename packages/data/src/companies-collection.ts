import { INACTIVE_COLLECTION_GC_MS } from "./collection-lifecycle.js";
import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { CompanySchema, companyId, type Company, type CreateCompanyInput, type OrgId } from "@spark/core";
import { companiesControllerArchive, companiesControllerCreate, companiesControllerUpdate } from "@spark/api-client";
import { confirmed } from "./confirmed.js";
import { serializedWrite } from "./serialized-write.js";
import { sparkShapeOptions } from "./shape-options.js";

export function optimisticCompany(input: Omit<CreateCompanyInput, "id">, orgId: OrgId): Company {
  const now = new Date().toISOString();
  return {
    id: companyId.create(), orgId,
    parentCompanyId: input.parentCompanyId ?? null,
    ownerId: input.ownerId ?? null,
    name: input.name,
    legalName: input.legalName ?? null,
    taxId: input.taxId ?? null,
    website: input.website ?? null,
    industry: input.industry ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    address: input.address ?? null,
    customFields: input.customFields ?? {},
    tags: input.tags ?? [],
    createdAt: now, updatedAt: now, deletedAt: null,
  };
}

export function createCompaniesCollection() {
  return createCollection(electricCollectionOptions({ gcTime: INACTIVE_COLLECTION_GC_MS,
    id: "companies",
    schema: CompanySchema,
    getKey: (company) => company.id,
    shapeOptions: sparkShapeOptions("companies"),
    onInsert: async ({ transaction }) => {
      const company = transaction.mutations[0]?.modified;
      if (!company) throw new Error("onInsert called with no pending mutation.");
      const response = await companiesControllerCreate({
        id: company.id, parentCompanyId: company.parentCompanyId, ownerId: company.ownerId,
        name: company.name, legalName: company.legalName, taxId: company.taxId,
        website: company.website, industry: company.industry, email: company.email,
        phone: company.phone, address: company.address, customFields: company.customFields ?? {}, tags: company.tags ?? [],
      });
      return confirmed(response);
    },
    onUpdate: async ({ transaction }) => {
      const mutation = transaction.mutations[0];
      if (!mutation) throw new Error("onUpdate called with no pending mutation.");
      return serializedWrite(`company:${mutation.original.id}`, async () => {
        const changed = Object.keys(mutation.changes);
        if (changed.length === 1 && changed[0] === "deletedAt") {
          const response = await companiesControllerArchive(mutation.original.id, { archived: mutation.modified.deletedAt !== null });
          return confirmed(response);
        }
        const allowed = new Set(["parentCompanyId", "ownerId", "name", "legalName", "taxId", "website", "industry", "email", "phone", "address", "customFields", "tags"]);
        if (!changed.length || !changed.every((field) => allowed.has(field))) throw new Error(`Unsupported company field(s): ${changed.join(", ")}.`);
        const response = await companiesControllerUpdate(mutation.original.id, {
          ...(changed.includes("parentCompanyId") ? { parentCompanyId: mutation.modified.parentCompanyId } : {}),
          ...(changed.includes("ownerId") ? { ownerId: mutation.modified.ownerId } : {}),
          ...(changed.includes("name") ? { name: mutation.modified.name } : {}),
          ...(changed.includes("legalName") ? { legalName: mutation.modified.legalName } : {}),
          ...(changed.includes("taxId") ? { taxId: mutation.modified.taxId } : {}),
          ...(changed.includes("website") ? { website: mutation.modified.website } : {}),
          ...(changed.includes("industry") ? { industry: mutation.modified.industry } : {}),
          ...(changed.includes("email") ? { email: mutation.modified.email } : {}),
          ...(changed.includes("phone") ? { phone: mutation.modified.phone } : {}),
          ...(changed.includes("address") ? { address: mutation.modified.address } : {}),
          ...(changed.includes("customFields") ? { customFields: mutation.modified.customFields ?? {} } : {}),
          ...(changed.includes("tags") ? { tags: mutation.modified.tags ?? [] } : {}),
        });
        return confirmed(response);
      });
    },
  }));
}

export type CompaniesCollection = ReturnType<typeof createCompaniesCollection>;
