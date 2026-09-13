import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { BackLink } from "../BackLink/BackLink.js";
import { Button } from "../Button/Button.js";
import { RecordPageHeader } from "./RecordHero.js";

const meta: StoryMeta<typeof RecordPageHeader> = {
  title: "Fundamentos/Cabeçalho de registro",
  component: RecordPageHeader,
  decorators: [(Story) => <div style={{ padding: "var(--space-8)", background: "var(--color-surface)" }}><Story /></div>],
  args: {
    back: <BackLink render={<a href="#pessoas" />}>Pessoas</BackLink>,
    icon: "user",
    avatarName: "Maria Oliveira",
    eyebrow: "Pessoa",
    title: "Maria Oliveira",
    description: "maria@empresa.com · (11) 99999-9999",
    actions: <Button variant="secondary">Editar pessoa</Button>,
    metrics: [{ label: "Pontuação", value: 87, icon: "star" }, { label: "Etapa", value: "Qualificado", icon: "check" }, { label: "Empresa", value: "Acme Brasil", icon: "building" }],
  },
};

export default meta;
type Story = StoryObj<typeof RecordPageHeader>;
export const Pessoa: Story = {};
export const Empresa: Story = { args: { back: <BackLink render={<a href="#empresas" />}>Empresas</BackLink>, icon: "building", avatarName: "", eyebrow: "Empresa", title: "Acme Brasil", description: "Acme Serviços Ltda.", actions: <Button variant="secondary">Editar empresa</Button>, metrics: [{ label: "Pessoas", value: 12 }, { label: "Negócios", value: 4 }, { label: "Valor em aberto", value: "R$ 85.000,00" }] } };
