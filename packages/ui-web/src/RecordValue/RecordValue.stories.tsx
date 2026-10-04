import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { RecordValue } from "./RecordValue.js";
import { PageHeader } from "../PageHeader/PageHeader.js";
import { Button } from "../Button/Button.js";

const meta: Meta<typeof RecordValue> = { title: "CRM/Valor do registro", component: RecordValue, args: { value: "R$ 5.525,32", onClick: () => undefined } };
export default meta;
type Story = StoryObj<typeof RecordValue>;
export const Interativo: Story = {};
export const NoCabecalho: Story = { render: (args) => <PageHeader variant="record" title="Consultoria trimestral" eyebrow="Funil de demonstração · Qualificado" summary={<RecordValue {...args} />} actions={<><Button variant="secondary" tone="success">Ganho</Button><Button variant="secondary" tone="danger">Perdido</Button></>} /> };
export const Atualizacao: Story = { render: function Example(args) {
  const [changed, setChanged] = useState(false);
  return <RecordValue {...args} value={changed ? "R$ 12.725,32" : args.value} onClick={() => setChanged(!changed)} />;
} };
