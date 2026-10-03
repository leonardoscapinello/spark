import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { SlaProgress } from "./SlaProgress.js";
const meta: Meta<typeof SlaProgress> = { title: "Retorno/Prazo de SLA", component: SlaProgress, args: { percent: 42, label: "SLA 42% · 2 h restantes", state: "on_track", compact: false } };
export default meta;
type Story = StoryObj<typeof SlaProgress>;
export const Interativo: Story = { render: (args) => <Mesa largura={240}><SlaProgress {...args} /></Mesa> };
export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Estados" descricao="Trilho cavado de 4px; a cor do estado só no preenchimento.">
    <Fileira rotulo="No prazo"><Mesa largura={240}><SlaProgress percent={42} label="SLA 42% · 2 h restantes" state="on_track" /></Mesa></Fileira>
    <Fileira rotulo="Perto de vencer"><Mesa largura={240}><SlaProgress percent={86} label="SLA 86% · 20 min restantes" state="due_soon" /></Mesa></Fileira>
    <Fileira rotulo="Vencido"><Mesa largura={240}><SlaProgress percent={100} label="SLA vencido há 1 h" state="breached" /></Mesa></Fileira>
    <Fileira rotulo="Começando"><Mesa largura={240}><SlaProgress percent={0} label="SLA 0% · 8 h restantes" state="on_track" /></Mesa></Fileira>
    <Fileira rotulo="Compacto, estreito"><Mesa largura={120}><SlaProgress compact percent={64} label="SLA 64% · 1 h 30 min restantes" state="on_track" /></Mesa></Fileira>
  </Secao></Prancha>,
};
