import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Matriz, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { ChannelChip, type ChannelKind } from "./ChannelChip.js";

const meta = {
  title: "Dados/Canal da pessoa",
  component: ChannelChip,
  args: { channel: "whatsapp", title: "WhatsApp Vendas", handle: "+55 11 98765-4321" },
  argTypes: { channel: { control: "select", options: ["whatsapp", "instagram", "messenger", "telegram", "email", "widget", "phone", "manual"] } },
  parameters: { docs: { description: { component: "Cada caixa por onde a pessoa fala: glifo do canal, nome da caixa e o endereço dela. Três caixas de Instagram são três canais — nunca só o ícone." } } },
} satisfies Meta<typeof ChannelChip>;
export default meta;
type Story = StoryObj<typeof meta>;

const CANAIS: readonly { channel: ChannelKind; title: string; handle: string | null }[] = [
  { channel: "whatsapp", title: "WhatsApp Vendas", handle: "+55 11 98765-4321" },
  { channel: "instagram", title: "Instagram Loja Centro", handle: "@carla.menezes" },
  { channel: "messenger", title: "Messenger", handle: null },
  { channel: "telegram", title: "Telegram", handle: "@carlam" },
  { channel: "email", title: "E-mail Suporte", handle: "carla@acme.com.br" },
  { channel: "widget", title: "Chat do site", handle: null },
  { channel: "phone", title: "Telefone", handle: "+55 11 3456-7890" },
  { channel: "manual", title: "Manual", handle: null },
];

/** Troque canal, caixa, endereço e estado nos controles. Com `onSelect`, o chip vira botão. */
export const Interativo: Story = { args: { selected: true, onSelect: () => undefined } };

/** Canal × estado: escolhido (por onde a resposta sai), disponível, sem conversa ainda, desabilitado e só leitura. */
export const Variantes: Story = {
  render: () => <Prancha>
    <Secao titulo="Canal × estado" descricao="Etiqueta cavada de 26; a escolhida vira folha pousada. Canal que a pessoa tem e nunca usou fica só no contorno.">
      <Matriz colunas={["Escolhido", "Disponível", "Sem conversa", "Desabilitado", "Só leitura"]} linhas={CANAIS.map((item) => ({
        rotulo: item.title,
        celulas: [
          <ChannelChip key="e" {...item} selected onSelect={() => undefined} />,
          <ChannelChip key="d" {...item} onSelect={() => undefined} />,
          <ChannelChip key="s" {...item} idle />,
          <ChannelChip key="x" {...item} disabled onSelect={() => undefined} />,
          <ChannelChip key="l" {...item} />,
        ],
      }))} />
    </Secao>
  </Prancha>,
};

/** Por onde responder: escolha uma caixa; a folha muda de chip. */
export const PorOndeResponder: Story = { name: "Por onde responder", render: () => <Escolha /> };

function Escolha() {
  const [route, setRoute] = useState("wa");
  const caixas = [
    { id: "wa", channel: "whatsapp", title: "WhatsApp Vendas", handle: "+55 11 98765-4321" },
    { id: "ig1", channel: "instagram", title: "Instagram Loja Centro", handle: "@carla.menezes" },
    { id: "ig2", channel: "instagram", title: "Instagram Outlet", handle: "@carla.menezes" },
    { id: "ig3", channel: "instagram", title: "Instagram Atacado", handle: "@carla.menezes" },
  ] as const;
  return <div role="group" aria-label="Canais de Carla" style={{ display: "flex", flexWrap: "wrap", gap: 6, maxWidth: 640 }}>
    {caixas.map((item) => <ChannelChip key={item.id} channel={item.channel} title={item.title} handle={item.handle} selected={route === item.id} onSelect={() => setRoute(item.id)} />)}
    <ChannelChip channel="email" title="E-mail" handle="carla@acme.com.br" idle />
  </div>;
}

/** Nome de caixa e endereço longos: cortam com reticências dentro do chip. */
export const TextoLongo: Story = { name: "Texto longo", args: { channel: "instagram", title: "Instagram Loja Centro Shopping Iguatemi Campinas", handle: "@maria.eduarda.albuquerque.figueiredo", selected: true, onSelect: () => undefined } };

/** Muitos canais numa coluna estreita: quebram linha, nada sai da caixa. */
export const Estreita: Story = {
  render: () => <Mesa largura={280}><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{CANAIS.map((item, index) => <ChannelChip key={item.title} {...item} selected={index === 0} onSelect={() => undefined} />)}</div></Mesa>,
};

/** Só os glifos, para conferir o traço de cada canal. */
export const Glifos: Story = {
  render: () => <Prancha><Secao titulo="Glifos dos canais"><Fileira rotulo="Sem endereço">{CANAIS.map((item) => <ChannelChip key={item.title} channel={item.channel} title={item.title} />)}</Fileira></Secao></Prancha>,
};
