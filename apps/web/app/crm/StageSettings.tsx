import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { settingsControllerCreate } from "@spark/api-client";
import { customFieldDefinitionId, CustomFieldDefinitionSchema, CreateCustomFieldInputSchema, CUSTOM_FIELD_TYPES, CUSTOM_FIELD_TYPE_LABELS, DEAL_BUILT_IN_FIELDS, DEAL_BUILT_IN_FIELD_LABELS, StageFieldRuleSchema, ConfigureStageInputSchema, StageColorSchema, type Stage } from "@spark/core";
import { configureStage, optimisticStageFieldRule } from "@spark/data";
import { ActionModal, Button, Checkbox, ColorPicker, Tabs, CrmSection, Field, Input, Label, ListRow, RowList, SectionTitle, Select, Surface, Switch, Icon, Text, notify } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getStageTransitionsCollection, getStagesCollection } from "../lib/deals-collections.client";
import { getStageFieldRulesCollection } from "../lib/stage-field-rules-collection.client";
import { getCustomFieldsCollection } from "../lib/custom-fields-collection.client";
import styles from "./StageSettings.module.css";

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
  const [fieldQuery, setFieldQuery] = useState("");
  const [onlyEnabled, setOnlyEnabled] = useState(false);
  const [creatingField, setCreatingField] = useState(false);
  const availableFields = [...DEAL_BUILT_IN_FIELDS.map((key) => ({ key, label: DEAL_BUILT_IN_FIELD_LABELS[key] })), ...fields.filter((f) => f.entityType === "deal" && !f.archivedAt).map((f) => ({ key: `custom:${f.key}`, label: f.label }))];
  const fieldLevel = (key: string) => levels[key] ?? rules.find((r) => r.stageId === stage.id && r.fieldKey === key)?.level ?? "none";
  const visibleFields = availableFields.filter((field) => field.label.toLocaleLowerCase("pt-BR").includes(fieldQuery.trim().toLocaleLowerCase("pt-BR")) && (!onlyEnabled || fieldLevel(field.key) !== "none"));
  const configuredCount = availableFields.filter((field) => fieldLevel(field.key) !== "none").length;
  const requiredCount = availableFields.filter((field) => fieldLevel(field.key) === "required").length;
  const importantCount = availableFields.filter((field) => fieldLevel(field.key) === "important").length;
  const setFieldLevel = (key: string, next: string) => setLevels((current) => ({ ...current, [key]: next }));
  const destinationsByDirection = (direction: "forward" | "backward") => stages.filter((item) => item.id !== stage.id && !item.archivedAt && (direction === "forward" ? item.sortOrder > stage.sortOrder : item.sortOrder < stage.sortOrder));
  async function saveLevel(key: string, level: string) {
    const session = getSession(); if (!session) throw new Error("Entre novamente para configurar.");
    const collection = getStageFieldRulesCollection();
    const existing = rules.find((r) => r.stageId === stage.id && r.fieldKey === key);
    if (level === "none") { if (existing) await collection.delete(existing.id).isPersisted.promise; return; }
    const parsed = StageFieldRuleSchema.shape.level.parse(level);
    if (existing) await collection.update(existing.id, (draft) => { draft.level = parsed; }).isPersisted.promise;
    else await collection.insert(optimisticStageFieldRule({ pipelineId: stage.pipelineId, stageId: stage.id, fieldKey: key, level: parsed }, session.orgId)).isPersisted.promise;
  }
  async function createField() {
    if (creatingField) return;
    setCreatingField(true);
    try {
      const response = await settingsControllerCreate(CreateCustomFieldInputSchema.parse({ id: customFieldDefinitionId.create(), entityType: "deal", label: fieldName, type: fieldType, required: false, options: fieldOptions.split(",").map((v) => v.trim()).filter(Boolean) }));
      const field = CustomFieldDefinitionSchema.parse(response.field);
      await saveLevel(`custom:${field.key}`, "optional");
      setFieldName(""); setFieldOptions(""); setNewField(false);
    } catch (cause) {
      notify({ title: "Não foi possível criar o campo", description: cause instanceof Error ? cause.message : "Tente novamente.", tone: "error" });
    } finally { setCreatingField(false); }
  }
  return <ActionModal open onOpenChange={(open) => { if (!open) onClose(); }} title={`Configurar ${stage.name}`} size="wide" confirmLabel="Salvar etapa" onConfirm={async () => {
    if (!name.trim()) throw new Error("Informe o nome da etapa.");
    if (loadingTransitions) throw new Error("Aguarde carregar os destinos atuais.");
    await configureStage(stage.id, ConfigureStageInputSchema.parse({ color, slaMinutes: sla.trim() ? Number(sla) : null, allowWon, allowLost, restrictTransitions: restricted, allowedDestinationStageIds: selected }));
    if (name.trim() !== stage.name) await getStagesCollection().update(stage.id, (draft) => { draft.name = name.trim(); }).isPersisted.promise;
    for (const [key, level] of Object.entries(levels)) await saveLevel(key, level);
  }}>
    <div className={styles.settings}>
    <Tabs label="Configuração da etapa" defaultValue="campos" items={[
      { value: "identidade", label: "Identidade", content: <div className={styles.identity}>
        <CrmSection title="Nome e aparência" description="Ajude a equipe a reconhecer esta etapa no funil.">
          <Field><Label>Nome da etapa</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field><Label>Cor</Label><ColorPicker label="Cor da etapa" value={color} onValueChange={(v) => setColor(StageColorSchema.parse(v))} /></Field>
        </CrmSection>
        <CrmSection title="Prazo de atendimento" description="Tempo útil esperado até o próximo passo. Deixe vazio para não definir um prazo.">
          <Field><Label>Prazo em minutos úteis</Label><Input type="number" min="1" placeholder="Sem prazo" value={sla} onChange={(e) => setSla(e.target.value)} /></Field>
        </CrmSection>
      </div> },
      { value: "campos", label: `Campos (${configuredCount})`, content: <div className={styles.fieldsPanel}>
        <div className={styles.fieldRulesToolbar}>
          <div className={styles.fieldRulesActions}>
            <Field><Label>Pesquisar campos</Label><Input type="search" value={fieldQuery} onChange={(event) => setFieldQuery(event.target.value)} placeholder="Buscar pelo nome do campo" startAdornment={<Icon name="search" />} /></Field>
            {getSession()?.capabilities.includes("settings:manage") && <Button size="sm" variant="secondary" icon={<Icon name="plus" />} onClick={() => setNewField((current) => !current)}>{newField ? "Fechar novo campo" : "Criar campo"}</Button>}
          </div>
          <div className={styles.fieldRulesActions}>
            <Checkbox checked={onlyEnabled} onCheckedChange={setOnlyEnabled}>Mostrar apenas ativos</Checkbox>
            <Text size="pequeno" tone="muted">{requiredCount} {requiredCount === 1 ? "obrigatório" : "obrigatórios"} · {importantCount} {importantCount === 1 ? "importante" : "importantes"}</Text>
          </div>
        </div>
        {getSession()?.capabilities.includes("settings:manage") && newField && <Surface elevation="cavada" radius="lista" className={styles.newField}>
          <SectionTitle level="block" actions={<Button variant="ghost" size="sm" iconOnly icon={<Icon name="close" />} aria-label="Fechar novo campo" onClick={() => setNewField(false)} />}>Novo campo de negócio</SectionTitle>
          <div className={styles.newFieldInputs}>
            <Field><Label>Nome</Label><Input autoFocus value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder="Ex.: Orçamento aprovado" /></Field>
            <Field><Label>Tipo</Label><Select label="Tipo do novo campo" value={fieldType} options={CUSTOM_FIELD_TYPES.map((value) => ({ value, label: CUSTOM_FIELD_TYPE_LABELS[value] }))} onValueChange={(v) => { if (v) setFieldType(v); }} /></Field>
          </div>
          {(fieldType === "single_select" || fieldType === "multi_select") && <Field><Label>Opções, separadas por vírgulas</Label><Input value={fieldOptions} onChange={(e) => setFieldOptions(e.target.value)} placeholder="Ex.: Pequena, Média, Grande" /></Field>}
          <div><Button size="sm" loading={creatingField} onClick={() => void createField()} disabled={!fieldName.trim()}>Criar e ativar nesta etapa</Button></div>
        </Surface>}
        {/* Cada campo numa linha: ativo à esquerda; obrigatório e importante à
          * direita. Ativo vira folha (seleção da linha). */}
        <div className={styles.fieldRules}>
          {visibleFields.length === 0 && <Text size="pequeno" tone="muted">Nenhum campo encontrado. Tente outro nome ou remova o filtro.</Text>}
          <RowList label="Campos disponíveis nesta etapa">{visibleFields.map((field, index) => {
            const level = fieldLevel(field.key);
            const enabled = level !== "none";
            return <ListRow
              key={field.key}
              index={index}
              selected={enabled}
              leading={<Checkbox aria-label={`Ativar ${field.label}`} checked={enabled} onCheckedChange={(checked) => setFieldLevel(field.key, checked ? "optional" : "none")}>{""}</Checkbox>}
              title={field.label}
              description={field.key.startsWith("custom:") ? "Personalizado" : "Padrão"}
              trailing={<>
                <Checkbox aria-label={`${field.label} obrigatório`} checked={level === "required"} disabled={!enabled} onCheckedChange={(checked) => setFieldLevel(field.key, checked ? "required" : "optional")}>Obrigatório</Checkbox>
                <Checkbox aria-label={`${field.label} importante`} checked={level === "important"} disabled={!enabled} onCheckedChange={(checked) => setFieldLevel(field.key, checked ? "important" : "optional")}>Importante</Checkbox>
              </>}
            />;
          })}</RowList>
        </div>
        <Text size="pequeno" tone="muted">Obrigatório impede avançar sem preencher. Importante sinaliza uma pendência, mas permite continuar.</Text>
      </div> },
      { value: "movimentacao", label: "Movimentação", content: <div className={styles.movement}>
        <CrmSection title="Destinos permitidos" description="Defina para onde a equipe pode mover um negócio a partir desta etapa.">
          <Switch checked={restricted} onCheckedChange={setRestricted}>Escolher destinos específicos</Switch>
          {!restricted && <Text size="pequeno" tone="secondary">Todos os destinos do funil estão disponíveis.</Text>}
          {restricted && <div className={styles.destinations}>
            <CrmSection title="Avançar">
              {destinationsByDirection("forward").map((s) => <Checkbox key={s.id} checked={selected.includes(s.id)} onCheckedChange={(checked) => setDestinations(checked ? [...selected, s.id] : selected.filter((id) => id !== s.id))}>{s.name}</Checkbox>)}
              {destinationsByDirection("forward").length === 0 && <Text size="pequeno" tone="muted">Esta é a última etapa.</Text>}
            </CrmSection>
            <CrmSection title="Retornar">
              {destinationsByDirection("backward").map((s) => <Checkbox key={s.id} checked={selected.includes(s.id)} onCheckedChange={(checked) => setDestinations(checked ? [...selected, s.id] : selected.filter((id) => id !== s.id))}>{s.name}</Checkbox>)}
              {destinationsByDirection("backward").length === 0 && <Text size="pequeno" tone="muted">Esta é a primeira etapa.</Text>}
            </CrmSection>
          </div>}
        </CrmSection>
        <CrmSection title="Encerrar negociação">
          <Switch checked={allowWon} onCheckedChange={setAllowWon}>Permitir marcar como ganho</Switch>
          <Switch checked={allowLost} onCheckedChange={setAllowLost}>Permitir marcar como perdido</Switch>
        </CrmSection>
      </div> },
    ]} />
    </div>
  </ActionModal>;
}
