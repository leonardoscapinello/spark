import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { settingsControllerCreate } from "@spark/api-client";
import { customFieldDefinitionId, CustomFieldDefinitionSchema, CreateCustomFieldInputSchema, CUSTOM_FIELD_TYPES, CUSTOM_FIELD_TYPE_LABELS, DEAL_BUILT_IN_FIELDS, DEAL_BUILT_IN_FIELD_LABELS, STAGE_FIELD_LEVEL_LABELS, StageFieldRuleSchema, ConfigureStageInputSchema, type Stage } from "@spark/core";
import { configureStage, optimisticStageFieldRule } from "@spark/data";
import { ActionModal, Button, Checkbox, CrmWorkspace, CrmSection, CRM_COLORS, Field, Input, Label, Select, Switch, CrmLabel, Icon } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getStageTransitionsCollection, getStagesCollection } from "../lib/deals-collections.client";
import { getStageFieldRulesCollection } from "../lib/stage-field-rules-collection.client";
import { getCustomFieldsCollection } from "../lib/custom-fields-collection.client";

export function StageSettingsButton({ stage, stages }: { stage: Stage; stages: readonly Stage[] }) {
  const [open, setOpen] = useState(false);
  return <><Button variant="ghost" size="sm" iconOnly icon={<Icon name="settings" />} aria-label={`Configurar etapa ${stage.name}`} onClick={() => setOpen(true)} />{open && <StageSettings stage={stage} stages={stages} onClose={() => setOpen(false)} />}</>;
}
function StageSettings({ stage, stages, onClose }: { stage: Stage; stages: readonly Stage[]; onClose: () => void }) {
  const { data: transitions = [], isLoading: loadingTransitions } = useLiveQuery({ query: (q) => q.from({ transitions: getStageTransitionsCollection() }) });
  const { data: rules = [] } = useLiveQuery({ query: (q) => q.from({ rules: getStageFieldRulesCollection() }) });
  const { data: fields = [] } = useLiveQuery({ query: (q) => q.from({ fields: getCustomFieldsCollection() }) });
  const [name, setName] = useState(stage.name);
  const [color, setColor] = useState(stage.color ?? "neutral");
  const [restricted, setRestricted] = useState(stage.restrictTransitions);
  const [allowWon, setAllowWon] = useState(stage.allowWon);
  const [allowLost, setAllowLost] = useState(stage.allowLost);
  const [sla, setSla] = useState(stage.slaMinutes ? String(stage.slaMinutes) : "");
  const [destinations, setDestinations] = useState<string[] | null>(null);
  const selected = destinations ?? transitions.filter((t) => t.fromStageId === stage.id).map((t) => t.toStageId);
  const [newField, setNewField] = useState(false);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<string>("text");
  const [fieldOptions, setFieldOptions] = useState("");
  const [levels, setLevels] = useState<Record<string,string>>({});
  const availableFields = [...DEAL_BUILT_IN_FIELDS.map((key) => ({ key, label: DEAL_BUILT_IN_FIELD_LABELS[key] })), ...fields.filter((f) => f.entityType === "deal" && !f.archivedAt).map((f) => ({ key: `custom:${f.key}`, label: f.label }))];
  async function saveLevel(key: string, level: string) {
    const session = getSession(); if (!session) throw new Error("Entre novamente para configurar.");
    const collection = getStageFieldRulesCollection();
    const existing = rules.find((r) => r.stageId === stage.id && r.fieldKey === key);
    if (level === "none") { if (existing) await collection.delete(existing.id).isPersisted.promise; return; }
    const parsed = StageFieldRuleSchema.shape.level.parse(level);
    if (existing) await collection.update(existing.id, (draft) => { draft.level = parsed; }).isPersisted.promise;
    else await collection.insert(optimisticStageFieldRule({ pipelineId: stage.pipelineId, stageId: stage.id, fieldKey: key, level: parsed }, session.orgId)).isPersisted.promise;
  }
  return <ActionModal open onOpenChange={(open) => { if (!open) onClose(); }} title={`Configurar ${stage.name}`} size="workspace" confirmLabel="Salvar etapa" onConfirm={async () => {
    if (!name.trim()) throw new Error("Informe o nome da etapa.");
    if (loadingTransitions) throw new Error("Aguarde carregar os destinos atuais.");
    await configureStage(stage.id, ConfigureStageInputSchema.parse({ color, slaMinutes: sla.trim() ? Number(sla) : null, allowWon, allowLost, restrictTransitions: restricted, allowedDestinationStageIds: selected }));
    if (name.trim() !== stage.name) await getStagesCollection().update(stage.id, (draft) => { draft.name = name.trim(); }).isPersisted.promise;
    for (const [key, level] of Object.entries(levels)) await saveLevel(key, level);
  }}>
    <CrmWorkspace context={<CrmSection title="Identidade da etapa" description="Nome, cor e prazo para orientar o time.">
      <Field><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field><Label>Cor</Label><Select label="Cor da etapa" value={color} options={CRM_COLORS} onValueChange={(v) => { if (v) setColor(ConfigureStageInputSchema.shape.color.parse(v) ?? "neutral"); }} /></Field>
      <CrmLabel color={color}>{name}</CrmLabel>
      <Field><Label>Prazo em minutos úteis</Label><Input type="number" min="1" placeholder="Sem prazo" value={sla} onChange={(e) => setSla(e.target.value)} /></Field>
    </CrmSection>} current={<CrmSection title="Campos desta etapa" description="Selecione o que aparece no centro da ficha. Obrigatório impede avançar sem preencher.">
      {availableFields.map((field) => <Field key={field.key}><Label>{field.label}</Label><Select label={`${field.label} nesta etapa`} value={levels[field.key] ?? rules.find((r) => r.stageId === stage.id && r.fieldKey === field.key)?.level ?? "none"} options={[{ value: "none", label: "Fora desta etapa" }, ...Object.entries(STAGE_FIELD_LEVEL_LABELS).map(([value, label]) => ({ value, label }))]} onValueChange={(v) => { if (v) setLevels((current) => ({ ...current, [field.key]: v })); }} /></Field>)}
      {getSession()?.capabilities.includes("settings:manage") && <Button variant="secondary" icon={<Icon name="plus" />} onClick={() => setNewField(true)}>Criar campo</Button>}
    </CrmSection>} actions={<CrmSection title="Mover para" description="Escolha destinos de avanço e de retorno. Os dois respeitam a mesma configuração.">
      <Switch checked={restricted} onCheckedChange={setRestricted}>Restringir destinos</Switch>
      {restricted && stages.filter((s) => s.id !== stage.id && !s.archivedAt).map((s) => <Checkbox key={s.id} checked={selected.includes(s.id)} onCheckedChange={(checked) => setDestinations(checked ? [...selected, s.id] : selected.filter((id) => id !== s.id))}>{s.name}</Checkbox>)}
      <Switch checked={allowWon} onCheckedChange={setAllowWon}>Permitir ganho</Switch>
      <Switch checked={allowLost} onCheckedChange={setAllowLost}>Permitir perda</Switch>
    </CrmSection>} />
    <ActionModal open={newField} onOpenChange={setNewField} title="Novo campo da etapa" confirmLabel="Criar campo" onConfirm={async () => {
      const response = await settingsControllerCreate(CreateCustomFieldInputSchema.parse({ id: customFieldDefinitionId.create(), entityType: "deal", label: fieldName, type: fieldType, required: false, options: fieldOptions.split(",").map((v) => v.trim()).filter(Boolean) }));
      const field = CustomFieldDefinitionSchema.parse(response.field);
      await saveLevel(`custom:${field.key}`, "optional"); setFieldName(""); setFieldOptions("");
    }}><CrmSection title="Definição do campo">
      <Field><Label>Nome</Label><Input value={fieldName} onChange={(e) => setFieldName(e.target.value)} /></Field>
      <Field><Label>Tipo</Label><Select label="Tipo do campo" value={fieldType} options={CUSTOM_FIELD_TYPES.map((value) => ({ value, label: CUSTOM_FIELD_TYPE_LABELS[value] }))} onValueChange={(v) => { if (v) setFieldType(v); }} /></Field>
      {(fieldType === "single_select" || fieldType === "multi_select") && <Field><Label>Opções separadas por vírgula</Label><Input value={fieldOptions} onChange={(e) => setFieldOptions(e.target.value)} /></Field>}
    </CrmSection></ActionModal>
  </ActionModal>;
}
