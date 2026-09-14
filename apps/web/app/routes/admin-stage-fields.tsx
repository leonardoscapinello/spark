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
import { EmptyState, Icon, PageFrame, PageHeader, Select, notify } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getCustomFieldsCollection } from "../lib/custom-fields-collection.client";
import { getPipelinesCollection, getStagesCollection } from "../lib/deals-collections.client";
import { getStageFieldRulesCollection } from "../lib/stage-field-rules-collection.client";
import { requireCapability } from "../lib/route-access.client";
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
  const pipeline = pipelines.find((item) => item.id === selectedPipeline) ?? pipelines[0];
  const pipelineStages = pipeline ? stages.filter((stage) => stage.pipelineId === pipeline.id && !stage.archivedAt) : [];

  /** Campos oferecidos: os do próprio negócio, mais os personalizados de negócio. */
  const fields = useMemo(() => [
    ...DEAL_BUILT_IN_FIELDS.map((key) => ({ key, label: DEAL_BUILT_IN_FIELD_LABELS[key], group: "Do negócio" })),
    ...customFields
      .filter((field) => field.entityType === "deal" && !field.archivedAt)
      .map((field) => ({ key: `custom:${field.key}`, label: field.label, group: "Personalizados" })),
  ], [customFields]);

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
      icon="briefcase"
      title="O que cada etapa exige"
      description="Campo obrigatório impede o negócio de avançar enquanto estiver vazio. Importante apenas sinaliza. Cada funil tem as suas regras."
      actions={pipelines.length > 1 ? <Select label="Funil" value={pipeline?.id ?? null} options={pipelines.map((item) => ({ value: item.id, label: item.name }))} onValueChange={setSelectedPipeline} /> : undefined}
    />

    {!pipeline || pipelineStages.length === 0
      ? <EmptyState variant="featured" icon="briefcase" title="Nenhum funil com etapas" description="Crie um funil e suas etapas no CRM para definir o que cada uma exige." />
      : <div className={styles.grade} role="table" aria-label={`Campos exigidos em ${pipeline.name}`}>
          <div className={styles.linha} role="row" data-head="true">
            <span className={styles.campo} role="columnheader">Campo</span>
            {pipelineStages.map((stage) => <span key={stage.id} className={styles.etapa} role="columnheader">{stage.name}</span>)}
          </div>
          {fields.map((field, index) => <div key={field.key} className={styles.linha} role="row">
            <span className={styles.campo} role="rowheader">
              {field.label}
              {(index === 0 || fields[index - 1]?.group !== field.group) && <small>{field.group}</small>}
            </span>
            {pipelineStages.map((stage) => <span key={stage.id} className={styles.etapa} role="cell">
              <Select
                label={`${field.label} em ${stage.name}`}
                appearance="filter"
                value={levelAt(stage.id, field.key)}
                options={LEVEL_OPTIONS}
                onValueChange={(value) => { if (value) void changeLevel(stage.id, field.key, value); }}
              />
            </span>)}
          </div>)}
        </div>}

    <p className={styles.nota}><Icon name="bolt" />Obrigatório vale para sair da etapa: mover um negócio para uma etapa posterior exige os campos de todas as etapas do caminho. Voltar atrás nunca é bloqueado.</p>
  </PageFrame>;
}
