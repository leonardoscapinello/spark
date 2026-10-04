import type { ServiceCategory, ServiceLevel, ServiceStatus, PriorityMatrix, SlaPolicy } from "../schema/serviceConfiguration.js";
export interface ServiceConfiguration { categories: readonly ServiceCategory[]; statuses: readonly ServiceStatus[]; levels: readonly ServiceLevel[]; matrix: readonly PriorityMatrix[]; policies: readonly SlaPolicy[] }
/** A classificação é um caminho de até três ancestrais; referências quebradas nunca viram escopo geral. */
export function serviceCategoryPath(id: string | null, categories: readonly ServiceCategory[]): ServiceCategory[] {
  const path: ServiceCategory[] = [];
  let next = id;
  while (next !== null) {
    const category = categories.find(item => item.id === next);
    if (!category || path.some(item => item.id === category.id) || path.length === 3) throw new Error("A categoria deve formar um caminho válido de até três níveis.");
    path.unshift(category); next = category.parentId;
  }
  return path;
}
export function servicePriority(impactId: string | null, urgencyId: string | null, config: Pick<ServiceConfiguration, "levels" | "matrix">): string | null {
  if (!config.levels.some(l => l.id === impactId && l.kind === "impact" && !l.archived) || !config.levels.some(l => l.id === urgencyId && l.kind === "urgency" && !l.archived)) return null;
  const id = config.matrix.find(row => row.impactId === impactId && row.urgencyId === urgencyId)?.priorityId;
  return config.levels.find(l => l.id === id && l.kind === "priority" && !l.archived)?.id ?? null;
}
export function selectServiceSla(categoryId: string | null, priorityId: string | null, config: Pick<ServiceConfiguration, "categories" | "policies">): SlaPolicy | null {
  const path = serviceCategoryPath(categoryId, config.categories);
  for (const scope of [...path].reverse().map(c => c.id).concat([""])) {
    const matches = config.policies.filter(p => !p.archived && p.categoryId === (scope || null));
    const exact = priorityId ? matches.find(p => p.priorityId === priorityId) : undefined;
    const chosen = exact ?? matches.find(p => p.priorityId === null);
    if (chosen) return chosen;
  }
  return null;
}
export function validateServiceConfiguration(config: ServiceConfiguration): void {
  for (const category of config.categories) {
    const path = serviceCategoryPath(category.id, config.categories);
    if (!category.archived && path.some(p => p.archived)) throw new Error("Arquive as categorias filhas antes de arquivar a categoria principal.");
  }
  for (const row of config.matrix) {
    for (const [id, kind] of [[row.impactId, "impact"], [row.urgencyId, "urgency"], [row.priorityId, "priority"]]) {
      if (!config.levels.some(l => l.id === id && l.kind === kind)) throw new Error("A matriz deve usar impacto, urgência e prioridade da organização.");
    }
  }
  const pairs = new Set<string>();
  for (const row of config.matrix) {
    const pair = `${row.impactId}:${row.urgencyId}`;
    if (pairs.has(pair)) throw new Error("Já existe uma prioridade para esse impacto e urgência.");
    pairs.add(pair);
  }
  const scopes = new Set<string>();
  for (const policy of config.policies.filter(p => !p.archived)) {
    if (policy.categoryId && (!serviceCategoryPath(policy.categoryId, config.categories).length || serviceCategoryPath(policy.categoryId, config.categories).some(c => c.archived))) throw new Error("Escolha uma categoria ativa.");
    if (policy.priorityId && !config.levels.some(l => l.id === policy.priorityId && l.kind === "priority" && !l.archived)) throw new Error("Escolha uma prioridade ativa.");
    const scope = `${policy.categoryId ?? "all"}:${policy.priorityId ?? "all"}`;
    if (scopes.has(scope)) throw new Error("Já existe uma política ativa para essa categoria e prioridade.");
    scopes.add(scope);
  }
}

export function resolveServiceClassification(current: { status: string; serviceStatusId: string | null; categoryId: string | null; impactId: string | null; urgencyId: string | null }, input: { status?: "open" | "snoozed" | "closed" | undefined; serviceStatusId?: string | null | undefined; categoryId?: string | null | undefined; impactId?: string | null | undefined; urgencyId?: string | null | undefined }, config: ServiceConfiguration, inbound = false) {
  const existingStatus = config.statuses.find(s => s.id === current.serviceStatusId);
  let serviceStatusId = input.serviceStatusId === undefined ? current.serviceStatusId : input.serviceStatusId;
  let operational = input.status ?? current.status;
  if (inbound && (current.status === "closed" || existingStatus?.resumeOnInbound || (!existingStatus && current.status === "snoozed"))) operational = "open";
  if (input.serviceStatusId === undefined && operational !== current.status) {
    const target = operational === "closed" ? "closed" : operational === "snoozed" ? "waiting" : "active";
    serviceStatusId = config.statuses.filter(s => !s.archived && s.operationalType === target).sort((a,b) => a.sortOrder-b.sortOrder)[0]?.id ?? null;
  }
  if (!serviceStatusId && current.status !== "closed" && input.serviceStatusId === undefined && input.status === undefined) serviceStatusId = config.statuses.filter(s => !s.archived && s.operationalType === "active").sort((a,b) => a.sortOrder-b.sortOrder)[0]?.id ?? null;
  const status = config.statuses.find(s => s.id === serviceStatusId);
  if (input.serviceStatusId && (!status || status.archived)) throw new Error("Escolha um status ativo da organização.");
  if (status) operational = status.operationalType === "closed" ? "closed" : status.operationalType === "waiting" ? "snoozed" : "open";
  const categoryId = input.categoryId === undefined ? current.categoryId : input.categoryId;
  if (input.categoryId && serviceCategoryPath(input.categoryId, config.categories).some(c => c.archived)) throw new Error("Escolha uma categoria ativa.");
  const impactId = input.impactId === undefined ? current.impactId : input.impactId;
  const urgencyId = input.urgencyId === undefined ? current.urgencyId : input.urgencyId;
  for (const [value,kind] of [[input.impactId,"impact"],[input.urgencyId,"urgency"]]) if (value && !config.levels.some(l => l.id === value && l.kind === kind && !l.archived)) throw new Error("Escolha um nível ativo da organização.");
  const servicePriorityId = servicePriority(impactId,urgencyId,config);
  return { serviceStatusId, categoryId, impactId, urgencyId, servicePriorityId, status: operational === "closed" ? "closed" as const : operational === "snoozed" ? "snoozed" as const : "open" as const, statusDefinition: status ?? null };
}
