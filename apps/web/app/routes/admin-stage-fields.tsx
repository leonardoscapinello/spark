import { useMemo, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import {
  DEAL_BUILT_IN_FIELDS,
  DEAL_BUILT_IN_FIELD_LABELS,
  STAGE_FIELD_LEVELS,
  STAGE_FIELD_LEVEL_LABELS,
  pipelineId as pipelineIdFactory,
  stageId as stageIdFactory,
  type StageFieldLevel,
} from "@spark/core";
import { optimisticStageFieldRule } from "@spark/data";
import { Alert, CollectionToolbar, DataTable, EmptyState, PageFrame, PageHeader, SearchField, SearchSelect, Select, Text, notify, type TableColumn } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getCustomFieldsCollection } from "../lib/custom-fields-collection.client";
import { getPipelinesCollection, getStagesCollection } from "../lib/deals-collections.client";
import { getStageFieldRulesCollection } from "../lib/stage-field-rules-collection.client";
import { requireCapability } from "../lib/route-access.client";
import { StageSettingsButton } from "../crm/StageSettings";
import styles from "./admin-stage-fields.module.css";

export async function clientLoader() {
  await requireCapability("pipelines:manage");
  void Promise.allSettled([
    getPipelinesCollection().preload(),
    getStagesCollection().preload(),
    getStageFieldRulesCollection().preload(),
    getCustomFieldsCollection().preload(),
  ]);
  return null;
}

/** Nível de um campo numa etapa: livre, importante ou obrigatório. */
const LEVEL_OPTIONS = [{ value: "none", label: "Livre" }, ...STAGE_FIELD_LEVELS.map((value) => ({ value, label: STAGE_FIELD_LEVEL_LABELS[value] }))];

/**
 * «O que cada etapa exige» — a configuração que o Pipedrive chama de campos
 * obrigatórios e importantes. Uma grade: campos nas linhas, etapas do funil
 * nas colunas. O mesmo campo pode ser obrigatório numa etapa e livre na
 * seguinte, e cada funil tem a sua grade.
 */
export default function AdminStageFields() {
  const session = getSession();
  const rulesCollection = getStageFieldRulesCollection();
  const { data: pipelines = [] } = useLiveQuery({ query: (q) => q.from({ pipelines: getPipelinesCollection() }).orderBy(({ pipelines: item }) => item.name, "asc") });
  const { data: stages = [] } = useLiveQuery({ query: (q) => q.from({ stages: getStagesCollection() }).orderBy(({ stages: item }) => item.sortOrder, "asc") });
  const { data: rules = [] } = useLiveQuery({ query: (q) => q.from({ rules: rulesCollection }) });
  const { data: customFields = [] } = useLiveQuery({ query: (q) => q.from({ fields: getCustomFieldsCollection() }) });

  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const pipeline = pipelines.find((item) => item.id === selectedPipeline) ?? pipelines[0];
  const pipelineStages = pipeline ? stages.filter((stage) => stage.pipelineId === pipeline.id && !stage.archivedAt) : [];

  const stage = pipelineStages.find(item => item.id === selectedStage) ?? pipelineStages[0];

  /** Campos oferecidos: os do próprio negócio, mais os personalizados de negócio. */
  const fields = useMemo(() => [
    ...DEAL_BUILT_IN_FIELDS.map((key) => ({ key, label: DEAL_BUILT_IN_FIELD_LABELS[key], group: "Do negócio" })),
    ...customFields
      .filter((field) => field.entityType === "deal" && !field.archivedAt)
      .map((field) => ({ key: `custom:${field.key}`, label: field.label, group: "Personalizados" })),
  ], [customFields]);

  type FieldRow = (typeof fields)[number];
  /** O grupo aparece só na primeira linha de cada um, como subtítulo da coluna de campos. */
  const firstOfGroup = new Set(fields.filter((field, index) => index === 0 || fields[index - 1]?.group !== field.group).map((field) => field.key));
  const columns: TableColumn<FieldRow>[] = [
    { id: "field", label: "Campo", alwaysVisible: true, cell: (field) => <div className={styles.field}><Text weight="medium">{field.label}</Text>{firstOfGroup.has(field.key) && <Text size="legenda" tone="muted">{field.group}</Text>}</div> },
    ...(stage ? [stage] : []).map((stage): TableColumn<FieldRow> => ({ id: stage.id, label: stage.name, cell: (field) => <Select label={`${field.label} em ${stage.name}`} appearance="filter" value={levelAt(stage.id, field.key)} options={LEVEL_OPTIONS} onValueChange={(value) => { if (value) void changeLevel(stage.id, field.key, value); }} /> })),
  ];

  function levelAt(stageId: string, fieldKey: string): string {
    return rules.find((rule) => rule.stageId === stageId && rule.fieldKey === fieldKey)?.level ?? "none";
  }

  async function changeLevel(stageId: string, fieldKey: string, next: string) {
    if (!session || !pipeline) return;
    const existing = rules.find((rule) => rule.stageId === stageId && rule.fieldKey === fieldKey);
    try {
      if (next === "none") {
        if (!existing) return;
        await rulesCollection.delete(existing.id).isPersisted.promise;
      } else if (existing) {
        await rulesCollection.update(existing.id, (draft) => { draft.level = next as StageFieldLevel; }).isPersisted.promise;
      } else {
        const rule = optimisticStageFieldRule({
          pipelineId: pipelineIdFactory.from(pipeline.id),
          stageId: stageIdFactory.from(stageId),
          fieldKey,
          level: next as StageFieldLevel,
        }, session.orgId);
        await rulesCollection.insert(rule).isPersisted.promise;
      }
      notify({ title: "Regra atualizada", tone: "success" });
    } catch {
      notify({ title: "Não foi possível salvar a regra", tone: "error" });
    }
  }

  return <PageFrame>
    <PageHeader
      eyebrow="Administração"
      title="Funis e etapas"
      description="Escolha um funil e uma etapa para configurar campos, transições e prazo útil."
      actions={stage ? <StageSettingsButton stage={stage} stages={pipelineStages} /> : undefined}
    />

    <CollectionToolbar search={<SearchField label="Buscar campo" value={search} onValueChange={setSearch} />} filters={<>
      <SearchSelect label="Funil" searchPlacement="dropdown" value={pipeline ? { value: pipeline.id, label: pipeline.name } : null} options={pipelines.map(item => ({ value: item.id, label: item.name }))} onValueChange={item => { setSelectedPipeline(item?.value ?? null); setSelectedStage(null); }} />
      <SearchSelect label="Etapa" searchPlacement="dropdown" value={stage ? { value: stage.id, label: stage.name } : null} options={pipelineStages.map(item => ({ value: item.id, label: item.name }))} onValueChange={item => setSelectedStage(item?.value ?? null)} />
    </>} />
    {!pipeline || pipelineStages.length === 0
      ? <EmptyState variant="featured" icon="briefcase" title="Nenhum funil com etapas" description="Crie um funil e suas etapas no CRM para definir o que cada uma exige." />
      : <DataTable label={`Campos exigidos em ${pipeline.name}`} rows={fields.filter(field => field.label.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")))} columns={columns} rowKey={(field) => field.key} rowLabel={(field) => field.label} />}

    <Alert tone="info" title="Obrigatório vale para sair da etapa">Mover um negócio para uma etapa posterior exige os campos de todas as etapas do caminho. Voltar atrás nunca é bloqueado.</Alert>
  </PageFrame>;
}
