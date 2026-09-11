import { createCompaniesCollection, type CompaniesCollection } from "@spark/data";

let companies: CompaniesCollection | undefined;
export function getCompaniesCollection(): CompaniesCollection {
  companies ??= createCompaniesCollection();
  return companies;
}
