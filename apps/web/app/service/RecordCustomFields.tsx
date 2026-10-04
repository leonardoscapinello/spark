import type { ComponentProps } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { useNavigate } from "react-router";
import { CUSTOM_FIELD_WRITE_CAPABILITY, WriteCustomFieldValueSchema, type CustomFieldDefinition, type CustomFieldEntity } from "@spark/core";
import { fieldAdministrationControllerWriteContact, fieldAdministrationControllerWriteCompany, fieldAdministrationControllerWriteDeal, fieldAdministrationControllerWriteConversation, fieldAdministrationControllerWriteActivity, fieldAdministrationControllerWriteUser, fieldAdministrationControllerWriteCampaign, fieldAdministrationControllerWriteCycle } from "@spark/api-client";
import { Button, Text, notify } from "@spark/ui-web";
import { getCustomFieldsCollection, getCustomFieldGroupsCollection } from "../lib/custom-fields-collection.client";
import { useCustomFieldOptions, useCustomFieldValues } from "../lib/custom-fields.client";
import { EnrichedCustomFieldValue } from "../lib/company-registrations.client";
import { getSession } from "../lib/auth.client";
import styles from "../routes/settings.module.css";
const writers = { contact: fieldAdministrationControllerWriteContact, company: fieldAdministrationControllerWriteCompany, deal: fieldAdministrationControllerWriteDeal, conversation: fieldAdministrationControllerWriteConversation, activity: fieldAdministrationControllerWriteActivity, user: fieldAdministrationControllerWriteUser, campaign: fieldAdministrationControllerWriteCampaign, service_cycle: fieldAdministrationControllerWriteCycle } satisfies Record<CustomFieldEntity, typeof fieldAdministrationControllerWriteContact>;
export function RecordCustomFields({ entityType, entityId, disabled = false, requirement, onSave }: { entityType: CustomFieldEntity; entityId: string; disabled?: boolean; requirement?: (field: CustomFieldDefinition) => ComponentProps<typeof EnrichedCustomFieldValue>["requirement"]; onSave?: (field: CustomFieldDefinition, value: unknown) => Promise<unknown> }) {
  const navigate = useNavigate();
  const { data: definitions = [] } = useLiveQuery({ query: q => q.from({ row: getCustomFieldsCollection() }) });
  const { data: groups = [] } = useLiveQuery({ query: q => q.from({ row: getCustomFieldGroupsCollection() }).orderBy(({ row }) => row.sortOrder, "asc") });
  const values = useCustomFieldValues(entityType, entityId, definitions);
  const options = useCustomFieldOptions();
  const active = definitions.filter(f => f.entityType === entityType && !f.archivedAt).sort((a,b) => (a.sortOrder ?? 0)-(b.sortOrder ?? 0) || a.label.localeCompare(b.label));
  const canWrite = !disabled && Boolean(getSession()?.capabilities.includes(CUSTOM_FIELD_WRITE_CAPABILITY[entityType]));
  const sections = [{ id: "", name: "Campos personalizados" }, ...groups.filter(g => g.entityType === entityType)];
  return <div className={styles.form}>{sections.map(group => {
    const fields = active.filter(f => (f.groupId ?? "") === group.id);
    if (!fields.length) return null;
    return <div key={group.id} className={styles.form}><Text weight="medium">{group.name}</Text>{fields.map(field => <EnrichedCustomFieldValue key={field.id} layout="inline" field={field} {...(requirement ? { requirement: requirement(field) } : {})} value={values[field.key]} options={options.get(field.id) ?? []} disabled={!canWrite} onSave={async value => { if (onSave) { await onSave(field, value); return; } await writers[entityType](entityId, WriteCustomFieldValueSchema.parse({ fieldId: field.id, value: value ?? null })); }} onError={message => notify({ title: message, tone: "error" })} />)}</div>;
  })}{getSession()?.capabilities.includes("settings:manage") && <Button size="sm" variant="ghost" onClick={() => void navigate(`/admin/data/custom-fields?entity=${entityType}`)}>Gerenciar campos e grupos</Button>}</div>;
}
