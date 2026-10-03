import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Avatar } from "../Avatar/Avatar.js";
import { Button } from "../Button/Button.js";
import { Icon, type IconName } from "../Icon/Icon.js";
import { LinkTabs } from "../LinkTabs/LinkTabs.js";
import { Notification } from "../Notification/Notification.js";
import { PageHeader } from "../PageHeader/PageHeader.js";
import { NavigationRail, RailBrand, RailGroup, RailItem, Sidebar, SidebarItem, SidebarSection } from "../Sidebar/Sidebar.js";
import { AppContent, AppShell } from "./AppShell.js";

const MODULOS: readonly [string, IconName][] = [["Relatórios", "chart"], ["Leads", "user"], ["Atendimento", "inbox"], ["CRM", "briefcase"], ["Automação", "zap"], ["Campanhas", "send"]];
const AREAS = ["Negócios", "Atividades", "Produtos", "Ofertas e descontos"];
const SIMBOLO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9' fill='none' stroke='%231d1b18' stroke-width='1.5'/%3E%3Cpath d='M8 15c2-4 6-4 8 0' fill='none' stroke='%231d1b18' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E";

function Casco({ comSidebar = true, ocupado = false, aviso = false }: { comSidebar?: boolean; ocupado?: boolean; aviso?: boolean }) {
  const [modulo, setModulo] = useState("CRM");
  const [aberto, setAberto] = useState(false);
  const [area, setArea] = useState("Negócios");
  const [visao, setVisao] = useState("Todos os negócios");
  return (
    <div style={{ height: 720 }}>
      <AppShell sidebar={comSidebar ? "visible" : "hidden"} style={{ height: "100%" }}>
        <NavigationRail expanded={aberto} onPointerEnter={() => setAberto(true)} onPointerLeave={() => setAberto(false)}>
          <div style={{ display: "flex", alignItems: "center", height: "var(--h-lg)", marginBottom: 10 }}><RailBrand symbol={SIMBOLO} label="Início" /></div>
          <RailGroup selection={`${modulo}:${aberto}`} style={{ display: "flex", flexDirection: "column", alignItems: aberto ? "stretch" : "center", gap: aberto ? 2 : "var(--space-1-5)", flex: 1 }}>
            {MODULOS.map(([rotulo, icone]) => <RailItem key={rotulo} href={`#${rotulo}`} icon={<Icon name={icone} />} label={rotulo} active={modulo === rotulo} onClick={evento => { evento.preventDefault(); setModulo(rotulo); }} />)}
          </RailGroup>
          <RailGroup selection="" divided style={{ display: "flex", flexDirection: "column", alignItems: aberto ? "stretch" : "center", gap: 2 }}>
            <RailItem icon={<Icon name="search" />} label="Pesquisar" onClick={() => undefined} />
            <RailItem icon={<Avatar name="Leonardo Scapinello" size="small" />} label="Perfil" onClick={() => undefined} />
          </RailGroup>
        </NavigationRail>
        {comSidebar && (
          <Sidebar title={modulo}>
            {["Todos os negócios", "Meus negócios", "Parados há 30 dias"].map(rotulo => <SidebarItem key={rotulo} href={`#${rotulo}`} active={visao === rotulo} icon={<Icon name="briefcase" />} onClick={evento => { evento.preventDefault(); setVisao(rotulo); }}>{rotulo}</SidebarItem>)}
            <SidebarSection title="Funis"><SidebarItem href="#comercial" icon={<Icon name="funnel" />} count={42}>Comercial</SidebarItem></SidebarSection>
          </Sidebar>
        )}
        <AppContent
          busy={ocupado}
          tabs={<LinkTabs placement="sheet" label="Áreas do CRM" items={AREAS.map(rotulo => ({ key: rotulo, label: rotulo, active: area === rotulo, render: <a href={`#${rotulo}`} onClick={evento => { evento.preventDefault(); setArea(rotulo); }} /> }))} />}
          notice={aviso ? <Notification tone="warning" title="3 mensagens aguardando envio" description="Elas saem assim que a conexão voltar." /> : undefined}
        >
          <div key={area} style={{ padding: "var(--space-8)" }}>
            <PageHeader title={area} description="Cada troca de área sobe 8 px em 600 ms ao montar." actions={<Button icon={<Icon name="plus" />}>Novo negócio</Button>} />
          </div>
        </AppContent>
      </AppShell>
    </div>
  );
}

const meta: Meta<typeof AppShell> = {
  title: "Estrutura/Casco do app",
  component: AppShell,
  subcomponents: { AppContent },
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "O casco de todas as telas: trilho de módulos (abre para 196 no hover e empurra a coluna), sidebar da área e folha de conteúdo com as abas da área presas no alto. A tela de layout só decide o que vai em cada lugar. Use a largura Celular na barra de ferramentas para ver o trilho virar pílula." } },
  },
};

export default meta;
type Story = StoryObj<typeof AppShell>;

export const Interativo: Story = { render: () => <Casco /> };
export const SemSidebar: Story = { name: "Sem sidebar", render: () => <Casco comSidebar={false} /> };
export const Navegando: Story = { name: "Navegando e com aviso", render: () => <Casco ocupado aviso /> };
