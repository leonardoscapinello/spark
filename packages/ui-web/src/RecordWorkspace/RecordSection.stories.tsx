import type { Meta, StoryObj } from "@storybook/react-vite";
import { RecordSection } from "./RecordSection.js";
import { Button } from "../Button/Button.js";
import { InlineField, FieldRequirement } from "../InlineField/InlineField.js";

const meta: Meta<typeof RecordSection> = { title: "CRM/Seção da ficha", component: RecordSection, args: { title: "Próximas atividades", count: 2, actions: <Button size="sm">Agendar atividade</Button>, children: "Atividades agendadas e próximas ações." } };
export default meta;
type Story = StoryObj<typeof RecordSection>;
export const Plana: Story = {};
export const EmCartao: Story = { args: { framed: true } };
export const CamposDaEtapa: Story = { render: () => <RecordSection title="Resumo"><InlineField label="Produtos" value="5 produtos" hint={<FieldRequirement level="required" />} /><InlineField label="Origem" value="Prospecção" hint={<FieldRequirement level="important" />} /></RecordSection> };
