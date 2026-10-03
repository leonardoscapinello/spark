import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Avatar } from "../Avatar/Avatar.js";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Fileira, Palco, Prancha, Secao } from "../storybook/Prancha.js";
import { DropdownButton, Menu, MenuButton, MenuCheckboxItem, MenuContent, MenuGroup, MenuIdentity, MenuItem, MenuNote, MenuSeparator, MenuSubmenu, MenuTrigger, SplitButton } from "./Menu.js";

const PESSOAS = ["Ana Souza", "Rafael Lima", "Beatriz Nogueira", "Carlos Dias"];

function Anatomia() {
  const [carimbos, setCarimbos] = useState(true);
  return (
    <>
      <MenuIdentity name="Ana Souza" detail="ana@aurora.com.br" />
      <MenuSeparator />
      <MenuGroup label="Conversa">
        <MenuItem icon={<Icon name="user" />} shortcut="A">Atribuir</MenuItem>
        <MenuItem icon={<Icon name="inbox" />}>Mover para a caixa</MenuItem>
        <MenuSubmenu label="Exportar">
          <MenuItem icon={<Icon name="file" />}>PDF</MenuItem>
          <MenuItem icon={<Icon name="download" />}>CSV</MenuItem>
        </MenuSubmenu>
      </MenuGroup>
      <MenuSeparator />
      <MenuCheckboxItem checked={carimbos} onCheckedChange={setCarimbos}>Mostrar horário das mensagens</MenuCheckboxItem>
      <MenuItem disabled icon={<Icon name="lock" />}>Recurso indisponível</MenuItem>
      <MenuNote>Arquivar remove a conversa da caixa, sem apagar.</MenuNote>
      <MenuSeparator />
      <MenuItem danger icon={<Icon name="trash" />}>Excluir conversa</MenuItem>
    </>
  );
}

const meta = {
  title: "Camadas/Menu",
  component: MenuButton,
  subcomponents: { Menu, MenuTrigger, MenuContent, MenuItem, MenuGroup, MenuSeparator, MenuCheckboxItem, MenuSubmenu, MenuIdentity, MenuNote, DropdownButton, SplitButton },
  args: { children: "Ações", variant: "secondary", menu: <Anatomia /> },
  argTypes: { menu: { control: false }, variant: { control: "inline-radio", options: ["primary", "secondary", "ghost"] } },
  parameters: {
    docs: { description: { component: "Todo menu do sistema: o mesmo vidro de lista, o mesmo estalo de 380 ms ao abrir e a saída de 240 ms, itens de 36 com ícone ou avatar no encaixe de 24, grupo com título, separador, nota informativa, perigo em shu." } },
  },
} satisfies Meta<typeof MenuButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const noPalco: Story["decorators"] = [Story => <Palco altura={460}><Story /></Palco>];

export const Interativo: Story = { decorators: noPalco };

export const Aberto: Story = {
  name: "Anatomia (aberto)",
  tags: ["!autodocs"],
  decorators: noPalco,
  render: () => (
    <Menu defaultOpen>
      <MenuTrigger render={<Button variant="secondary" trailingIcon={<Icon name="chevronDown" />}>Mais opções</Button>} />
      <MenuContent><Anatomia /></MenuContent>
    </Menu>
  ),
};

export const Pessoas: Story = {
  name: "Pessoas (responsável e seguidores)",
  tags: ["!autodocs"],
  decorators: noPalco,
  render: () => (
    <Fileira rotulo="Mesmo encaixe">
      <MenuButton variant="secondary" size="lg" icon={<Avatar name="Ana Souza" size="small" />} menu={<MenuGroup label="Responsável pelo negócio">{PESSOAS.map(nome => <MenuItem key={nome} icon={<Avatar name={nome} size="small" />} aria-current={nome === "Ana Souza" ? "true" : undefined}>{nome}</MenuItem>)}<MenuItem icon={<Icon name="close" />}>Sem responsável</MenuItem></MenuGroup>}>Ana Souza</MenuButton>
      <MenuButton variant="secondary" size="lg" icon={<Icon name="team" />} menu={<><MenuGroup label="Seguidores"><MenuNote>Ninguém segue este negócio</MenuNote></MenuGroup><MenuGroup label="Ações"><MenuItem icon={<Icon name="eye" />}>Seguir este negócio</MenuItem><MenuItem icon={<Icon name="plus" />}>Adicionar seguidor</MenuItem></MenuGroup></>}>Seguidores</MenuButton>
    </Fileira>
  ),
};

export const SobreFundoEscuro: Story = {
  name: "Legível sobre fundo escuro",
  tags: ["!autodocs"],
  decorators: noPalco,
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-4)", width: "100%" }}>
      <Menu defaultOpen>
        <MenuTrigger render={<Button variant="secondary" trailingIcon={<Icon name="chevronDown" />}>Etapa</Button>} />
        <MenuContent>
          <MenuGroup label="Mover para"><MenuItem>Novos leads</MenuItem><MenuItem>Qualificados</MenuItem><MenuItem>Proposta</MenuItem></MenuGroup>
          <MenuNote>O negócio leva o histórico junto.</MenuNote>
        </MenuContent>
      </Menu>
      <div aria-hidden="true" style={{ height: 120, borderRadius: "var(--r-lista)", background: "var(--ac)" }} />
    </div>
  ),
};

export const Variacoes: Story = {
  name: "Variações de gatilho",
  render: () => (
    <Prancha>
      <Secao titulo="Gatilhos" descricao="O gatilho é sempre um Button; o menu é o mesmo.">
        <Fileira rotulo="MenuButton">
          <MenuButton variant="secondary" menu={<Anatomia />}>Com seta</MenuButton>
          <MenuButton variant="ghost" indicator={false} menu={<Anatomia />}>Sem seta</MenuButton>
          <MenuButton variant="secondary" icon={<Icon name="user" />} menu={<Anatomia />}>Com ícone</MenuButton>
          <MenuButton variant="ghost" iconOnly indicator={false} icon={<Icon name="more" />} aria-label="Mais ações" menu={<Anatomia />} />
        </Fileira>
        <Fileira rotulo="DropdownButton">
          <DropdownButton trigger={<Button variant="raised" trailingIcon={<Icon name="chevronDown" />}>Gatilho próprio</Button>}><Anatomia /></DropdownButton>
        </Fileira>
        <Fileira rotulo="SplitButton">
          <SplitButton menuLabel="Opções de envio" menu={<><MenuItem>Enviar e fechar</MenuItem><MenuItem>Agendar envio</MenuItem></>}>Enviar</SplitButton>
          <SplitButton variant="secondary" menuLabel="Opções de salvar" menu={<MenuItem>Salvar como…</MenuItem>}>Salvar</SplitButton>
          <SplitButton loading menuLabel="Opções de envio" menu={<MenuItem>Agendar</MenuItem>}>Enviando…</SplitButton>
        </Fileira>
      </Secao>
    </Prancha>
  ),
};
