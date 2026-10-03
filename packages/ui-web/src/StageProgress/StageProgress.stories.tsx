import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TooltipProvider } from "../Tooltip/Tooltip.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { StageProgress } from "./StageProgress.js";

const stages = [
  { id: "new", label: "Novo" },
  { id: "contact", label: "Contato feito" },
  { id: "qualified", label: "Qualificado" },
  { id: "proposal", label: "Proposta enviada" },
  { id: "negotiation", label: "Negociação" },
];

const meta: Meta<typeof StageProgress> = { title: "Navegação/Trilha de etapas", component: StageProgress, decorators: [(Story) => <TooltipProvider><Story /></TooltipProvider>], args: { stages, currentId: "qualified", durations: { new: "2 dias", contact: "5 dias", qualified: "6 dias" } } };
export default meta;
type Story = StoryObj<typeof StageProgress>;

export const Interativo: Story = {
  render: (args) => {
    function Example() {
      const [current, setCurrent] = useState(args.currentId ?? "qualified");
      return <StageProgress {...args} currentId={current} interaction="modal" onSelect={setCurrent} />;
    }
    return <Example />;
  },
};

export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Estados" descricao="Trilho cavado; a etapa atual é carvão e o carvão desliza; desfecho só com o fundo suave do estado.">
    <Fileira rotulo="Em andamento"><Mesa largura={720}><StageProgress stages={stages} currentId="qualified" durations={{ new: "2 dias", contact: "5 dias", qualified: "6 dias" }} /></Mesa></Fileira>
    <Fileira rotulo="Primeira etapa"><Mesa largura={720}><StageProgress stages={stages} currentId="new" durations={{ new: "agora" }} /></Mesa></Fileira>
    <Fileira rotulo="Ganho"><Mesa largura={720}><StageProgress stages={stages} currentId="negotiation" outcome="won" /></Mesa></Fileira>
    <Fileira rotulo="Perdido"><Mesa largura={720}><StageProgress stages={stages} currentId="proposal" outcome="lost" /></Mesa></Fileira>
    <Fileira rotulo="Etapa travada"><Mesa largura={720}><StageProgress stages={[...stages.slice(0, 4), { id: "negotiation", label: "Negociação", locked: true, lockReason: "Só a gerência move para Negociação." }]} currentId="proposal" onSelect={() => undefined} interaction="modal" /></Mesa></Fileira>
    <Fileira rotulo="Aguardando"><Mesa largura={720}><StageProgress stages={stages} currentId="contact" cooldownRemainingMs={12_000} onSelect={() => undefined} /></Mesa></Fileira>
  </Secao></Prancha>,
};

export const MuitasEtapas: Story = { render: () => <Mesa largura={520}><StageProgress stages={[...stages, { id: "legal", label: "Validação jurídica" }, { id: "contract", label: "Contrato enviado" }]} currentId="proposal" durations={{ new: "12 min", contact: "2 h", qualified: "1 dia", proposal: "42 s" }} details={{ proposal: { duration: "42 segundos", period: "Desde 14:35" } }} onSelect={() => undefined} /></Mesa> };
