import { Fragment, type ReactNode } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { type Stage, type Deal, type StageFieldLevel, stageFieldLabel, STAGE_FIELD_LEVEL_LABELS } from "@spark/core";
import { Alert, CrmPhase, CrmSection, Chip, CustomFieldValue, Button, Icon, Text } from "@spark/ui-web";
import { getCustomFieldsCollection } from "../lib/custom-fields-collection.client";
import { getStageFieldRulesCollection } from "../lib/stage-field-rules-collection.client";
import { useCustomFieldOptions } from "../lib/custom-fields.client";
import { StageSettingsButton } from "./StageSettings";
import { getSession } from "../lib/auth.client";

export function PhaseFields({ stage, stages, values, onSave, renderBuiltIn, onOpenCommercial, disabled = false }: {
  stage: Stage; stages: readonly Stage[]; values: NonNullable<Deal["customFields"]>;
  onSave: (key: string, value: unknown) => Promise<void>; disabled?: boolean;
  renderBuiltIn?: (key: string, hint: ReactNode) => ReactNode; onOpenCommercial?: () => void;
}) {
  const { data: fields = [] } = useLiveQuery({ query: (q) => q.from({ fields: getCustomFieldsCollection() }) });
  const { data: rules = [] } = useLiveQuery({ query: (q) => q.from({ rules: getStageFieldRulesCollection() }) });
  const options = useCustomFieldOptions();
  const currentRules = rules.filter((r) => r.stageId === stage.id && r.pipelineId === stage.pipelineId);
  const commercialRules = currentRules.filter((r) => r.fieldKey === "products" || r.fieldKey === "amount");
  const formRules = currentRules.filter((r) => r.fieldKey !== "products" && r.fieldKey !== "amount");
  const selectedFields = fields.filter((f) => f.entityType === "deal" && !f.archivedAt && formRules.some((r) => r.fieldKey === `custom:${f.key}`));
  /* Obrigatório e importante viram um chip com o ponto do estado — a mesma
   * etiqueta do resto do produto, sem cor pintando a linha. */
  const levelBadge = (level: StageFieldLevel) => level === "optional" ? undefined : <Chip size="sm" dot tone={level === "required" ? "danger" : "warning"}>{STAGE_FIELD_LEVEL_LABELS[level]}</Chip>;
  return <CrmPhase name={stage.name} title="Nesta etapa" color={stage.color} count={currentRules.length} action={getSession()?.capabilities.includes("pipelines:manage") ? <StageSettingsButton stage={stage} stages={stages} /> : undefined}>
    {selectedFields.map((field) => {
      const level = formRules.find((r) => r.fieldKey === `custom:${field.key}`)?.level ?? "optional";
      return <CustomFieldValue key={field.id} layout="inline" hint={levelBadge(level)} field={{ ...field, required: level === "required" }} options={options.get(field.id) ?? []} value={values[field.key]} disabled={disabled} onSave={(value) => onSave(field.key, value)} />;
    })}
    {formRules.filter((rule) => !rule.fieldKey.startsWith("custom:")).map((rule) => <Fragment key={rule.id}>{renderBuiltIn ? renderBuiltIn(rule.fieldKey, levelBadge(rule.level)) : <CrmSection title={stageFieldLabel(rule.fieldKey, fields)} action={levelBadge(rule.level)}><Text size="pequeno" tone="secondary">Preencha nos dados do negócio.</Text></CrmSection>}</Fragment>)}
    {currentRules.length === 0 && <Text size="pequeno" tone="muted">Nenhum campo solicitado nesta etapa.</Text>}
    {commercialRules.length > 0 && <Alert tone="info" title="Condições para avançar" action={onOpenCommercial ? <Button variant="ghost" size="sm" trailingIcon={<Icon name="right" />} onClick={onOpenCommercial}>Ver itens e valores</Button> : undefined}>
      {[...commercialRules.map((rule) => `${stageFieldLabel(rule.fieldKey, fields)} · ${STAGE_FIELD_LEVEL_LABELS[rule.level]}`), ...(onOpenCommercial ? [] : ["Confira os valores no cadastro e os itens após criar o negócio."])].join(". ")}
    </Alert>}
  </CrmPhase>;
}
