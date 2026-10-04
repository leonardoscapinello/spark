import { useState } from "react";
import { useSearchParams } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { settingsControllerArchive, settingsControllerCreate, fieldAdministrationControllerSaveGroup, fieldAdministrationControllerMetadata } from "@spark/api-client";
import { CUSTOM_FIELD_TYPES, CUSTOM_FIELD_TYPE_LABELS, CUSTOM_FIELD_ENTITIES, CUSTOM_FIELD_ENTITY_LABELS, CreateCustomFieldInputSchema, SaveCustomFieldGroupSchema, UpdateCustomFieldMetadataSchema, customFieldDefinitionId, type CustomFieldDefinition, type CustomFieldGroup, type CustomFieldType } from "@spark/core";
import { ActionModal, Alert, Button, Checkbox, Chip, CollectionToolbar, DataTable, Field, Icon, Input, Label, MenuButton, MenuItem, PageFrame, PageHeader, RecordIdentity, SearchField, Select, Text, notify, type TableColumn } from "@spark/ui-web";
import { getCustomFieldsCollection, getCustomFieldGroupsCollection } from "../lib/custom-fields-collection.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./settings.module.css";
const ENTITY_OPTIONS = CUSTOM_FIELD_ENTITIES.map(value => ({ value, label: CUSTOM_FIELD_ENTITY_LABELS[value] }));
const TYPE_OPTIONS = CUSTOM_FIELD_TYPES.map(value => ({ value, label: CUSTOM_FIELD_TYPE_LABELS[value] }));
export async function clientLoader() { await requireCapability("settings:manage"); void Promise.allSettled([getCustomFieldsCollection().preload(), getCustomFieldGroupsCollection().preload()]); return null; }
export default function Settings() {
  const [params, setParams] = useSearchParams();
  const entity = CUSTOM_FIELD_ENTITIES.find(value => value === params.get("entity")) ?? "contact";
  const { data: fields = [], isLoading } = useLiveQuery({ query: q => q.from({ row: getCustomFieldsCollection() }) });
  const { data: groups = [] } = useLiveQuery({ query: q => q.from({ row: getCustomFieldGroupsCollection() }).orderBy(({ row }) => row.sortOrder, "asc") });
  const [search, setSearch] = useState(""); const [groupFilter, setGroupFilter] = useState("all"); const [archived, setArchived] = useState(false);
  const [fieldOpen, setFieldOpen] = useState(false); const [editing, setEditing] = useState<CustomFieldDefinition | null>(null);
  const [label, setLabel] = useState(""); const [type, setType] = useState<CustomFieldType>("text"); const [options, setOptions] = useState(""); const [groupId, setGroupId] = useState<string | null>(null); const [order, setOrder] = useState("0");
  const [groupOpen, setGroupOpen] = useState(false); const [editingGroup, setEditingGroup] = useState<CustomFieldGroup | null>(null); const [groupName, setGroupName] = useState(""); const [groupOrder, setGroupOrder] = useState("0"); const [groupArchived, setGroupArchived] = useState(false);
  const entityGroups = groups.filter(g => g.entityType === entity);
  const groupOptions = [{ value: "", label: "Sem grupo" }, ...entityGroups.filter(g => !g.archived).map(g => ({ value: g.id, label: g.name }))];
  const shown = fields.filter(f => f.entityType === entity && Boolean(f.archivedAt) === archived && (groupFilter === "all" || (f.groupId ?? "") === groupFilter) && f.label.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"))).sort((a,b) => (a.sortOrder ?? 0)-(b.sortOrder ?? 0) || a.label.localeCompare(b.label));
  function openField(field: CustomFieldDefinition | null) { setEditing(field); setLabel(field?.label ?? ""); setType(field?.type ?? "text"); setGroupId(field?.groupId ?? (groupFilter === "all" ? null : groupFilter || null)); setOrder(String(field?.sortOrder ?? 0)); setOptions(""); setFieldOpen(true); }
  function openGroup(group: CustomFieldGroup | null) { setEditingGroup(group); setGroupName(group?.name ?? ""); setGroupOrder(String(group?.sortOrder ?? entityGroups.length)); setGroupArchived(group?.archived ?? false); setGroupOpen(true); }
  async function saveField() {
    if (editing) await fieldAdministrationControllerMetadata(editing.id, UpdateCustomFieldMetadataSchema.parse({ label, groupId, sortOrder: Number(order) }));
    else await settingsControllerCreate(CreateCustomFieldInputSchema.parse({ id: customFieldDefinitionId.create(), entityType: entity, label, type, groupId, sortOrder: Number(order), required: false, options: options.split(",").map(v => v.trim()).filter(Boolean) }));
    notify({ title: editing ? "Campo atualizado" : "Campo criado", tone: "success" });
  }
  async function saveGroup() { await fieldAdministrationControllerSaveGroup(SaveCustomFieldGroupSchema.parse({ id: editingGroup?.id ?? crypto.randomUUID(), entityType: entity, name: groupName, sortOrder: Number(groupOrder), archived: groupArchived })); notify({ title: "Grupo salvo", tone: "success" }); }
  async function toggle(field: CustomFieldDefinition) { try { await settingsControllerArchive(field.id, { archived: !field.archivedAt }); notify({ title: field.archivedAt ? "Campo restaurado" : "Campo arquivado", tone: "success" }); } catch (error) { notify({ title: "Não foi possível alterar o campo", description: error instanceof Error ? error.message : "Tente novamente.", tone: "error" }); } }
  const columns: TableColumn<CustomFieldDefinition>[] = [
    { id: "label", label: "Campo", cell: f => <RecordIdentity icon="file" title={f.label} subtitle={CUSTOM_FIELD_TYPE_LABELS[f.type]} />, sortValue: f => f.label },
    { id: "group", label: "Grupo", cell: f => groups.find(g => g.id === f.groupId)?.name ?? "Sem grupo" },
    { id: "order", label: "Ordem", cell: f => String(f.sortOrder ?? 0), sortValue: f => f.sortOrder ?? 0 },
    { id: "required", label: "Preenchimento", cell: f => <Chip tone={f.required ? "info" : "neutral"}>{f.required ? "Obrigatório no cadastro" : "Conforme o processo"}</Chip> },
  ];
  return <PageFrame width="content" className={styles.page}>
    <PageHeader eyebrow="Administração · Dados" title="Campos e grupos" description="Organize os dados de cada módulo. Campos de pessoas e empresas acompanham o mesmo cadastro em todo o sistema." actions={<><Button variant="secondary" onClick={() => openGroup(null)}>Novo grupo</Button><Button onClick={() => openField(null)}>Novo campo</Button></>} />
    <Select label="Módulo e registro" value={entity} options={ENTITY_OPTIONS} onValueChange={value => { const next = CUSTOM_FIELD_ENTITIES.find(item => item === value); if (next) { setParams({ entity: next }); setGroupFilter("all"); } }} />
    <Alert tone="info" title={CUSTOM_FIELD_ENTITY_LABELS[entity]}>{entity === "service_cycle" ? "Estes campos pertencem a uma passagem pelo atendimento. Um novo ciclo começa com novos valores e preserva os anteriores." : entity === "conversation" ? "Estes campos pertencem à conversa e permanecem entre reaberturas. Dados da pessoa continuam no cadastro de pessoa." : "O campo pertence a este tipo de registro. Exigências de uma etapa de vendas são configuradas em Funis e etapas, sem tornar o cadastro obrigatório em outros módulos."}</Alert>
    <CollectionToolbar search={<SearchField label="Buscar campo" value={search} onValueChange={setSearch} />} filters={<Select label="Grupo" value={groupFilter} options={[{ value: "all", label: "Todos os grupos" }, ...groupOptions]} onValueChange={value => setGroupFilter(value ?? "all")} />} count={`${shown.length} campos`} />
    <Checkbox checked={archived} onCheckedChange={value => setArchived(value === true)}>Mostrar campos arquivados</Checkbox>
    <DataTable label="Campos do módulo" rows={shown} columns={columns} rowKey={f => f.id} rowLabel={f => f.label} state={isLoading ? "loading" : "ready"} emptyText="Nenhum campo neste filtro. Crie um campo para este módulo." actions={f => <MenuButton size="sm" variant="ghost" shape="rounded" iconOnly indicator={false} icon={<Icon name="more" />} aria-label={`Ações de ${f.label}`} menu={<><MenuItem onClick={() => openField(f)}>Editar nome, grupo e ordem</MenuItem><MenuItem onClick={() => void toggle(f)}>{f.archivedAt ? "Restaurar" : "Arquivar"}</MenuItem></>} />} />
    <Text weight="medium">Grupos de {CUSTOM_FIELD_ENTITY_LABELS[entity]}</Text>
    <DataTable label="Grupos do módulo" rows={entityGroups} columns={[{ id: "name", label: "Grupo", cell: g => g.name }, { id: "order", label: "Ordem", cell: g => String(g.sortOrder) }, { id: "count", label: "Campos ativos", cell: g => String(fields.filter(f => f.groupId === g.id && !f.archivedAt).length) }, { id: "status", label: "Status", cell: g => g.archived ? "Arquivado" : "Ativo" }]} rowKey={g => g.id} rowLabel={g => g.name} emptyText="Crie grupos para organizar os campos deste módulo." actions={g => <Button size="sm" variant="ghost" onClick={() => openGroup(g)}>Editar</Button>} />
    <ActionModal open={fieldOpen} onOpenChange={setFieldOpen} title={editing ? "Editar campo" : `Novo campo · ${CUSTOM_FIELD_ENTITY_LABELS[entity]}`} confirmLabel="Salvar campo" errorText="Revise o nome, o grupo e as opções do campo." onConfirm={saveField}><div className={styles.form}>
      <Field><Label>Nome</Label><Input autoFocus value={label} onChange={event => setLabel(event.target.value)} /></Field>
      {!editing && <Select label="Tipo de campo" value={type} options={TYPE_OPTIONS} onValueChange={value => { const next = CUSTOM_FIELD_TYPES.find(item => item === value); if (next) setType(next); }} />}
      {!editing && (type === "single_select" || type === "multi_select") && <Field><Label>Opções separadas por vírgula</Label><Input value={options} onChange={event => setOptions(event.target.value)} /></Field>}
      <Select label="Grupo" value={groupId ?? ""} options={groupOptions} onValueChange={value => setGroupId(value || null)} />
      <Field><Label>Ordem de exibição</Label><Input type="number" min={0} value={order} onChange={event => setOrder(event.target.value)} /></Field>
      <Text tone="secondary">Configure exigências de preenchimento no processo que utiliza este campo.</Text>
    </div></ActionModal>
    <ActionModal open={groupOpen} onOpenChange={setGroupOpen} title={editingGroup ? "Editar grupo" : "Novo grupo"} confirmLabel="Salvar grupo" errorText="Revise o grupo. Para arquivar, mova ou arquive primeiro os campos ativos." onConfirm={saveGroup}><div className={styles.form}>
      <Field><Label>Nome do grupo</Label><Input autoFocus value={groupName} onChange={event => setGroupName(event.target.value)} /></Field>
      <Field><Label>Ordem de exibição</Label><Input type="number" min={0} value={groupOrder} onChange={event => setGroupOrder(event.target.value)} /></Field>
      {editingGroup && <Checkbox checked={groupArchived} onCheckedChange={value => setGroupArchived(value === true)}>Arquivado</Checkbox>}
    </div></ActionModal>
  </PageFrame>;
}
