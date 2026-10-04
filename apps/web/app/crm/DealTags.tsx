import { useState } from "react";
import { tagsControllerSave } from "@spark/api-client";
import { SaveTagInputSchema } from "@spark/core";
import { ActionModal, CRM_COLORS, CrmLabel, Field, Input, Label, Select, CrmSection, TagPicker, notify } from "@spark/ui-web";
import { useTagCatalog } from "../lib/tags.client";
import { getSession } from "../lib/auth.client";
export function DealTags({ value, onChange, disabled = false }: { value: string[]; onChange: (value: string[]) => void; disabled?: boolean }) {
  const catalog = useTagCatalog();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("blue");
  const options = catalog.map((tag) => ({ value: tag.name, label: tag.name, color: tag.color ?? "neutral" }));
  async function createFromQuery(query: string) {
    try {
      const input = SaveTagInputSchema.parse({ name: query, color: "blue" });
      await tagsControllerSave(input);
      if (!value.includes(input.name)) onChange([...value, input.name]);
    } catch {
      notify({ title: "Não foi possível criar a etiqueta", tone: "error" });
    }
  }
  const canManage = !disabled && getSession()?.capabilities.includes("settings:manage");
  return <>
    <TagPicker appearance="inline" label="Etiquetas do negócio" options={options} value={value} onValueChange={onChange} onCreate={canManage ? createFromQuery : undefined} onManage={canManage ? () => setOpen(true) : undefined} disabled={disabled} />
    <ActionModal open={open} onOpenChange={setOpen} title="Criar ou atualizar etiqueta" confirmLabel="Salvar etiqueta" onConfirm={async () => {
      const input = SaveTagInputSchema.parse({ name, color });
      await tagsControllerSave(input);
      if (!value.includes(input.name)) onChange([...value, input.name]);
      setName("");
    }}>
      <CrmSection title="Identificação" description="Use o nome de uma etiqueta existente para atualizar sua cor em todos os registros.">
        <Field><Label>Nome da etiqueta</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field><Label>Cor</Label><Select label="Cor da etiqueta" options={CRM_COLORS} value={color} onValueChange={(v) => { if (v) setColor(v); }} /></Field>
        <CrmLabel color={color}>{name || "Prévia da etiqueta"}</CrmLabel>
      </CrmSection>
    </ActionModal>
  </>;
}
