import { useState } from "react";
import type { Meta } from "@storybook/react-vite";
import { StageProgress } from "./StageProgress.js";

const meta: Meta<typeof StageProgress> = { title: "Dados/Trilha de etapas", component: StageProgress };
export default meta;

const stages = [
  { id: "new", label: "Novo" },
  { id: "contact", label: "Contato feito" },
  { id: "qualified", label: "Qualificado" },
  { id: "proposal", label: "Proposta enviada" },
  { id: "negotiation", label: "Negociação" },
];

export const Interativa = () => {
  const [current, setCurrent] = useState("qualified");
  return <StageProgress stages={stages} currentId={current} durations={{ new: "2 dias", contact: "5 dias", qualified: "6 dias" }} onSelect={setCurrent} />;
};
export const Primeira = () => <StageProgress stages={stages} currentId="new" durations={{ new: "agora" }} onSelect={() => {}} />;
export const Ganho = () => <StageProgress stages={stages} currentId="negotiation" outcome="won" />;
export const Perdido = () => <StageProgress stages={stages} currentId="proposal" outcome="lost" />;
export const SomenteLeitura = () => <StageProgress stages={stages} currentId="contact" durations={{ new: "3 dias", contact: "12 dias" }} />;
export const MuitasEtapas = () => <StageProgress stages={[...stages, { id: "legal", label: "Validação jurídica" }, { id: "contract", label: "Contrato enviado" }]} currentId="proposal" durations={{ new: "12 min", contact: "2 h", qualified: "1 dia", proposal: "42 s" }} details={{ proposal: { duration: "42 segundos", period: "Desde 14:35" } }} onSelect={() => {}} />;
