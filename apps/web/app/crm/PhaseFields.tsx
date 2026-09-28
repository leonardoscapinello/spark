import type { ReactNode } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { type Stage, type Deal, stageFieldLabel, STAGE_FIELD_LEVEL_LABELS } from "@spark/core";
import { CrmPhase, CrmLabel, CrmSection, CustomFieldValue, Button, Icon } from "@spark/ui-web";
import { getCustomFieldsCollection } from "../lib/custom-fields-collection.client";
import { getStageFieldRulesCollection } from "../lib/stage-field-rules-collection.client";
import { useCustomFieldOptions } from "../lib/custom-fields.client";
import { StageSettingsButton } from "./StageSettings";
import { getSession } from "../lib/auth.client";
import styles from "./phase-fields.module.css";

export function PhaseFields({ stage, stages, values, onSave, renderBuiltIn, onOpenCommercial, disabled = false }: {
  stage: Stage; stages: readonly Stage[]; values: NonNullable<Deal["customFields"]>;
  onSave: (key: string, value: unknown) => Promise<void>; disabled?: boolean;
  renderBuiltIn?: (key: string) => ReactNode; onOpenCommercial?: () => void;
}) {
  const { data: fields = [] } = useLiveQuery({ query: (q) => q.from({ fields: getCustomFieldsCollection() }) });
  const { data: rules = [] } = useLiveQuery({ query: (q) => q.from({ rules: getStageFieldRulesCollection() }) });
  const options = useCustomFieldOptions();
  const currentRules = rules.filter((r) => r.stageId === stage.id && r.pipelineId === stage.pipelineId);
  const commercialRules = currentRules.filter((r) => r.fieldKey === "products" || r.fieldKey === "amount");
  const formRules = currentRules.filter((r) => r.fieldKey !== "products" && r.fieldKey !== "amount");
  const selectedFields = fields.filter((f) => f.entityType === "deal" && !f.archivedAt && formRules.some((r) => r.fieldKey === `custom:${f.key}`));
  return <CrmPhase name={stage.name} color={stage.color} count={formRules.length} action={getSession()?.capabilities.includes("pipelines:manage") ? <StageSettingsButton stage={stage} stages={stages} /> : undefined}>
    {selectedFields.map((field) => {
      const level = formRules.find((r) => r.fieldKey === `custom:${field.key}`)?.level ?? "optional";
      return <CustomFieldValue key={field.id} layout="stacked" hint={<CrmLabel color={level === "required" ? "red" : level === "important" ? "amber" : "neutral"}>{STAGE_FIELD_LEVEL_LABELS[level]}</CrmLabel>} field={{ ...field, required: level === "required" }} options={options.get(field.id) ?? []} value={values[field.key]} disabled={disabled} onSave={(value) => onSave(field.key, value)} />;
    })}
    {formRules.filter((r) => !r.fieldKey.startsWith("custom:")).map((r) => <CrmSection key={r.id} title={stageFieldLabel(r.fieldKey, fields)} action={<CrmLabel color={r.level === "required" ? "red" : r.level === "important" ? "amber" : "neutral"}>{STAGE_FIELD_LEVEL_LABELS[r.level]}</CrmLabel>}>{renderBuiltIn ? renderBuiltIn(r.fieldKey) : <p>Preencha nos dados do negócio.</p>}</CrmSection>)}
    {formRules.length === 0 && <p className={styles.empty}>Tudo pronto por aqui. Esta etapa não solicita informações adicionais.</p>}
    {commercialRules.length > 0 && <div className={styles.commercial}><Icon name="briefcase" /><div><strong>Condições para avançar</strong>{commercialRules.map((rule) => <p key={rule.id}>{stageFieldLabel(rule.fieldKey, fields)} · {STAGE_FIELD_LEVEL_LABELS[rule.level]}</p>)}{onOpenCommercial ? <Button variant="ghost" size="sm" shape="rounded" onClick={onOpenCommercial}>Ver itens e valores <Icon name="right" /></Button> : <p>Confira os valores no cadastro e os itens após criar o negócio.</p>}</div></div>}
  </CrmPhase>;
}
