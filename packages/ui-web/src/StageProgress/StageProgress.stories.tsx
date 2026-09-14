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
  return <StageProgress stages={stages} currentId={current} currentHint="6 dias nesta etapa" onSelect={setCurrent} />;
};
export const Primeira = () => <StageProgress stages={stages} currentId="new" currentHint="hoje" onSelect={() => {}} />;
export const Ganho = () => <StageProgress stages={stages} currentId="negotiation" outcome="won" />;
export const Perdido = () => <StageProgress stages={stages} currentId="proposal" outcome="lost" />;
export const SomenteLeitura = () => <StageProgress stages={stages} currentId="contact" currentHint="12 dias nesta etapa" />;
