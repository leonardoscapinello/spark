import { useLiveQuery } from "@tanstack/react-db";
import { createServiceCategoriesCollection, createServiceStatusesCollection, createServiceLevelsCollection, createPriorityMatrixCollection, createSlaPoliciesCollection } from "@spark/data";
let serviceCategories: ReturnType<typeof createServiceCategoriesCollection> | undefined;
export function getServiceCategoriesCollection() { return serviceCategories ??= createServiceCategoriesCollection(); }
let serviceStatuses: ReturnType<typeof createServiceStatusesCollection> | undefined;
export function getServiceStatusesCollection() { return serviceStatuses ??= createServiceStatusesCollection(); }
let serviceLevels: ReturnType<typeof createServiceLevelsCollection> | undefined;
export function getServiceLevelsCollection() { return serviceLevels ??= createServiceLevelsCollection(); }
let priorityMatrix: ReturnType<typeof createPriorityMatrixCollection> | undefined;
export function getPriorityMatrixCollection() { return priorityMatrix ??= createPriorityMatrixCollection(); }
let slaPolicies: ReturnType<typeof createSlaPoliciesCollection> | undefined;
export function getSlaPoliciesCollection() { return slaPolicies ??= createSlaPoliciesCollection(); }
export function preloadServiceConfiguration() { return Promise.allSettled([getServiceCategoriesCollection().preload(), getServiceStatusesCollection().preload(), getServiceLevelsCollection().preload(), getPriorityMatrixCollection().preload(), getSlaPoliciesCollection().preload()]); }
export function useServiceConfiguration() {
  const { data: categories = [], isLoading } = useLiveQuery({ query: q => q.from({ row: getServiceCategoriesCollection() }).orderBy(({ row }) => row.sortOrder, "asc") });
  const { data: statuses = [] } = useLiveQuery({ query: q => q.from({ row: getServiceStatusesCollection() }).orderBy(({ row }) => row.sortOrder, "asc") });
  const { data: levels = [] } = useLiveQuery({ query: q => q.from({ row: getServiceLevelsCollection() }).orderBy(({ row }) => row.sortOrder, "asc") });
  const { data: matrix = [] } = useLiveQuery({ query: q => q.from({ row: getPriorityMatrixCollection() }) });
  const { data: policies = [] } = useLiveQuery({ query: q => q.from({ row: getSlaPoliciesCollection() }) });
  return { categories, statuses, levels, matrix, policies, isLoading };
}
