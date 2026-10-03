import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "../Button/Button.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { Notification, NotificationList, type NotificationEntry } from "./Notification.js";
import { dismissNotification, notify, Toaster } from "./Toast.js";

const TONS = [["info", "Nova atualização", "A automação de boas-vindas foi publicada."], ["success", "Alterações salvas", "O negócio foi movido para Proposta."], ["warning", "Conexão instável", "Tentamos de novo sozinhos em instantes."], ["error", "Falha ao enviar", "O WhatsApp recusou a mensagem fora da janela de 24 horas."]] as const;

function Lista() {
  const [itens, setItens] = useState<NotificationEntry[]>([
    { id: "1", title: "Nova conversa atribuída", description: "A equipe de atendimento atribuiu uma conversa a você.", unread: true },
    { id: "2", title: "Integração precisa de atenção", description: "Revise a conexão para retomar a sincronização.", tone: "warning", unread: true },
    { id: "3", title: "Negócio ganho", description: "Aurora Cosméticos fechou o plano anual.", tone: "success" },
  ]);
  return <NotificationList items={itens} onRead={id => setItens(atual => atual.map(item => (item.id === id ? { ...item, unread: false } : item)))} onDismiss={id => setItens(atual => atual.filter(item => item.id !== id))} />;
}

const meta = {
  title: "Retorno/Notificação",
  component: Notification,
  subcomponents: { NotificationList, Toaster },
  args: { title: "Nova conversa", description: "Uma conversa foi atribuída a você.", tone: "info", unread: false },
  argTypes: { tone: { control: "inline-radio", options: ["info", "success", "warning", "error"] }, actions: { control: false } },
  parameters: {
    docs: { description: { component: "Aviso em uma frase. A cor fica no ícone de 28 em squircle, nunca pinta o bloco. O mesmo conteúdo vira toast: pílula de carvão que sobe do canto, empilha até três e some sozinha em 5 s." } },
  },
} satisfies Meta<typeof Notification>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {};

export const Tons: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Tons" descricao="Informação, sucesso, atenção e erro. Com ação e com fechar.">
        <Mesa largura={520}>
          {TONS.map(([tom, titulo, texto]) => <Notification key={tom} tone={tom} title={titulo} description={texto} />)}
          <Notification tone="warning" title="Conexão instável" description="Algumas mensagens podem atrasar." actions={<Button variant="secondary" size="sm">Ver detalhes</Button>} onDismiss={() => undefined} />
          <Notification title="Não lida" description="Ponto de não lida ao lado do título." unread />
        </Mesa>
      </Secao>
      <Secao titulo="Lista de notificações" descricao="Marcar como lida e dispensar com a física de abrir espaço.">
        <Mesa largura={520}><Lista /></Mesa>
      </Secao>
    </Prancha>
  ),
};

export const Toast: Story = {
  render: () => (
    <Prancha>
      <Toaster />
      <Secao titulo="Toast" descricao="Clique para disparar. Três ficam visíveis; o resto espera. Some sozinho em 5 s.">
        <Fileira rotulo="Tons">
          {TONS.map(([tom, titulo, texto]) => <Button key={tom} variant="secondary" onClick={() => notify({ tone: tom, title: titulo, description: texto })}>{titulo}</Button>)}
        </Fileira>
        <Fileira rotulo="Com desfazer">
          <Button variant="secondary" onClick={() => notify({ title: "Conversa arquivada", actions: <Button size="sm" onClick={() => { dismissNotification("arquivar"); notify({ title: "Arquivamento desfeito", tone: "success" }); }}>Desfazer</Button> }, { id: "arquivar" })}>Arquivar</Button>
        </Fileira>
      </Secao>
    </Prancha>
  ),
};
