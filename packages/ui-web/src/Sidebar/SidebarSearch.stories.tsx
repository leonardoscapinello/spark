import { useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "../Icon/Icon.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { Sidebar, SidebarItem, SidebarSearch, SidebarSection } from "./Sidebar.js";

const meta = {
  title: "Navegação/Busca da área",
  component: SidebarSearch,
  args: { label: "Buscar conversas", placeholder: "Buscar conversas", value: "", onValueChange: () => undefined, shortcut: "/" },
  parameters: { docs: { description: { component: "A busca da área mora no alto da sidebar e é um campo de verdade (SearchField), não um item que abre outra coisa. `shortcut` liga a tecla e a mostra no campo; ela não age enquanto se digita em outro campo." } } },
} satisfies Meta<typeof SidebarSearch>;
export default meta;
type Story = StoryObj<typeof meta>;

function Area({ inicial = "", carregando = false }: { inicial?: string; carregando?: boolean }) {
  const [query, setQuery] = useState(inicial);
  return <Sidebar title="Atendimento">
    <SidebarSearch label="Buscar conversas" placeholder="Buscar conversas" value={query} onValueChange={setQuery} shortcut="/" loading={carregando} />
    <SidebarItem href="#abertas" active icon={<Icon name="inbox" />} count={12}>Abertas</SidebarItem>
    <SidebarItem href="#minhas" icon={<Icon name="user" />} count={3}>Minhas conversas</SidebarItem>
    <SidebarItem href="#nao-atribuidas" icon={<Icon name="users" />} count={5}>Não atribuídas</SidebarItem>
    <SidebarSection title="Canais">
      <SidebarItem href="#wa" icon={<Icon name="whatsapp" />} count={7}>WhatsApp Vendas</SidebarItem>
      <SidebarItem href="#ig" icon={<Icon name="instagram" />} count={4}>Instagram Loja Centro</SidebarItem>
    </SidebarSection>
  </Sidebar>;
}

/** Com controles: rótulo, convite, atalho, carregando, desabilitado. Aperte «/» fora do campo. */
export const Interativo: Story = { render: (args) => <Interativa {...args} /> };

function Interativa(props: ComponentProps<typeof SidebarSearch>) {
  const [query, setQuery] = useState(props.value);
  return <Mesa largura={236}><SidebarSearch {...props} value={query} onValueChange={setQuery} /></Mesa>;
}

/** Os estados do campo lado a lado e o campo dentro da sidebar. */
export const Variantes: Story = {
  render: () => <Prancha>
    <Secao titulo="Estados" descricao="Pílula cavada de 40 com lupa; sem texto, o atalho em kbd; com texto, o × de 28 (Esc também limpa).">
      <Fileira rotulo="Vazia, com atalho"><Mesa largura={236}><SidebarSearch label="Buscar conversas" placeholder="Buscar conversas" value="" onValueChange={() => undefined} shortcut="/" /></Mesa></Fileira>
      <Fileira rotulo="Com texto"><Mesa largura={236}><SidebarSearch label="Buscar conversas" placeholder="Buscar conversas" value="Carla" onValueChange={() => undefined} /></Mesa></Fileira>
      <Fileira rotulo="Buscando"><Mesa largura={236}><SidebarSearch label="Buscar conversas" placeholder="Buscar conversas" value="Carla" loading onValueChange={() => undefined} /></Mesa></Fileira>
      <Fileira rotulo="Desabilitada"><Mesa largura={236}><SidebarSearch label="Buscar conversas" placeholder="Buscar conversas" value="" disabled onValueChange={() => undefined} /></Mesa></Fileira>
      <Fileira rotulo="Texto longo"><Mesa largura={236}><SidebarSearch label="Buscar conversas" placeholder="Buscar conversas" value="Instagram Loja Centro pós-venda troca" onValueChange={() => undefined} /></Mesa></Fileira>
    </Secao>
    <Secao titulo="Na sidebar">
      <Fileira rotulo="Atendimento" topo><Area /></Fileira>
    </Secao>
  </Prancha>,
};

/** A busca dentro da sidebar do atendimento. */
export const NaSidebar: Story = { name: "Na sidebar", render: () => <Area /> };
/** Resultado chegando: o ensō de 14 antes do ×. */
export const Buscando: Story = { render: () => <Area inicial="Carla" carregando /> };
