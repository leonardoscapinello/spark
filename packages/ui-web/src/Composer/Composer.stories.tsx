import { useState } from "react";
import type { Meta } from "@storybook/react-vite";
import { Composer, ComposerPrompt } from "./Composer.js";
import { Textarea } from "../Textarea/Textarea.js";

const meta: Meta<typeof Composer> = { title: "Dados/Compositor", component: Composer };
export default meta;

const tabs = [
  { id: "atividade", label: "Atividade", icon: "calendar" },
  { id: "nota", label: "Nota", icon: "file" },
  { id: "arquivo", label: "Arquivo", icon: "upload", disabled: true },
] as const;

export const Padrao = () => {
  const [tab, setTab] = useState<string>("atividade");
  const [note, setNote] = useState("");
  return <Composer tabs={tabs} value={tab} onValueChange={setTab}>
    {tab === "atividade"
      ? <ComposerPrompt onClick={() => {}}>Clique aqui para agendar uma atividade…</ComposerPrompt>
      : <Textarea aria-label="Nova nota" rows={note ? 4 : 2} value={note} placeholder="Clique aqui para escrever uma nota…" onChange={(event) => setNote(event.target.value)} />}
  </Composer>;
};
