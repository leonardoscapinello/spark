import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { Alert, Badge, FormMessage, IndeterminateBar, Skeleton, Spinner, Tag } from "./Feedback.js";

const meta: Meta<typeof Alert> = {
  title: "Retorno/Alerta, mensagem e carregamento",
  component: Alert,
  args: { tone: "warning", title: "Conexão instável", children: "Mostrando dados de 14:32." },
  argTypes: { tone: { control: "inline-radio", options: ["neutral", "info", "success", "warning", "danger"] } },
};
export default meta;
type Story = StoryObj<typeof Alert>;

export const Interativo: Story = {};

export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Alerta inline (desenhado pela Notificação)" descricao="Uma frase; a cor fica no ícone de 28. Atenção leva ação de folha; erro, ação de tinta.">
    <Mesa largura={560}><div style={{ display: "grid", gap: 12 }}>
      <Alert tone="info" title="Sincronização em andamento">Os dados novos aparecem em alguns segundos.</Alert>
      <Alert tone="success" title="Convite enviado para ana@aurora.com.br." />
      <Alert tone="warning" title="Conexão instável" action={<Button size="sm" variant="secondary">Reconectar</Button>}>Mostrando dados de 14:32.</Alert>
      <Alert tone="danger" title="Não foi possível salvar" action={<Button size="sm" variant="ghost">Detalhes</Button>}>Nada foi perdido. Tente de novo.</Alert>
      <Alert title="Obrigatório vale para sair da etapa">Voltar atrás nunca é bloqueado.</Alert>
    </div></Mesa>
  </Secao>
  <Secao titulo="Mensagem de formulário" descricao="12 na cor do estado, ícone de 14; abre espaço ao montar.">
    <Fileira rotulo="Erro"><FormMessage>Informe um e-mail válido.</FormMessage></Fileira>
    <Fileira rotulo="Sucesso"><FormMessage tone="success">Senha atualizada. Você já pode entrar.</FormMessage></Fileira>
    <Fileira rotulo="Informação"><FormMessage tone="info">O link vale por 15 minutos.</FormMessage></Fileira>
  </Secao>
  <Secao titulo="Carregando">
    <Fileira rotulo="Esqueleto" topo><Mesa largura={280}><div role="status" aria-label="Carregando conteúdo" style={{ display: "grid", gap: 8 }}><Skeleton style={{ width: "70%" }} /><Skeleton style={{ width: "90%" }} /><Skeleton style={{ width: "45%" }} /></div></Mesa></Fileira>
    <Fileira rotulo="Bloco"><Mesa largura={280}><Skeleton style={{ height: 96 }} /></Mesa></Fileira>
    <Fileira rotulo="Ensō"><Spinner label="Carregando" /><Spinner size="sm" /></Fileira>
    <Fileira rotulo="Indeterminada"><Mesa largura={280}><IndeterminateBar label="Recarregando" /></Mesa></Fileira>
  </Secao>
  <Secao titulo="Selo e etiqueta (desenhados pela Etiqueta)" descricao="Badge e Tag continuam disponíveis; quem desenha é o Chip.">
    <Fileira rotulo="Badge"><Badge>Rascunho</Badge><Badge tone="success" dot>Conectado</Badge><Badge dot="warning">Em nutrição</Badge><Badge dotColor="var(--v2)">Etapa</Badge><Badge tone="ink">Novo</Badge></Fileira>
    <Fileira rotulo="Tag"><Tag icon="tag">Prioridade</Tag><Tag onRemove={() => undefined} removeLabel="Remover etiqueta VIP">VIP</Tag></Fileira>
  </Secao>
</Prancha> };

export const TextoLongo: Story = { render: () => <Mesa largura={320}><Alert tone="danger" title="Não foi possível conectar à conta do WhatsApp Business da regional sul">A Meta respondeu que o token de verificação expirou. Gere um token novo no painel da Meta e salve a conexão de novo.</Alert></Mesa> };
