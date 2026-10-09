import type { ReactNode } from "react";
import type { DealViewer } from "@spark/core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { ChannelChip } from "../ChannelChip/ChannelChip.js";
import { Icon } from "../Icon/Icon.js";
import { Surface } from "../Surface/Surface.js";
import { ViewerStack } from "../ViewerStack/ViewerStack.js";
import { Fileira, Matriz, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { ChatAttachment, ChatDay, ChatThread, ChatTyping, ConversationHeader, MessageBubble, MessageReceipt, type MessageStatus } from "./Chat.js";

const meta = {
  title: "Dados/Conversa",
  component: MessageBubble,
  args: { direction: "inbound", author: "Carla Menezes", time: "09:41", dateTime: "2026-10-02T09:41:00Z", channel: { icon: "whatsapp", label: "WhatsApp Vendas" }, children: "Oi! Pode me mandar o link do plano anual?" },
  argTypes: {
    direction: { control: "inline-radio", options: ["inbound", "outbound", "internal"] },
    status: { control: "select", options: [undefined, "queued", "sent", "delivered", "read", "failed"] },
  },
  parameters: { docs: { description: { component: "A conversa é da pessoa: o histórico junta todos os canais em ordem e cada bolha diz por qual caixa passou. Bolha da pessoa em folha à esquerda, da equipe em carvão à direita, nota interna em papel de aviso." } } },
} satisfies Meta<typeof MessageBubble>;
export default meta;
type Story = StoryObj<typeof meta>;

const STATUS: readonly MessageStatus[] = ["queued", "sent", "delivered", "read", "failed"];
const LONGO = "Oi! Comprei o plano mensal semana passada e queria entender se consigo migrar para o anual sem perder os dias que já paguei, e se o desconto de 20% que vi no story de vocês ainda vale para quem já é cliente. Também preciso da nota fiscal no CNPJ da empresa.";

function Painel({ children, largura = 640, altura = 640 }: { children: ReactNode; largura?: number; altura?: number }) {
  return <Surface style={{ display: "flex", flexDirection: "column", width: largura, maxWidth: "100%", height: altura, overflow: "hidden" }}>{children}</Surface>;
}

function Cabecalho({ name = "Carla Menezes", presence = false }: { name?: string; presence?: boolean }) {
  return <ConversationHeader
    name={name}
    subtitle="Dúvida sobre o plano · Aberta"
    channels={<>
      <ChannelChip channel="whatsapp" title="WhatsApp Vendas" handle="+55 11 98765-4321" selected onSelect={() => undefined} />
      <ChannelChip channel="instagram" title="Instagram Loja Centro" handle="@carla.menezes" onSelect={() => undefined} />
      <ChannelChip channel="email" title="E-mail" handle="carla@acme.com.br" idle />
      <ChannelChip channel="telegram" title="Telegram" idle />
      <ChannelChip channel="messenger" title="Messenger" idle />
      <ChannelChip channel="widget" title="Chat do site" idle />
    </>}
    {...(presence ? { presence: <ViewerStack status="connected" viewers={[{ userId: "00000000-0000-7000-8000-000000000001" as DealViewer["userId"], name: "Carlos Dias", avatarUrl: null }, { userId: "00000000-0000-7000-8000-000000000002" as DealViewer["userId"], name: "Beatriz Lopes", avatarUrl: null }]} /> } : {})}
    actions={<><Button variant="ghost" size="sm" iconOnly icon={<Icon name="settings" />} aria-label="Ferramentas da conversa" /><Button variant="secondary" size="sm" icon={<Icon name="check" />}>Fechar</Button></>}
  />;
}

function Historico() {
  return <>
    <ChatDay>Ontem</ChatDay>
    <MessageBubble direction="inbound" author="Carla Menezes" time="18:02" dateTime="2026-10-01T18:02:00Z" channel={{ icon: "instagram", label: "Instagram Loja Centro" }}>Vi o plano anual no story de vocês. Tem desconto?</MessageBubble>
    <MessageBubble direction="outbound" author="Ana Souza" time="18:10" dateTime="2026-10-01T18:10:00Z" channel={{ icon: "instagram", label: "Instagram Loja Centro" }} status="read">Tem sim! 20% no anual. Quer que eu mande os detalhes?</MessageBubble>
    <ChatDay>Hoje</ChatDay>
    <MessageBubble direction="inbound" author="Carla Menezes" time="09:41" dateTime="2026-10-02T09:41:00Z" channel={{ icon: "whatsapp", label: "WhatsApp Vendas" }}>Oi! Prefiro falar por aqui. Pode me mandar o link?</MessageBubble>
    <MessageBubble direction="internal" author="Ana Souza" time="09:43" dateTime="2026-10-02T09:43:00Z">Cliente veio do Instagram, já ofereci 20%.</MessageBubble>
    <MessageBubble direction="outbound" author="Ana Souza" time="09:45" dateTime="2026-10-02T09:45:00Z" channel={{ icon: "whatsapp", label: "WhatsApp Vendas" }} status="delivered">Claro, segue o link do plano anual.</MessageBubble>
  </>;
}

/** Uma bolha com todos os controles: direção, autor, hora, caixa, recibo e texto. */
export const Interativo: Story = { render: (args) => <Mesa largura={560}><ChatThread label="Exemplo"><MessageBubble {...args} /></ChatThread></Mesa> };

/** Direção × conteúdo, recibos, cabeçalho e anexos lado a lado. */
export const Variantes: Story = {
  render: () => <Prancha>
    <Secao titulo="Bolha: direção × conteúdo" descricao="Raio 22 com o canto de origem em 8; texto 13/1.5; embaixo, autor · hora · caixa em 11, tinta 3.">
      <Matriz colunas={["Texto curto", "Texto longo", "Com anexo", "Só anexo"]} linhas={(["inbound", "outbound", "internal"] as const).map((direction) => ({
        rotulo: direction === "inbound" ? "Da pessoa" : direction === "outbound" ? "Da equipe" : "Nota interna",
        celulas: [
          <Mesa key="c" largura={300}><MessageBubble direction={direction} author="Ana Souza" time="09:45" dateTime="2026-10-02T09:45:00Z" channel={{ icon: "whatsapp", label: "WhatsApp Vendas" }} {...(direction === "outbound" ? { status: "read" as const } : {})}>Claro, segue o link.</MessageBubble></Mesa>,
          <Mesa key="l" largura={300}><MessageBubble direction={direction} author="Ana Souza" time="09:45" dateTime="2026-10-02T09:45:00Z" channel={{ icon: "instagram", label: "Instagram Loja Centro" }}>{LONGO}</MessageBubble></Mesa>,
          <Mesa key="a" largura={300}><MessageBubble direction={direction} author="Ana Souza" time="09:45" dateTime="2026-10-02T09:45:00Z" attachment={<ChatAttachment state={{ status: "ready", url: "#contrato", mimeType: "application/pdf", name: "contrato-anual.pdf" }} />}>Segue o contrato.</MessageBubble></Mesa>,
          <Mesa key="s" largura={300}><MessageBubble direction={direction} author="Ana Souza" time="09:45" dateTime="2026-10-02T09:45:00Z" attachment={<ChatAttachment state={{ status: "ready", url: "https://picsum.photos/480/320", mimeType: "image/jpeg", name: "foto do produto" }} />} /></Mesa>,
        ],
      }))} />
    </Secao>
    <Secao titulo="Recibo da mensagem enviada" descricao="Em português, nunca o código técnico: um ✓ enviada, dois ✓✓ entregue, dois em azul lida; na fila é um relógio; falha é texto em vermelho.">
      <Matriz colunas={STATUS.map((status) => ({ queued: "Na fila", sent: "Enviada", delivered: "Entregue", read: "Lida", failed: "Falhou", received: "Recebida", draft: "Rascunho" })[status])} linhas={[
        { rotulo: "Recibo", celulas: STATUS.map((status) => <MessageReceipt key={status} status={status} />) },
        { rotulo: "Na bolha", celulas: STATUS.map((status) => <MessageBubble key={status} direction="outbound" author="Ana" time="09:45" dateTime="2026-10-02T09:45:00Z" status={status}>Ok!</MessageBubble>) },
      ]} />
    </Secao>
    <Secao titulo="Anexo" descricao="Imagem, vídeo e áudio tocam na bolha; o resto vira link para baixar.">
      <Fileira rotulo="Carregando"><MessageBubble direction="inbound" author="Carla" attachment={<ChatAttachment state={{ status: "loading" }} />} /></Fileira>
      <Fileira rotulo="Falhou"><MessageBubble direction="inbound" author="Carla" attachment={<ChatAttachment state={{ status: "error" }} />} /></Fileira>
      <Fileira rotulo="Arquivo"><MessageBubble direction="inbound" author="Carla" attachment={<ChatAttachment state={{ status: "ready", url: "#nota", mimeType: "application/pdf", name: "nota-fiscal-1234.pdf" }} />} /></Fileira>
      <Fileira rotulo="Áudio"><Mesa largura={360}><MessageBubble direction="inbound" author="Carla" attachment={<ChatAttachment state={{ status: "ready", url: "#audio", mimeType: "audio/ogg", name: "áudio" }} />} /></Mesa></Fileira>
    </Secao>
    <Secao titulo="Cabeçalho da conversa" descricao="Avatar 40, nome 15/500, apoio em tinta 3 e as caixas da pessoa embaixo do nome.">
      <Fileira rotulo="Com canais"><Painel altura={150}><Cabecalho /></Painel></Fileira>
      <Fileira rotulo="Com presença"><Painel altura={150}><Cabecalho presence /></Painel></Fileira>
      <Fileira rotulo="Nome longo"><Painel largura={460} altura={190}><Cabecalho name="Maria Eduarda Albuquerque de Vasconcelos Figueiredo" /></Painel></Fileira>
      <Fileira rotulo="Sem canais"><Painel altura={110}><ConversationHeader name="Rafael Lima" subtitle="Conversa manual · Aberta" /></Painel></Fileira>
    </Secao>
    <Secao titulo="Digitando">
      <Fileira rotulo="Equipe"><ChatTyping>Carlos está digitando…</ChatTyping></Fileira>
    </Secao>
  </Prancha>,
};

/** A conversa da pessoa: cabeçalho com as caixas dela e o histórico de todos os canais, em ordem. */
export const ConversaDaPessoa: Story = { name: "Conversa da pessoa", render: () => <Painel><Cabecalho /><ChatThread label="Conversa com Carla Menezes" threadKey="carla"><Historico /></ChatThread><ChatTyping>Carlos está digitando…</ChatTyping></Painel> };

/** Conversa nova: a frase curta no centro do histórico. */
export const Vazia: Story = { render: () => <Painel altura={420}><ConversationHeader name="Rafael Lima" subtitle="Segunda via do boleto · Aberta" /><ChatThread label="Conversa com Rafael Lima" empty="Conversa iniciada. Registre o contexto do atendimento numa nota para a equipe." /></Painel> };

/** 200 mensagens: a rolagem começa no fim, perto do campo de resposta. */
export const DuzentasMensagens: Story = {
  name: "200 mensagens",
  render: () => <Painel><Cabecalho /><ChatThread label="Conversa longa" threadKey="longa">
    {Array.from({ length: 200 }, (_, index) => <MessageBubble key={index} direction={index % 3 === 0 ? "outbound" : "inbound"} author={index % 3 === 0 ? "Ana Souza" : "Carla Menezes"} time={`${String(8 + Math.floor(index / 20)).padStart(2, "0")}:${String((index * 3) % 60).padStart(2, "0")}`} dateTime="2026-10-02T09:00:00Z" channel={{ icon: index % 2 ? "whatsapp" : "instagram", label: index % 2 ? "WhatsApp Vendas" : "Instagram Loja Centro" }} {...(index % 3 === 0 ? { status: "read" as const } : {})}>{index % 5 === 0 ? LONGO : `Mensagem ${index + 1}`}</MessageBubble>)}
  </ChatThread></Painel>,
};

/** Coluna estreita (celular): a bolha ocupa até 78%, o cabeçalho quebra as ações para baixo. */
export const Estreita: Story = { render: () => <Painel largura={360}><Cabecalho /><ChatThread label="Conversa com Carla Menezes" threadKey="estreita"><Historico /></ChatThread></Painel> };

/** Falha de envio: o recibo vira texto em vermelho, porque pede ação. */
export const FalhaNoEnvio: Story = { name: "Falha no envio", args: { direction: "outbound", author: "Ana Souza", status: "failed", children: "Segue o link do plano anual." } };
