import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Avatar } from "../Avatar/Avatar.js";
import { Button } from "../Button/Button.js";
import { Icon, type IconName } from "../Icon/Icon.js";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../Menu/Menu.js";
import { Fileira, Prancha, Secao } from "../storybook/Prancha.js";
import { NavigationRail, RailItem, Sidebar, SidebarItem, SidebarSection } from "./Sidebar.js";

const VISOES: readonly [string, IconName, number | undefined][] = [
  ["Sua caixa de entrada", "inbox", 4],
  ["Menções", "message", 0],
  ["Criado por você", "pencil", undefined],
  ["Todas", "list", 128],
  ["Não atribuídas", "user", 12],
  ["Spam", "warn", undefined],
];

function Area() {
  const [ativa, setAtiva] = useState("Sua caixa de entrada");
  const item = (rotulo: string, icone: IconName, contagem?: number) => (
    <SidebarItem key={rotulo} href={`#${rotulo}`} icon={<Icon name={icone} />} count={contagem} active={ativa === rotulo} onClick={evento => { evento.preventDefault(); setAtiva(rotulo); }}>{rotulo}</SidebarItem>
  );
  return (
    <div style={{ height: 640, display: "flex" }}>
      <Sidebar title="Atendimento" actions={<Button variant="ghost" size="sm" iconOnly icon={<Icon name="plus" />} aria-label="Nova visualização" />} footer={<Button variant="ghost" icon={<Icon name="settings" />}>Gerenciar caixas</Button>}>
        {VISOES.map(([rotulo, icone, contagem]) => item(rotulo, icone, contagem))}
        <SidebarSection title="Caixas da equipe">
          {item("WhatsApp · Vendas", "whatsapp", 3)}
          {item("Instagram · Loja Centro", "instagram", 1)}
          {item("E-mail · Financeiro", "mail")}
        </SidebarSection>
        <SidebarSection title="Visualizações" collapsible defaultOpen>
          {item("Prioridade alta", "star", 2)}
          {item("Aguardando cliente", "clock")}
        </SidebarSection>
        <SidebarSection title="Arquivadas" collapsible>
          {item("Resolvidas", "check")}
        </SidebarSection>
      </Sidebar>
    </div>
  );
}

const MODULOS: readonly [string, IconName][] = [["Relatórios", "chart"], ["Atendimento", "inbox"], ["CRM", "briefcase"], ["Pessoas", "users"], ["Automação", "zap"], ["Campanhas", "send"]];

function Trilho({ aberto }: { aberto: boolean }) {
  const [ativo, setAtivo] = useState("Atendimento");
  return (
    <NavigationRail expanded={aberto} style={{ height: "auto" }}>
      {MODULOS.map(([rotulo, icone]) => <RailItem key={rotulo} href={`#${rotulo}`} icon={<Icon name={icone} />} label={rotulo} active={ativo === rotulo} onClick={evento => { evento.preventDefault(); setAtivo(rotulo); }} />)}
      <RailItem icon={<Icon name="search" />} label="Pesquisar" onClick={() => undefined} />
      <Menu>
        <MenuTrigger render={<RailItem icon={<Avatar name="Leonardo Scapinello" size="small" />} label="Perfil" />} />
        <MenuContent><MenuItem icon={<Icon name="settings" />}>Segurança da conta</MenuItem><MenuItem icon={<Icon name="exit" />}>Sair da conta</MenuItem></MenuContent>
      </Menu>
    </NavigationRail>
  );
}

const meta = {
  title: "Navegação/Barra lateral",
  component: Sidebar,
  subcomponents: { SidebarItem, SidebarSection, NavigationRail, RailItem },
  args: { title: "Atendimento", children: null },
  argTypes: { children: { control: false } },
  parameters: {
    docs: { description: { component: "A sidebar da área: folha erguida, itens de 36 em pílula, a seleção é uma folha que desliza até o item ativo em 550 ms. Contagem em mono à direita. Seções com título 11 em --tx3, recolhíveis. O trilho de módulos usa o mesmo item para link, ação e perfil." } },
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = { name: "Sidebar da área", render: () => <Area /> };

export const TrilhoDeModulos: Story = {
  name: "Trilho de módulos",
  render: () => (
    <Prancha>
      <Secao titulo="Fechado e aberto" descricao="Módulo (link), ação (botão) e perfil (gatilho de menu) são o mesmo RailItem e não podem divergir. A pílula ativa desliza entre módulos.">
        <Fileira rotulo="68 e 196" topo>
          <Trilho aberto={false} />
          <div style={{ width: "var(--ui-railFlyoutWidth)" }}><Trilho aberto /></div>
        </Fileira>
      </Secao>
    </Prancha>
  ),
};

export const ItensLongos: Story = {
  name: "Rótulos longos e contagens grandes",
  render: () => (
    <div style={{ height: 360, display: "flex" }}>
      <Sidebar title="Pessoas">
        <SidebarItem href="#a" active icon={<Icon name="users" />} count={12840}>Todas as pessoas cadastradas na organização</SidebarItem>
        <SidebarItem href="#b" icon={<Icon name="star" />} count={7}>Clientes com contrato anual ativo e renovação neste trimestre</SidebarItem>
        <SidebarItem href="#c" icon={<Icon name="clock" />}>Sem atividade há mais de 90 dias</SidebarItem>
      </Sidebar>
    </div>
  ),
};
