import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { LinkTabs } from "./LinkTabs.js";

const AREAS = [["negocios", "Negócios"], ["atividades", "Atividades"], ["produtos", "Produtos"], ["ofertas", "Ofertas e descontos"]] as const;

function Demo({ pendente = false }: { pendente?: boolean }) {
  const [ativa, setAtiva] = useState<string>("negocios");
  const [indo, setIndo] = useState<string | null>(null);
  return (
    <LinkTabs
      label="Áreas do CRM"
      items={AREAS.map(([chave, rotulo]) => ({
        key: chave,
        label: rotulo,
        active: chave === ativa,
        pending: pendente && chave === indo,
        render: <a href={`#${chave}`} onClick={evento => { evento.preventDefault(); if (pendente) { setIndo(chave); window.setTimeout(() => { setAtiva(chave); setIndo(null); }, 900); } else setAtiva(chave); }} />,
      }))}
    />
  );
}

const meta = {
  title: "Navegação/Abas com link",
  component: LinkTabs,
  args: { label: "Áreas do CRM", items: AREAS.map(([chave, rotulo], indice) => ({ key: chave, label: rotulo, active: indice === 0, href: `#${chave}` })) },
  argTypes: { items: { control: false } },
  parameters: {
    docs: { description: { component: "Abas que navegam entre páginas da área (topo da folha de conteúdo). O traço desliza até a aba ativa; ao clicar, a aba fica pendente até a página chegar." } },
  },
} satisfies Meta<typeof LinkTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = { render: () => <Demo /> };

export const Estados: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Navegação" descricao="Com espera simulada de 900 ms: a aba clicada fica pendente e o traço só desliza quando a página chega.">
        <Fileira rotulo="Imediata"><Demo /></Fileira>
        <Fileira rotulo="Com espera"><Demo pendente /></Fileira>
      </Secao>
      <Secao titulo="Largura estreita"><Mesa largura={300}><Demo /></Mesa></Secao>
    </Prancha>
  ),
};
