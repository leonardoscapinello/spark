import { useState } from "react";
import { tagsControllerSave } from "@spark/api-client";
import { SaveTagInputSchema } from "@spark/core";
import { ActionModal, Button, CRM_COLORS, CrmLabel, Field, Input, Label, Select, CrmSection, Icon } from "@spark/ui-web";
import { useTagCatalog } from "../lib/tags.client";
import { getSession } from "../lib/auth.client";
export function DealTags({ value, onChange, disabled = false }: { value: string[]; onChange: (value: string[]) => void; disabled?: boolean }) {
  const catalog = useTagCatalog();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("blue");
  return <CrmSection title="Etiquetas" action={!disabled && getSession()?.capabilities.includes("settings:manage") ? <Button size="sm" variant="ghost" icon={<Icon name="plus" />} onClick={() => setOpen(true)}>Nova etiqueta</Button> : undefined}>
    <Select<true> multiple label="Etiquetas do negócio" placeholder="Adicionar etiquetas" disabled={disabled} value={value} options={catalog.map((t) => ({ value: t.name, label: t.name }))} onValueChange={(v) => onChange(v)} />
    {value.map((name) => <CrmLabel key={name} color={catalog.find((t) => t.name === name)?.color}>{name}</CrmLabel>)}
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
  </CrmSection>;
}
