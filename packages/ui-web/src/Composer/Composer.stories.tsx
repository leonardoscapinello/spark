import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Matriz, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { Textarea } from "../Textarea/Textarea.js";
import { Composer, ComposerPrompt, type ComposerTab } from "./Composer.js";

const meta = {
  title: "Padrões/Compositor",
  component: Composer,
  args: { tabs: [], value: "atividade", onValueChange: () => undefined, children: null, label: "Registrar" },
  parameters: { docs: { description: { component: "Formas de registrar na ficha (atividade, nota, arquivo): trilho cavado com a folha do item ativo deslizando; o corpo troca com a entrada em cascata." } } },
} satisfies Meta<typeof Composer>;
export default meta;
type Story = StoryObj<typeof meta>;

const TABS: readonly ComposerTab[] = [
  { id: "atividade", label: "Atividade", icon: "calendar" },
  { id: "nota", label: "Nota", icon: "file" },
  { id: "arquivo", label: "Arquivo", icon: "upload", disabled: true },
];
const MUITAS: readonly ComposerTab[] = [
  { id: "nota", label: "Nota", icon: "file" },
  { id: "ligacao", label: "Ligação", icon: "phone" },
  { id: "reuniao", label: "Reunião", icon: "users" },
  { id: "tarefa", label: "Tarefa", icon: "check" },
  { id: "email", label: "E-mail", icon: "mail" },
  { id: "almoco", label: "Almoço", icon: "calendar" },
];

function Exemplo({ tabs = TABS, inicial = "atividade", rascunho = "" }: { tabs?: readonly ComposerTab[]; inicial?: string; rascunho?: string }) {
  const [tab, setTab] = useState(inicial);
  const [note, setNote] = useState(rascunho);
  return <Composer tabs={tabs} value={tab} onValueChange={setTab}>
    {tab === "nota"
      ? <Textarea aria-label="Nova nota" rows={note ? 4 : 2} value={note} placeholder="Clique aqui para escrever uma nota…" onChange={(event) => setNote(event.target.value)} />
      : <ComposerPrompt onClick={() => undefined}>Agendar atividade</ComposerPrompt>}
  </Composer>;
}

/** Troque a forma de registrar: a folha desliza até ela. */
export const Interativo: Story = { render: () => <Mesa largura={560}><Exemplo /></Mesa> };

/** Forma ativa × corpo. */
export const Variantes: Story = {
  render: () => <Prancha>
    <Secao titulo="Forma ativa" descricao="Trilho cavado com itens de 30; a folha --sf3 + --sh1 marca a ativa; desabilitada fica em tinta 4.">
      <Matriz colunas={["Convite (atividade)", "Nota vazia", "Nota com rascunho"]} linhas={[{
        rotulo: "Corpo",
        celulas: [
          <Mesa key="a" largura={420}><Exemplo /></Mesa>,
          <Mesa key="n" largura={420}><Exemplo inicial="nota" /></Mesa>,
          <Mesa key="r" largura={420}><Exemplo inicial="nota" rascunho="Retomar na segunda com a proposta revisada." /></Mesa>,
        ],
      }]} />
    </Secao>
  </Prancha>,
};

/** Muitas formas numa coluna estreita: o trilho rola de lado, nada vaza. */
export const Estreita: Story = { render: () => <Mesa largura={320}><Exemplo tabs={MUITAS} inicial="nota" /></Mesa> };
/** Convite desabilitado (sem permissão de registrar). */
export const Desabilitado: Story = { render: () => <Mesa largura={560}><Composer tabs={TABS} value="atividade" onValueChange={() => undefined}><ComposerPrompt disabled onClick={() => undefined}>Você não tem permissão para registrar atividades.</ComposerPrompt></Composer></Mesa> };
