import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { RecordHero } from "./RecordHero.js";

const meta: StoryMeta<typeof RecordHero> = {
  title: "Fundamentos/Perfil de registro",
  component: RecordHero,
  args: {
    icon: "building",
    eyebrow: "Empresa",
    title: "Acme Brasil",
    description: "Acme Serviços Ltda.",
    actions: <Button variant="secondary">Editar empresa</Button>,
    metrics: [{ label: "Pessoas", value: 12 }, { label: "Negócios", value: 4 }, { label: "Valor em aberto", value: "R$ 85.000,00" }],
  },
};
export default meta;
type Story = StoryObj<typeof RecordHero>;
export const Empresa: Story = {};
export const Negocio: Story = { args: { icon: "briefcase", eyebrow: "Funil comercial · Proposta", title: "Expansão da conta", description: "Atualizado hoje", actions: <Button variant="secondary">Editar negócio</Button>, metrics: [{ label: "Valor", value: "R$ 35.000,00" }, { label: "Situação", value: "Em aberto" }, { label: "Previsão", value: "28 set 2026" }] } };
export const Pessoa: Story = { args: { icon: "user", avatarName: "Maria Oliveira", eyebrow: "Pessoa", title: "Maria Oliveira", description: "maria@empresa.com", actions: <Button variant="secondary">Editar pessoa</Button>, metrics: [{ label: "Pontuação", value: 87 }, { label: "Etapa", value: "Qualificado" }, { label: "Empresa", value: "Acme Brasil" }] } };
