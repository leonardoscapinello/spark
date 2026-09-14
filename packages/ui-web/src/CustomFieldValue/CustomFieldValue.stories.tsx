import { useState } from "react";
import type { Meta } from "@storybook/react-vite";
import { CUSTOM_FIELD_TYPES, type CustomFieldDefinition, type CustomFieldType } from "@spark/core";
import { CustomFieldValue } from "./CustomFieldValue.js";

const meta: Meta<typeof CustomFieldValue> = { title: "Dados/Campo personalizado", component: CustomFieldValue };
export default meta;

const define = (type: CustomFieldType, label: string, options: string[] = []): CustomFieldDefinition =>
  ({ id: `f-${type}`, key: type, label, type, options, required: false, archivedAt: null } as unknown as CustomFieldDefinition);

const LABELS: Record<CustomFieldType, string> = {
  text: "Cargo", paragraph: "Observações", number: "Assentos", currency: "Ticket médio",
  date: "Renovação", datetime: "Próxima reunião", phone: "Telefone comercial", url: "Site",
  boolean: "Contrato assinado", single_select: "Plano", multi_select: "Interesses",
};

export const TodosOsTipos = () => {
  const [values, setValues] = useState<Record<string, unknown>>({ currency: 249900, boolean: true, single_select: "Pro" });
  return <div style={{ display: "grid", gap: 8, maxWidth: 560 }}>
    {CUSTOM_FIELD_TYPES.map((type) => {
      const field = define(type, LABELS[type], type.includes("select") ? ["Básico", "Pro", "Enterprise"] : []);
      return <CustomFieldValue key={type} field={field} value={values[type]} onSave={async (next) => { setValues((current) => ({ ...current, [type]: next })); }} />;
    })}
  </div>;
};

export const Bloqueado = () => <CustomFieldValue field={define("currency", "Ticket médio")} value={249900} disabled onSave={async () => {}} />;
