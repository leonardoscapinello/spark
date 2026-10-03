import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChatThread, MessageBubble } from "../Chat/Chat.js";
import { Amostra, Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { ChatInput, ChatLauncher, ChatWindow } from "./ChatWidget.js";

const meta = {
  title: "Padrões/Chat do site",
  component: ChatWindow,
  args: { title: "Loja Aurora", subtitle: "Normalmente respondemos em poucos minutos.", brand: "#3c64c8", onClose: () => undefined, children: null, footer: null },
  argTypes: { brand: { control: "color" } },
  parameters: { docs: { description: { component: "O chat que o cliente põe no próprio site (iframe): a bolha na cor da marca dele, a janela em folha segurada, o histórico com as bolhas do atendimento e o campo em pílula cavada. A cor da marca chega como dado (config do widget)." } } },
} satisfies Meta<typeof ChatWindow>;
export default meta;
type Story = StoryObj<typeof meta>;

const MARCAS = ["#3c64c8", "#2f9c98", "#e0843a", "#8a6fd6", "#1d1b18"] as const;

function Janela({ brand = "#3c64c8", mensagens = ["Oi! Vocês entregam em Campinas?"], title = "Loja Aurora", sending = false }: { brand?: string; mensagens?: readonly string[]; title?: string; sending?: boolean }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState<readonly string[]>(mensagens);
  return <div style={{ width: 376, height: 600 }}>
    <ChatWindow title={title} subtitle="Normalmente respondemos em poucos minutos." brand={brand} onClose={() => undefined} footer={<ChatInput value={text} onValueChange={setText} sending={sending} onSubmit={() => { setSent((items) => [...items, text]); setText(""); }} />}>
      <ChatThread label={`Conversa com ${title}`} threadKey={brand}>
        <MessageBubble direction="inbound" author={title}>Olá! Como podemos ajudar?</MessageBubble>
        {sent.map((body, index) => <MessageBubble key={index} direction={index % 2 ? "inbound" : "outbound"} author={index % 2 ? title : "Você"} time="14:32" dateTime="2026-10-02T14:32:00Z" fresh={index >= mensagens.length}>{body}</MessageBubble>)}
      </ChatThread>
    </ChatWindow>
  </div>;
}

/** Janela com controles: nome da empresa, apoio e cor da marca. Escreva e envie. */
export const Interativo: Story = { render: (args) => <Janela brand={args.brand} title={args.title} /> };

/** Bolha, campo e janela nos estados e nas cores de marca. */
export const Variantes: Story = {
  render: () => <Prancha>
    <Secao titulo="Bolha fechada" descricao="Círculo de 64 na cor da marca do cliente, com o toque de carvão.">
      <Fileira rotulo="Marcas">{MARCAS.map((cor) => <Amostra key={cor} legenda={cor}><div style={{ width: 64, height: 64 }}><ChatLauncher brand={cor} onOpen={() => undefined} /></div></Amostra>)}</Fileira>
    </Secao>
    <Secao titulo="Campo do chat" descricao="Pílula cavada de 48; o envio de 36 desbota sem texto.">
      <Fileira rotulo="Vazio"><Mesa largura={340}><ChatInput value="" onValueChange={() => undefined} onSubmit={() => undefined} /></Mesa></Fileira>
      <Fileira rotulo="Com texto"><Mesa largura={340}><ChatInput value="Vocês entregam em Campinas?" onValueChange={() => undefined} onSubmit={() => undefined} /></Mesa></Fileira>
      <Fileira rotulo="Enviando"><Mesa largura={340}><ChatInput value="Vocês entregam em Campinas?" sending onValueChange={() => undefined} onSubmit={() => undefined} /></Mesa></Fileira>
    </Secao>
    <Secao titulo="Janela nas cores de marca">
      <Fileira rotulo="Marcas" topo>{MARCAS.slice(0, 3).map((cor) => <Janela key={cor} brand={cor} />)}</Fileira>
    </Secao>
  </Prancha>,
};

/** Primeira visita: só as boas-vindas da empresa. */
export const Vazia: Story = { render: () => <Janela mensagens={[]} /> };
/** Conversa longa: o histórico rola e começa no fim. */
export const ConversaLonga: Story = { name: "Conversa longa", render: () => <Janela mensagens={Array.from({ length: 40 }, (_, index) => index % 2 ? "Perfeito, obrigado pelo retorno!" : "Vocês entregam no mesmo dia se eu pedir antes do meio-dia?")} /> };
/** Nome da empresa longo: corta no cabeçalho, o fechar continua no lugar. */
export const TextoLongo: Story = { name: "Texto longo", render: () => <Janela title="Loja Aurora Moda Praia e Fitness — Unidade Shopping Iguatemi" mensagens={["Oi! Comprei um biquíni ontem e queria saber se dá para trocar a parte de cima por um tamanho maior, porque a de baixo serviu certinho."]} /> };
/** Enviando: o botão desbota até a resposta do servidor. */
export const Enviando: Story = { render: () => <Janela sending /> };
