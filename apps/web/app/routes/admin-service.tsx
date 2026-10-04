import { CategorySelectors } from "../service/CategorySelectors";
import { useState } from "react";
import { useParams } from "react-router";
import { SaveServiceConfigurationSchema, ServiceCategorySchema, ServiceStatusSchema, ServiceLevelSchema, PriorityMatrixSchema, SlaPolicySchema, serviceCategoryPath, servicePriority, type SaveServiceConfiguration, type ServiceConfiguration } from "@spark/core";
import { ActionModal, Alert, Button, Checkbox, CollectionToolbar, ColorPicker, ClassificationValue, DataTable, Field, Input, Label, PageFrame, PageHeader, SearchField, Select, SectionTitle, Text, Textarea, type TableColumn } from "@spark/ui-web";
import { requireCapability } from "../lib/route-access.client";
import { getSession } from "../lib/auth.client";
import { getServiceCategoriesCollection, getServiceStatusesCollection, getServiceLevelsCollection, getPriorityMatrixCollection, getSlaPoliciesCollection, preloadServiceConfiguration, useServiceConfiguration } from "../lib/service-configuration.client";
import styles from "./settings.module.css";
const TITLES: Record<string, string> = { catalog: "Catálogo de serviços", statuses: "Status do atendimento", priorities: "Níveis de classificação", matrix: "Matriz de prioridade", sla: "SLA" };
const LEVEL_LABELS = { impact: "Impacto", urgency: "Urgência", priority: "Prioridade" };
export async function clientLoader() { await requireCapability("settings:manage"); void preloadServiceConfiguration(); return null; }
export default function AdminService() {
  const { section = "catalog" } = useParams();
  const config = useServiceConfiguration();
  const [draft, setDraft] = useState<SaveServiceConfiguration | null>(null);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [savingPair, setSavingPair] = useState<string | null>(null);
  const title = TITLES[section] ?? "Atendimento";
  const namedBase = { id: crypto.randomUUID(), name: "", sortOrder: 0, archived: false };
  function create() {
    if (section === "catalog") setDraft({ ...namedBase, kind: "category", parentId: null, defaultImpactId: null, defaultUrgencyId: null, sortOrder: Math.max(-1, ...config.categories.filter(c => c.parentId === null).map(c => c.sortOrder)) + 1 });
    if (section === "statuses") setDraft({ ...namedBase, kind: "status", color: "neutral", operationalType: "active", pauseFirstResponse: false, pauseTotal: false, resumeOnInbound: false, budgetMinutes: null });
    if (section === "priorities") setDraft({ ...namedBase, kind: "level", levelKind: "impact", description: "", color: "neutral" });
    if (section === "sla") setDraft({ ...namedBase, kind: "policy", categoryId: null, impactId: null, urgencyId: null, priorityId: null, firstResponseMinutes: 60, totalMinutes: 480, warningPercent: 80 });
  }
  const search = query.trim().toLocaleLowerCase("pt-BR");
  const visible = <T extends { name: string; archived: boolean }>(rows: readonly T[]) => rows.filter(row => (showArchived || !row.archived) && row.name.toLocaleLowerCase("pt-BR").includes(search));
  const nameFor = (id: string | null, rows: readonly { id: string; name: string }[], empty = "Todas") => {
    const level = config.levels.find(row => row.id === id);
    return level ? <ClassificationValue kind={level.kind} color={level.color} label={level.name} /> : rows.find(row => row.id === id)?.name ?? empty;
  };
  const edit = (input: unknown) => setDraft(SaveServiceConfigurationSchema.parse(input));
  const categoryPaths = new Map(config.categories.map(row => [row.id, serviceCategoryPath(row.id, config.categories)]));
  const categoryRows = config.categories.filter(row => (showArchived || !row.archived) && (!search || categoryPaths.get(row.id)?.some(c => c.name.toLocaleLowerCase("pt-BR").includes(search)))).sort((a,b) => {
    const left = categoryPaths.get(a.id) ?? []; const right = categoryPaths.get(b.id) ?? [];
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
      const l = left[i]; const r = right[i];
      if (l && r && l.id !== r.id) return l.sortOrder-r.sortOrder || l.name.localeCompare(r.name, "pt-BR") || l.id.localeCompare(r.id);
    }
    return left.length-right.length;
  });
  const categoryColumns: TableColumn<(typeof config.categories)[number]>[] = [
    ...[0,1,2].map(depth => ({ id: `n${depth+1}`, label: `${depth+1}º nível`, cell: (row: (typeof config.categories)[number]) => categoryPaths.get(row.id)?.[depth]?.name ?? "—" })),
    { id: "impact", label: "Impacto", cell: row => nameFor(row.defaultImpactId, config.levels, "—") },
    { id: "urgency", label: "Urgência", cell: row => nameFor(row.defaultUrgencyId, config.levels, "—") },
    { id: "priority", label: "Prioridade", cell: row => nameFor(servicePriority(row.defaultImpactId, row.defaultUrgencyId, config), config.levels, "—") },
    { id: "state", label: "Estado", cell: row => row.archived ? "Desabilitada" : "Habilitada" },
  ];
  const statusColumns: TableColumn<(typeof config.statuses)[number]>[] = [
    { id: "name", label: "Status", cell: row => row.name },
    { id: "type", label: "Tipo", cell: row => ({ active: "Em atendimento", waiting: "Em espera", closed: "Encerrado" })[row.operationalType] },
    { id: "first", label: "SLA · primeira resposta", cell: row => row.operationalType === "closed" ? "Encerrado" : row.pauseFirstResponse ? "Pausado" : "Em contagem" },
    { id: "total", label: "SLA · atendimento total", cell: row => row.operationalType === "closed" ? "Encerrado" : row.pauseTotal ? "Pausado" : "Em contagem" },
    { id: "budget", label: "Prazo no status", cell: row => row.budgetMinutes ? `${row.budgetMinutes} min úteis` : "Sem prazo" },
  ];
  const levelColumns: TableColumn<(typeof config.levels)[number]>[] = [{ id: "name", label: "Nome", cell: row => <ClassificationValue kind={row.kind} color={row.color} label={row.name} /> },{ id: "kind", label: "Dimensão", cell: row => LEVEL_LABELS[row.kind] }];
  const policyColumns: TableColumn<(typeof config.policies)[number]>[] = [
    ...[0,1,2].map(depth => ({ id: `n${depth+1}`, label: `${depth+1}º nível`, cell: (row: (typeof config.policies)[number]) => row.categoryId ? categoryPaths.get(row.categoryId)?.[depth]?.name ?? "Todas" : depth === 0 ? "Geral" : "Todas" })),
    { id: "impact", label: "Impacto", cell: row => nameFor(row.impactId, config.levels) },
    { id: "urgency", label: "Urgência", cell: row => nameFor(row.urgencyId, config.levels) },
    { id: "priority", label: "Prioridade", cell: row => nameFor(row.impactId ? servicePriority(row.impactId, row.urgencyId, config) : row.priorityId, config.levels) },
    { id: "first", label: "Primeira resposta", cell: row => `${row.firstResponseMinutes} min úteis` },
    { id: "total", label: "Atendimento total", cell: row => `${row.totalMinutes} min úteis` },
  ];
  const impacts = config.levels.filter(l => l.kind === "impact" && !l.archived);
  const urgencies = config.levels.filter(l => l.kind === "urgency" && !l.archived);
  const priorities = config.levels.filter(l => l.kind === "priority" && !l.archived);
  const missingPairs = impacts.flatMap(i => urgencies.filter(u => !config.matrix.some(m => m.impactId === i.id && m.urgencyId === u.id && priorities.some(p => p.id === m.priorityId))));
  const matrixColumns: TableColumn<(typeof impacts)[number]>[] = [{ id: "impact", label: "Impacto / Urgência", cell: row => row.name }, ...urgencies.map(u => ({ id: u.id, label: u.name, cell: (impact: (typeof impacts)[number]) => {
    const existing = config.matrix.find(m => m.impactId === impact.id && m.urgencyId === u.id);
    return <Select label={`Prioridade: ${impact.name} × ${u.name}`} disabled={savingPair !== null} value={existing?.priorityId ?? null} placeholder="Definir prioridade" options={priorities.map(p => ({ value: p.id, label: p.name, color: p.color, classificationKind: p.kind }))} onValueChange={value => { if (!value) return; setSavingPair(`${impact.id}:${u.id}`); setMatrixError(null); void saveConfiguration({ kind: "matrix", id: existing?.id ?? crypto.randomUUID(), impactId: impact.id, urgencyId: u.id, priorityId: value }, config).catch(error => setMatrixError(error instanceof Error ? error.message : "Não foi possível salvar.")).finally(() => setSavingPair(null)); }} />;
  } }))];
  return <PageFrame className={styles.page}>
    <PageHeader eyebrow="Atendimento" title={title} actions={section !== "matrix" ? <Button onClick={create}>Criar {section === "catalog" ? "categoria" : section === "statuses" ? "status" : section === "sla" ? "SLA" : "nível"}</Button> : undefined} />
    {section !== "matrix" && <CollectionToolbar search={<SearchField label="Pesquisar configurações" value={query} onValueChange={setQuery} />} filters={<Checkbox checked={showArchived} onCheckedChange={setShowArchived}>Mostrar desabilitados</Checkbox>} />}
    {section === "catalog" && <DataTable label="Catálogo de serviços" rows={categoryRows} columns={categoryColumns} rowKey={row => row.id} state={config.isLoading ? "loading" : "ready"} emptyText="Nenhuma categoria encontrada." actions={row => <Button size="sm" variant="ghost" aria-label={`Editar ${row.name}`} onClick={() => edit({ ...row, kind: "category" })}>Editar</Button>} />}
    {section === "statuses" && <DataTable label="Status de atendimento" rows={visible(config.statuses)} columns={statusColumns} rowKey={row => row.id} emptyText="Crie os status usados pela sua equipe." actions={row => <Button size="sm" variant="ghost" onClick={() => edit({ ...row, kind: "status" })}>Editar</Button>} />}
    {section === "priorities" && <DataTable label="Impactos, urgências e prioridades" rows={visible(config.levels)} columns={levelColumns} rowKey={row => row.id} emptyText="Cadastre os níveis de impacto, urgência e prioridade para montar a matriz." actions={row => <Button size="sm" variant="ghost" onClick={() => edit({ ...row, kind: "level", levelKind: row.kind })}>Editar</Button>} />}
    {section === "matrix" && <>{matrixError && <Alert tone="danger" title="Falha ao salvar">{matrixError}</Alert>}<DataTable label="Matriz de prioridade" rows={impacts} columns={matrixColumns} rowKey={row => row.id} emptyText="Cadastre impactos, urgências e prioridades antes de preencher a matriz." /><Text tone="secondary">{!impacts.length || !urgencies.length || !priorities.length ? "Cadastros necessários ainda não preenchidos." : missingPairs.length ? `${missingPairs.length} combinações sem prioridade. Elas não recebem prioridade automaticamente.` : "Todas as combinações estão configuradas."}</Text></>}
    {section === "sla" && <DataTable label="SLA" rows={visible(config.policies)} columns={policyColumns} rowKey={row => row.id} emptyText="Nenhum SLA configurado." actions={row => <Button size="sm" variant="ghost" onClick={() => edit({ ...row, kind: "policy" })}>Editar</Button>} />}
    {draft && <ConfigurationEditor key={draft.id} initial={draft} config={config} onClose={() => setDraft(null)} />}
  </PageFrame>;
}
function ConfigurationEditor({ initial, config, onClose }: { initial: SaveServiceConfiguration; config: ServiceConfiguration; onClose: () => void }) {
  const [draft, setDraft] = useState(initial);
  const calculatedPriority = draft.kind === "category" ? servicePriority(draft.defaultImpactId, draft.defaultUrgencyId, config) : draft.kind === "policy" ? (draft.impactId ? servicePriority(draft.impactId, draft.urgencyId, config) : draft.priorityId) : null;
  const priorityLevel = config.levels.find(l => l.id === calculatedPriority);
  const editorTitle = draft.kind === "category" ? "Categoria de serviço" : draft.kind === "policy" ? "SLA" : draft.kind === "level" ? "Nível de classificação" : "Status do atendimento";
  return <ActionModal open onOpenChange={open => { if (!open) onClose(); }} title={editorTitle} confirmLabel="Salvar" onConfirm={() => {
    const name = draft.kind === "policy" ? [serviceCategoryPath(draft.categoryId, config.categories).map(c => c.name).join(" / ") || "Geral", config.levels.find(l => l.id === draft.impactId)?.name, config.levels.find(l => l.id === draft.urgencyId)?.name].filter(Boolean).join(" · ").slice(0, 160) : undefined;
    return saveConfiguration(SaveServiceConfigurationSchema.parse(name ? { ...draft, name } : draft), config);
  }}><div className={styles.form}>
    {draft.kind === "category" && <CategoryParentFields categoryId={draft.id} parentId={draft.parentId} config={config} onChange={parentId => setDraft({ ...draft, parentId })} />}
    {draft.kind === "policy" && <>
      <CategorySelectors value={draft.categoryId} onChange={categoryId => setDraft({ ...draft, categoryId })} config={config} />
      <Field><Label>Impacto</Label><Select label="Impacto do SLA" value={draft.impactId ?? ""} options={[{ value: "", label: "Todos" }, ...config.levels.filter(l => l.kind === "impact" && !l.archived).map(l => ({ value: l.id, label: l.name, color: l.color, classificationKind: l.kind }))]} onValueChange={id => setDraft({ ...draft, impactId: id || null, priorityId: null })} /></Field>
      <Field><Label>Urgência</Label><Select label="Urgência do SLA" value={draft.urgencyId ?? ""} options={[{ value: "", label: "Todas" }, ...config.levels.filter(l => l.kind === "urgency" && !l.archived).map(l => ({ value: l.id, label: l.name, color: l.color, classificationKind: l.kind }))]} onValueChange={id => setDraft({ ...draft, urgencyId: id || null, priorityId: null })} /></Field>
      <ClassificationValue kind="priority" fieldLabel="Prioridade automática" color={priorityLevel?.color} label={priorityLevel?.name ?? (draft.impactId || draft.urgencyId ? "Não definida" : "Todas")} />
    </>}
    {draft.kind !== "matrix" && <>{draft.kind !== "policy" && <Field><Label>Nome</Label><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field>}<Field><Label>{draft.kind === "status" ? "Disponibilidade" : "Status"}</Label><Select label="Disponibilidade do cadastro" value={draft.archived ? "disabled" : "enabled"} options={[{ value: "enabled", label: "Habilitado" }, { value: "disabled", label: "Desabilitado" }]} onValueChange={value => { if (value) setDraft({ ...draft, archived: value === "disabled" }); }} /></Field></>}
    {draft.kind === "category" && <>
      <Field><Label>Impacto padrão</Label><Select label="Impacto padrão da categoria" value={draft.defaultImpactId ?? ""} options={[{ value: "", label: "Não definir impacto" }, ...config.levels.filter(l => l.kind === "impact" && !l.archived).map(l => ({ value: l.id, label: l.name, color: l.color, classificationKind: l.kind }))]} onValueChange={id => setDraft({ ...draft, defaultImpactId: id || null })} /></Field>
      <Field><Label>Urgência padrão</Label><Select label="Urgência padrão da categoria" value={draft.defaultUrgencyId ?? ""} options={[{ value: "", label: "Não definir urgência" }, ...config.levels.filter(l => l.kind === "urgency" && !l.archived).map(l => ({ value: l.id, label: l.name, color: l.color, classificationKind: l.kind }))]} onValueChange={id => setDraft({ ...draft, defaultUrgencyId: id || null })} /></Field>
      <ClassificationValue kind="priority" fieldLabel="Prioridade automática" color={priorityLevel?.color} label={priorityLevel?.name ?? "Não definida"} />
    </>}
    {draft.kind === "level" && <Select label="Dimensão" value={draft.levelKind} options={Object.entries(LEVEL_LABELS).map(([value,label]) => ({ value,label }))} onValueChange={value => { if (value === "impact" || value === "urgency" || value === "priority") setDraft({ ...draft, levelKind: value }); }} />}
    {draft.kind === "level" && <Field><Label>Descrição (opcional)</Label><Textarea rows={2} maxLength={2000} value={draft.description}  onChange={event => setDraft({ ...draft, description: event.target.value })} /></Field>}
    {draft.kind === "level" && <ColorPicker label="Cor" value={draft.color} onValueChange={color => setDraft({ ...draft, color })} />}
    {draft.kind === "status" && <>
      <Field><Label>Situação do atendimento</Label><Select label="Situação do atendimento" value={draft.operationalType} options={[{ value: "active", label: "Em atendimento" }, { value: "waiting", label: "Em espera" }, { value: "closed", label: "Encerrado" }]} onValueChange={value => { if (value === "active" || value === "waiting" || value === "closed") setDraft({ ...draft, operationalType: value }); }} /></Field>
      <div className={styles.form}>
        <SectionTitle level="card" description={draft.operationalType === "closed" ? "Encerrar finaliza os cronômetros. Uma nova mensagem do cliente inicia outro ciclo de SLA." : "Define se os prazos do SLA atribuído continuam contando neste status."}>Contagem do SLA</SectionTitle>
        {draft.operationalType !== "closed" && <>
          <Field><Label>Primeira resposta</Label><Select label="Contagem do SLA de primeira resposta" value={draft.pauseFirstResponse ? "pause" : "count"} options={[{ value: "count", label: "Continuar contando" }, { value: "pause", label: "Pausar contagem" }]} onValueChange={value => { if (value) setDraft({ ...draft, pauseFirstResponse: value === "pause" }); }} /></Field>
          <Field><Label>Atendimento total</Label><Select label="Contagem do SLA de atendimento total" value={draft.pauseTotal ? "pause" : "count"} options={[{ value: "count", label: "Continuar contando" }, { value: "pause", label: "Pausar contagem" }]} onValueChange={value => { if (value) setDraft({ ...draft, pauseTotal: value === "pause" }); }} /></Field>
        </>}
      </div>
      {draft.operationalType === "waiting" && <Field><Label>Quando o cliente enviar uma mensagem</Label><Select label="Ação ao receber mensagem do cliente" value={draft.resumeOnInbound ? "resume" : "keep"} options={[{ value: "keep", label: "Manter neste status" }, { value: "resume", label: "Voltar para Em atendimento" }]} onValueChange={value => { if (value) setDraft({ ...draft, resumeOnInbound: value === "resume" }); }} />{draft.resumeOnInbound && <Text size="pequeno" tone="secondary">A mudança preserva o tempo já consumido do SLA.</Text>}</Field>}
      {draft.operationalType !== "closed" && <div className={styles.form}>
        <SectionTitle level="card" description="Opcional. Soma o tempo útil de todas as passagens por este status, mesmo com o SLA pausado.">Prazo próprio do status</SectionTitle>
        <Field><Label>Limite em minutos úteis</Label><Input type="number" min="1" placeholder="Sem limite" value={draft.budgetMinutes ?? ""} onChange={e => setDraft({ ...draft, budgetMinutes: e.target.value ? Number(e.target.value) : null })} /></Field>
      </div>}
      <div className={styles.form}><SectionTitle level="card">Cor do status</SectionTitle><ColorPicker label="Cor do status" value={draft.color} onValueChange={color => setDraft({ ...draft, color })} /></div>
    </>}

    {draft.kind === "policy" && <><Field><Label>Primeira resposta (minutos úteis)</Label><Input type="number" min="1" value={draft.firstResponseMinutes} onChange={e => setDraft({ ...draft, firstResponseMinutes: Number(e.target.value) })} /></Field><Field><Label>Atendimento total (minutos úteis)</Label><Input type="number" min="1" value={draft.totalMinutes} onChange={e => setDraft({ ...draft, totalMinutes: Number(e.target.value) })} /></Field><Field><Label>Alerta ao consumir (%)</Label><Input type="number" min="1" max="99" value={draft.warningPercent} onChange={e => setDraft({ ...draft, warningPercent: Number(e.target.value) })} /></Field></>}
  </div></ActionModal>;
}
function CategoryParentFields({ categoryId, parentId, config, onChange }: { categoryId: string; parentId: string | null; config: ServiceConfiguration; onChange: (id: string | null) => void }) {
  const path = serviceCategoryPath(parentId, config.categories);
  const n1 = path[0];
  const available = config.categories.filter(c => !c.archived && !serviceCategoryPath(c.id, config.categories).some(p => p.id === categoryId));
  return <>
    <Field><Label>Categoria de primeiro nível (N1)</Label><Select label="Categoria de primeiro nível (N1)" value={n1?.id ?? ""} options={[{ value: "", label: "Raiz — criar categoria de primeiro nível" }, ...available.filter(c => c.parentId === null).map(c => ({ value: c.id, label: c.name }))]} onValueChange={id => onChange(id || null)} /></Field>
    {n1 && <Field><Label>Categoria de segundo nível (N2)</Label><Select label="Categoria de segundo nível (N2)" value={path[1]?.id ?? ""} options={[{ value: "", label: "Diretamente em N1 — criar categoria de segundo nível" }, ...available.filter(c => c.parentId === n1.id).map(c => ({ value: c.id, label: c.name }))]} onValueChange={id => onChange(id || n1.id)} /></Field>}
  </>;
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
