import { useState } from "react";
import { useParams } from "react-router";
import { SaveServiceConfigurationSchema, ServiceCategorySchema, ServiceStatusSchema, ServiceLevelSchema, PriorityMatrixSchema, SlaPolicySchema, serviceCategoryPath, selectServiceSla, type SaveServiceConfiguration, type ServiceConfiguration } from "@spark/core";
import { ActionModal, Alert, Button, Checkbox, Chip, CollectionToolbar, ColorPicker, DataTable, Field, Input, Label, PageFrame, PageHeader, SearchField, Select, Text, type TableColumn } from "@spark/ui-web";
import { requireCapability } from "../lib/route-access.client";
import { getSession } from "../lib/auth.client";
import { getServiceCategoriesCollection, getServiceStatusesCollection, getServiceLevelsCollection, getPriorityMatrixCollection, getSlaPoliciesCollection, preloadServiceConfiguration, useServiceConfiguration } from "../lib/service-configuration.client";
import styles from "./settings.module.css";
const TITLES: Record<string, string> = { catalog: "Catálogo de serviços", statuses: "Status do atendimento", priorities: "Impacto, urgência e prioridade", matrix: "Matriz de prioridade", sla: "Políticas de SLA" };
const LEVEL_LABELS = { impact: "Impacto", urgency: "Urgência", priority: "Prioridade" };
export async function clientLoader() { await requireCapability("settings:manage"); void preloadServiceConfiguration(); return null; }
export default function AdminService() {
  const { section = "catalog" } = useParams();
  const config = useServiceConfiguration();
  const [draft, setDraft] = useState<SaveServiceConfiguration | null>(null);
  const [query, setQuery] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [simulationCategory, setSimulationCategory] = useState<string | null>(null);
  const [simulationPriority, setSimulationPriority] = useState<string | null>(null);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [savingPair, setSavingPair] = useState<string | null>(null);
  const title = TITLES[section] ?? "Atendimento";
  const namedBase = { id: crypto.randomUUID(), name: "", sortOrder: 0, archived: false };
  function create() {
    if (section === "catalog") setDraft({ ...namedBase, kind: "category", parentId });
    if (section === "statuses") setDraft({ ...namedBase, kind: "status", color: "neutral", operationalType: "active", pauseFirstResponse: false, pauseTotal: false, resumeOnInbound: false, budgetMinutes: null });
    if (section === "priorities") setDraft({ ...namedBase, kind: "level", levelKind: "impact", color: "neutral" });
    if (section === "sla") setDraft({ ...namedBase, kind: "policy", categoryId: null, priorityId: null, firstResponseMinutes: 60, totalMinutes: 480, warningPercent: 80 });
  }
  const search = query.trim().toLocaleLowerCase("pt-BR");
  const visible = <T extends { name: string; archived: boolean }>(rows: readonly T[]) => rows.filter(row => (showArchived || !row.archived) && row.name.toLocaleLowerCase("pt-BR").includes(search));
  const path = serviceCategoryPath(parentId, config.categories);
  const chosenPolicy = selectServiceSla(simulationCategory, simulationPriority, config);
  const nameFor = (id: string | null, rows: readonly { id: string; name: string }[], empty = "Todas") => rows.find(row => row.id === id)?.name ?? empty;
  const edit = (input: unknown) => setDraft(SaveServiceConfigurationSchema.parse(input));
  const categoryRows = visible(config.categories.filter(row => search ? true : row.parentId === parentId));
  const categoryColumns: TableColumn<(typeof config.categories)[number]>[] = [
    { id: "name", label: "Categoria", cell: row => <Button variant="ghost" onClick={() => setParentId(row.id)}>{row.name}</Button> },
    { id: "path", label: "Caminho", cell: row => serviceCategoryPath(row.id, config.categories).map(item => item.name).join(" → ") },
    { id: "children", label: "Subcategorias", cell: row => config.categories.filter(c => c.parentId === row.id && !c.archived).length },
    { id: "state", label: "Estado", cell: row => row.archived ? "Arquivada" : "Ativa" },
  ];
  const statusColumns: TableColumn<(typeof config.statuses)[number]>[] = [
    { id: "name", label: "Status", cell: row => row.name },
    { id: "type", label: "Tipo", cell: row => ({ active: "Ativo", waiting: "Espera", closed: "Encerrado" })[row.operationalType] },
    { id: "first", label: "Primeira resposta", cell: row => row.pauseFirstResponse ? "Pausa" : "Conta" },
    { id: "total", label: "Atendimento total", cell: row => row.pauseTotal ? "Pausa" : "Conta" },
    { id: "budget", label: "Prazo no status", cell: row => row.budgetMinutes ? `${row.budgetMinutes} min úteis` : "Sem prazo" },
  ];
  const levelColumns: TableColumn<(typeof config.levels)[number]>[] = [{ id: "name", label: "Nome", cell: row => row.name },{ id: "kind", label: "Dimensão", cell: row => LEVEL_LABELS[row.kind] },{ id: "order", label: "Ordem", cell: row => row.sortOrder }];
  const policyColumns: TableColumn<(typeof config.policies)[number]>[] = [
    { id: "name", label: "Política", cell: row => row.name },
    { id: "category", label: "Categoria", cell: row => row.categoryId ? serviceCategoryPath(row.categoryId, config.categories).map(c => c.name).join(" → ") : "Geral" },
    { id: "priority", label: "Prioridade", cell: row => nameFor(row.priorityId, config.levels) },
    { id: "first", label: "Primeira resposta", cell: row => `${row.firstResponseMinutes} min úteis` },
    { id: "total", label: "Atendimento total", cell: row => `${row.totalMinutes} min úteis` },
    { id: "version", label: "Versão", cell: row => row.version },
  ];
  const impacts = config.levels.filter(l => l.kind === "impact" && !l.archived);
  const urgencies = config.levels.filter(l => l.kind === "urgency" && !l.archived);
  const priorities = config.levels.filter(l => l.kind === "priority" && !l.archived);
  const missingPairs = impacts.flatMap(i => urgencies.filter(u => !config.matrix.some(m => m.impactId === i.id && m.urgencyId === u.id && priorities.some(p => p.id === m.priorityId))));
  const matrixColumns: TableColumn<(typeof impacts)[number]>[] = [{ id: "impact", label: "Impacto / Urgência", cell: row => row.name }, ...urgencies.map(u => ({ id: u.id, label: u.name, cell: (impact: (typeof impacts)[number]) => {
    const existing = config.matrix.find(m => m.impactId === impact.id && m.urgencyId === u.id);
    return <Select label={`Prioridade: ${impact.name} × ${u.name}`} disabled={savingPair !== null} value={existing?.priorityId ?? null} placeholder="Definir prioridade" options={priorities.map(p => ({ value: p.id, label: p.name }))} onValueChange={value => { if (!value) return; setSavingPair(`${impact.id}:${u.id}`); setMatrixError(null); void saveConfiguration({ kind: "matrix", id: existing?.id ?? crypto.randomUUID(), impactId: impact.id, urgencyId: u.id, priorityId: value }, config).catch(error => setMatrixError(error instanceof Error ? error.message : "Não foi possível salvar.")).finally(() => setSavingPair(null)); }} />;
  } }))];
  return <PageFrame className={styles.page}>
    <PageHeader eyebrow="Atendimento" title={title} description={section === "catalog" ? "Organize os serviços comerciais e de suporte em até três níveis." : section === "sla" ? "Prazos em tempo útil. A categoria mais específica vence; dentro dela, a prioridade específica tem preferência." : section === "matrix" ? "Cada combinação de impacto e urgência determina uma prioridade." : "Cadastros configuráveis para os processos da sua equipe."} actions={section !== "matrix" ? <Button onClick={create} disabled={section === "catalog" && path.length >= 3}>Criar {section === "catalog" ? "categoria" : section === "statuses" ? "status" : section === "sla" ? "política" : "nível"}</Button> : undefined} />
    {section !== "matrix" && <CollectionToolbar search={<SearchField label="Pesquisar configurações" value={query} onValueChange={setQuery} />} filters={<Checkbox checked={showArchived} onCheckedChange={setShowArchived}>Mostrar arquivados</Checkbox>} />}
    {section === "catalog" && <><div className={styles.breadcrumb}><Button variant="ghost" onClick={() => setParentId(null)}>Catálogo</Button>{path.map(c => <Button key={c.id} variant="ghost" onClick={() => setParentId(c.id)}>{c.name}</Button>)}</div><DataTable label="Catálogo de serviços" rows={categoryRows} columns={categoryColumns} rowKey={row => row.id} state={config.isLoading ? "loading" : "ready"} emptyText="Nenhuma categoria neste nível." actions={row => <Button size="sm" variant="ghost" onClick={() => edit({ ...row, kind: "category" })}>Editar</Button>} /></>}
    {section === "statuses" && <DataTable label="Status de atendimento" rows={visible(config.statuses)} columns={statusColumns} rowKey={row => row.id} emptyText="Crie os status usados pela sua equipe." actions={row => <Button size="sm" variant="ghost" onClick={() => edit({ ...row, kind: "status" })}>Editar</Button>} />}
    {section === "priorities" && <DataTable label="Impactos, urgências e prioridades" rows={visible(config.levels)} columns={levelColumns} rowKey={row => row.id} emptyText="Cadastre os níveis de impacto, urgência e prioridade para montar a matriz." actions={row => <Button size="sm" variant="ghost" onClick={() => edit({ ...row, kind: "level", levelKind: row.kind })}>Editar</Button>} />}
    {section === "matrix" && <>{matrixError && <Alert tone="danger" title="Falha ao salvar">{matrixError}</Alert>}<DataTable label="Matriz de prioridade" rows={impacts} columns={matrixColumns} rowKey={row => row.id} emptyText="Cadastre impactos, urgências e prioridades antes de preencher a matriz." /><Text tone="secondary">{!impacts.length || !urgencies.length || !priorities.length ? "Cadastros necessários ainda não preenchidos." : missingPairs.length ? `${missingPairs.length} combinações sem prioridade. Elas não recebem prioridade automaticamente.` : "Todas as combinações estão configuradas."}</Text></>}
    {section === "sla" && <><DataTable label="Políticas de SLA" rows={visible(config.policies)} columns={policyColumns} rowKey={row => row.id} emptyText="Crie uma política geral ou específica por categoria e prioridade." actions={row => <Button size="sm" variant="ghost" onClick={() => edit({ ...row, kind: "policy" })}>Editar</Button>} /><PageHeader title="Simular seleção" /><CategorySelectors value={simulationCategory} onChange={setSimulationCategory} config={config} /><Select label="Prioridade da simulação" value={simulationPriority ?? ""} options={[{ value: "", label: "Não definida" }, ...priorities.map(p => ({ value: p.id, label: p.name }))]} onValueChange={value => setSimulationPriority(value || null)} /><Chip>{chosenPolicy ? `Política selecionada: ${chosenPolicy.name}` : "Sem política de SLA"}</Chip><Alert tone="info" title="Consumo preservado">Mudar categoria, prioridade ou status não reinicia o prazo. Um atendimento encerrado conserva o resultado; a reabertura inicia outro ciclo.</Alert></>}
    {draft && <ConfigurationEditor key={draft.id} initial={draft} config={config} onClose={() => setDraft(null)} />}
  </PageFrame>;
}
export function CategorySelectors({ value, onChange, config }: { value: string | null; onChange: (value: string | null) => void; config: Pick<ServiceConfiguration, "categories"> }) {
  const path = serviceCategoryPath(value, config.categories);
  return <div className={styles.form}>{[0, 1, 2].map(depth => {
    const parent = depth === 0 ? null : path[depth - 1]?.id;
    if (parent === undefined) return null;
    return <Select key={depth} label={`Categoria de nível ${depth + 1}`} value={path[depth]?.id ?? ""} options={[{ value: "", label: depth === 0 ? "Geral / todas as categorias" : `Todas as categorias de nível ${depth + 1}` }, ...config.categories.filter(c => !c.archived && c.parentId === parent).map(c => ({ value: c.id, label: c.name }))]} onValueChange={id => onChange(id || parent)} />;
  })}</div>;
}
function ConfigurationEditor({ initial, config, onClose }: { initial: SaveServiceConfiguration; config: ServiceConfiguration; onClose: () => void }) {
  const [draft, setDraft] = useState(initial);
  return <ActionModal open onOpenChange={open => { if (!open) onClose(); }} title="Configurar atendimento" confirmLabel="Salvar" onConfirm={() => saveConfiguration(SaveServiceConfigurationSchema.parse(draft), config)}><div className={styles.form}>
    {draft.kind !== "matrix" && <><Field><Label>Nome</Label><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field><Field><Label>Ordem</Label><Input type="number" min="0" value={draft.sortOrder} onChange={e => setDraft({ ...draft, sortOrder: Number(e.target.value) })} /></Field><Checkbox checked={draft.archived} onCheckedChange={archived => setDraft({ ...draft, archived })}>Arquivado</Checkbox></>}
    {draft.kind === "category" && <Select label="Categoria principal" value={draft.parentId ?? ""} options={[{ value: "", label: "Raiz (primeiro nível)" }, ...config.categories.filter(c => !c.archived && c.id !== draft.id && serviceCategoryPath(c.id, config.categories).length < 3 && !serviceCategoryPath(c.id, config.categories).some(p => p.id === draft.id)).map(c => ({ value: c.id, label: serviceCategoryPath(c.id, config.categories).map(p => p.name).join(" → ") }))]} onValueChange={id => setDraft({ ...draft, parentId: id || null })} />}
    {draft.kind === "level" && <Select label="Dimensão" value={draft.levelKind} options={Object.entries(LEVEL_LABELS).map(([value,label]) => ({ value,label }))} onValueChange={value => { if (value === "impact" || value === "urgency" || value === "priority") setDraft({ ...draft, levelKind: value }); }} />}
    {(draft.kind === "level" || draft.kind === "status") && <ColorPicker label="Cor" value={draft.color} onValueChange={color => setDraft({ ...draft, color })} />}
    {draft.kind === "status" && <><Select label="Tipo operacional" value={draft.operationalType} options={[{ value: "active", label: "Ativo" },{ value: "waiting", label: "Em espera" },{ value: "closed", label: "Encerrado" }]} onValueChange={value => { if (value === "active" || value === "waiting" || value === "closed") setDraft({ ...draft, operationalType: value }); }} /><Checkbox checked={draft.pauseFirstResponse} onCheckedChange={pauseFirstResponse => setDraft({ ...draft, pauseFirstResponse })}>Pausar primeira resposta</Checkbox><Checkbox checked={draft.pauseTotal} onCheckedChange={pauseTotal => setDraft({ ...draft, pauseTotal })}>Pausar atendimento total</Checkbox><Checkbox checked={draft.resumeOnInbound} onCheckedChange={resumeOnInbound => setDraft({ ...draft, resumeOnInbound })}>Retomar atendimento quando o cliente responder</Checkbox><Field><Label>Prazo acumulado neste status (minutos úteis)</Label><Input type="number" min="1" value={draft.budgetMinutes ?? ""} onChange={e => setDraft({ ...draft, budgetMinutes: e.target.value ? Number(e.target.value) : null })} /></Field></>}
    {draft.kind === "policy" && <><CategorySelectors value={draft.categoryId} onChange={categoryId => setDraft({ ...draft, categoryId })} config={config} /><Select label="Prioridade" value={draft.priorityId ?? ""} options={[{ value: "", label: "Todas as prioridades" }, ...config.levels.filter(l => l.kind === "priority" && !l.archived).map(l => ({ value: l.id, label: l.name }))]} onValueChange={value => setDraft({ ...draft, priorityId: value || null })} /><Field><Label>Primeira resposta (minutos úteis)</Label><Input type="number" min="1" value={draft.firstResponseMinutes} onChange={e => setDraft({ ...draft, firstResponseMinutes: Number(e.target.value) })} /></Field><Field><Label>Atendimento total (minutos úteis)</Label><Input type="number" min="1" value={draft.totalMinutes} onChange={e => setDraft({ ...draft, totalMinutes: Number(e.target.value) })} /></Field><Field><Label>Alerta ao consumir (%)</Label><Input type="number" min="1" max="99" value={draft.warningPercent} onChange={e => setDraft({ ...draft, warningPercent: Number(e.target.value) })} /></Field><Text size="pequeno" tone="secondary">Usa o calendário útil da organização. Alterações da política valem para novos ciclos; os já iniciados preservam seus compromissos.</Text></>}
  </div></ActionModal>;
}
async function saveConfiguration(input: SaveServiceConfiguration, config: ServiceConfiguration) {
  const session = getSession(); if (!session) throw new Error("Entre novamente.");
  const base = { ...input, orgId: session.orgId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  switch (input.kind) {
    case "category": { const row = ServiceCategorySchema.parse(base); const c = getServiceCategoriesCollection(); if (config.categories.some(r => r.id === row.id)) await c.update(row.id, d => { Object.assign(d, row); }).isPersisted.promise; else await c.insert(row).isPersisted.promise; break; }
    case "status": { const row = ServiceStatusSchema.parse(base); const c = getServiceStatusesCollection(); if (config.statuses.some(r => r.id === row.id)) await c.update(row.id, d => { Object.assign(d, row); }).isPersisted.promise; else await c.insert(row).isPersisted.promise; break; }
    case "level": { const row = ServiceLevelSchema.parse({ ...base, kind: input.levelKind }); const c = getServiceLevelsCollection(); if (config.levels.some(r => r.id === row.id)) await c.update(row.id, d => { Object.assign(d, row); }).isPersisted.promise; else await c.insert(row).isPersisted.promise; break; }
    case "matrix": { const row = PriorityMatrixSchema.parse(base); const c = getPriorityMatrixCollection(); if (config.matrix.some(r => r.id === row.id)) await c.update(row.id, d => { Object.assign(d, row); }).isPersisted.promise; else await c.insert(row).isPersisted.promise; break; }
    case "policy": { const row = SlaPolicySchema.parse({ ...base, version: (config.policies.find(r => r.id === input.id)?.version ?? 0) + 1 }); const c = getSlaPoliciesCollection(); if (config.policies.some(r => r.id === row.id)) await c.update(row.id, d => { Object.assign(d, row); }).isPersisted.promise; else await c.insert(row).isPersisted.promise; break; }
  }
}
