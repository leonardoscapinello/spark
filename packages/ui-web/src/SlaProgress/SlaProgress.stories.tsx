import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { SlaProgress, SlaRing } from "./SlaProgress.js";
const meta: Meta<typeof SlaProgress> = { title: "Retorno/Prazo de SLA", component: SlaProgress, args: { percent: 42, label: "SLA 42% · 2 h restantes", state: "on_track", compact: false } };
export default meta;
type Story = StoryObj<typeof SlaProgress>;
export const Interativo: Story = { render: (args) => <Mesa largura={240}><SlaProgress {...args} /></Mesa> };
export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Estados" descricao="Anel discreto: trilho em hairline, a cor do estado só no arco.">
    <Fileira rotulo="No prazo"><Mesa largura={240}><SlaProgress percent={42} label="SLA 42% · 2 h restantes" state="on_track" /></Mesa></Fileira>
    <Fileira rotulo="Perto de vencer"><Mesa largura={240}><SlaProgress percent={86} label="SLA 86% · 20 min restantes" state="due_soon" /></Mesa></Fileira>
    <Fileira rotulo="Em risco (≤ 25%)"><Mesa largura={240}><SlaProgress percent={80} label="Atendimento total" status="Restam 1 h 12 min" detail="4 h 48 min de 6 h úteis" state="at_risk" /></Mesa></Fileira>
    <Fileira rotulo="Crítico (≤ 10%, pulsa)"><Mesa largura={240}><SlaProgress percent={95} label="Primeira resposta" status="Restam 3 min" detail="57 min de 1 h úteis" state="critical" /></Mesa></Fileira>
    <Fileira rotulo="Vencido"><Mesa largura={240}><SlaProgress percent={100} label="SLA vencido há 1 h" state="breached" /></Mesa></Fileira>
    <Fileira rotulo="Começando"><Mesa largura={240}><SlaProgress percent={0} label="SLA 0% · 8 h restantes" state="on_track" /></Mesa></Fileira>
    <Fileira rotulo="Só o anel (rótulo de aba)"><SlaRing percent={63} state="on_track" /></Fileira>
    <Fileira rotulo="Compacto (lista)"><Mesa largura={120}><SlaProgress compact percent={64} label="Atendimento total" detail="3 h 50 min de 6 h úteis · restam 2 h 10 min" state="on_track" /></Mesa></Fileira>
    <Fileira rotulo="Compacto, vencido"><Mesa largura={120}><SlaProgress compact percent={130} label="Primeira resposta" detail="1 h 18 min de 1 h úteis · 18 min em atraso" state="breached" /></Mesa></Fileira>
  </Secao></Prancha>,
};

export const NaSidebar: Story = { render: () => <Mesa largura={240}><SlaProgress percent={25} state="on_track" label="Atendimento total" status="Fora do expediente" detail="4 h de 16 h úteis · restam 12 h" /></Mesa> };
