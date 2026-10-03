import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Fileira, Matriz, Prancha, Secao } from "../storybook/Prancha.js";
import { Checkbox } from "./Checkbox.js";

const meta = {
  title: "Escolhas/Caixa de seleção",
  component: Checkbox,
  args: { children: "Selecionar conversa", disabled: false, defaultChecked: false },
  parameters: {
    docs: { description: { component: "Caixa de 20 em squircle, cavada. Ligada, vira carvão em 310 ms e o ✓ é desenhado num traço 60 ms depois. Indeterminada mostra um traço." } },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {};

export const Estados: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Estados" descricao="Clique para ver o traço do ✓ sendo desenhado.">
        <Matriz
          colunas={["Desligada", "Ligada", "Indeterminada"]}
          linhas={[
            { rotulo: "Habilitada", celulas: [<Checkbox>Opção</Checkbox>, <Checkbox defaultChecked>Opção</Checkbox>, <Checkbox indeterminate>Opção</Checkbox>] },
            { rotulo: "Desabilitada", celulas: [<Checkbox disabled>Opção</Checkbox>, <Checkbox disabled defaultChecked>Opção</Checkbox>, <Checkbox disabled indeterminate>Opção</Checkbox>] },
          ]}
        />
      </Secao>
    </Prancha>
  ),
};

function Grupo() {
  const canais = ["E-mail", "WhatsApp", "Instagram", "Chat do site"];
  const [marcados, setMarcados] = useState<string[]>(["E-mail"]);
  const todos = marcados.length === canais.length;
  const alguns = marcados.length > 0 && !todos;
  return (
    <Fileira rotulo="Selecionar todos" coluna>
      <Checkbox checked={todos} indeterminate={alguns} onCheckedChange={ligado => setMarcados(ligado ? canais : [])}>Todos os canais</Checkbox>
      {canais.map(canal => (
        <Checkbox key={canal} checked={marcados.includes(canal)} onCheckedChange={ligado => setMarcados(atual => (ligado ? [...atual, canal] : atual.filter(item => item !== canal)))}>{canal}</Checkbox>
      ))}
    </Fileira>
  );
}

export const GrupoComTodos: Story = {
  name: "Grupo com selecionar todos",
  render: () => <Prancha><Secao titulo="Seleção em grupo" descricao="O pai fica indeterminado quando só parte está marcada."><Grupo /></Secao></Prancha>,
};

export const RotuloLongo: Story = {
  name: "Rótulo longo",
  args: { children: "Enviar um resumo diário com as conversas sem resposta há mais de 24 horas para toda a equipe" },
  decorators: [Story => <div style={{ maxWidth: 320 }}><Story /></div>],
};
