import { useState, type CSSProperties, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { EmptyState } from "../EmptyState/EmptyState.js";
import { Alert, Skeleton } from "../Feedback/Feedback.js";
import { Field } from "../Field/Field.js";
import { Icon } from "../Icon/Icon.js";
import { Input } from "../Input/Input.js";
import { Label } from "../Label/Label.js";
import { ListRow, RowList } from "../ListRow/ListRow.js";
import { Textarea } from "../Textarea/Textarea.js";
import { Fileira, Prancha, Secao } from "../storybook/Prancha.js";
import { SidePanel } from "./SidePanel.js";

const meta = {
  title: "Camadas/Painel na página",
  component: SidePanel,
  args: {
    open: true,
    eyebrow: "Etapa · Gatilho",
    title: "Pessoa cadastrada",
    description: "O fluxo começa quando alguém entra na base.",
    closeLabel: "Fechar painel",
  },
  argTypes: {
    footer: { control: false },
    children: { control: false },
    onClose: { control: false },
  },
} satisfies Meta<typeof SidePanel>;
export default meta;
type Story = StoryObj<typeof meta>;

/* Dados fixos das histórias. */
const EXECUCOES = Array.from({ length: 30 }, (_, indice) => ({
  id: `execucao-${indice}`,
  pessoa: ["Ana Souza", "Bruno Lima", "Carla Prado", "Diego Alves", "Elisa Rocha"][indice % 5] ?? "Ana Souza",
  quando: `${String(2 + (indice % 27)).padStart(2, "0")}/10 · ${String(8 + (indice % 10)).padStart(2, "0")}:${indice % 2 ? "30" : "05"}`,
  concluida: indice % 4 !== 0,
}));

/** A área de trabalho que contém o painel (precisa de position: relative). */
function Area({ children, altura = 520, largura }: { children: ReactNode; altura?: number; largura?: number }) {
  const estilo: CSSProperties = { position: "relative", height: altura, width: largura ?? "100%", maxWidth: "100%", overflow: "hidden", background: "var(--bg)" };
  return <div style={estilo}>{children}</div>;
}

function CamposDaEtapa({ disabled = false }: { disabled?: boolean }) {
  return <>
    <Field><Label>Nome da etapa</Label><Input defaultValue="Pessoa cadastrada" disabled={disabled} /></Field>
    <Field><Label>Descrição</Label><Textarea defaultValue="Define quando o fluxo começa." rows={3} disabled={disabled} /></Field>
  </>;
}

const RODAPE = <><Button variant="secondary" tone="danger" icon={<Icon name="trash" />}>Excluir etapa</Button><Button>Concluir</Button></>;

/** Mude título, olho, descrição e `open` pelos controles (fechar mostra a saída). */
export const Interativo: Story = {
  render: (args) => <Area><SidePanel {...args} onClose={() => undefined} footer={RODAPE}><CamposDaEtapa /></SidePanel></Area>,
};

/** Folha de componentes: cabeçalho completo, só título, sem fechar e rodapé de uma ação. */
export const Variantes: Story = {
  render: () => <Prancha>
    <Secao titulo="Composições" descricao="Folha segurada (--sf3, --e3, raio 44) solta 12px das bordas da área. Cabeçalho 22/22/16/26 com título 500 20; corpo 22 26 com intervalo 18; rodapé dividido por igual.">
      <Fileira rotulo="Completo" topo><Area altura={440}><SidePanel open eyebrow="Etapa · Gatilho" title="Pessoa cadastrada" description="O fluxo começa quando alguém entra na base." onClose={() => undefined} footer={RODAPE}><CamposDaEtapa /></SidePanel></Area></Fileira>
      <Fileira rotulo="Só título" topo><Area altura={300}><SidePanel open title="Adicionar etapa" onClose={() => undefined}><p style={{ margin: 0 }}>Escolha o que acontece neste ponto do fluxo.</p></SidePanel></Area></Fileira>
      <Fileira rotulo="Sem fechar" topo><Area altura={300}><SidePanel open eyebrow="Histórico" title="Execuções"><p style={{ margin: 0 }}>Painel que acompanha a tela inteira.</p></SidePanel></Area></Fileira>
      <Fileira rotulo="Rodapé com uma ação" topo><Area altura={360}><SidePanel open title="Configurar etapa" onClose={() => undefined} footer={<Button variant="secondary" tone="danger" icon={<Icon name="trash" />}>Excluir etapa</Button>}><CamposDaEtapa /></SidePanel></Area></Fileira>
    </Secao>
  </Prancha>,
};

/** Abre deslizando da borda em 450 ms e sai em 220 ms, sem véu: a tela segue usável. */
export const AbrirEFechar: Story = { render: () => <AbrirEFecharExemplo /> };

function AbrirEFecharExemplo() {
  const [aberto, setAberto] = useState(true);
  return <Area>
    <div style={{ padding: 24 }}><Button variant="secondary" onClick={() => setAberto((valor) => !valor)}>{aberto ? "Fechar painel" : "Abrir painel"}</Button></div>
    <SidePanel open={aberto} onClose={() => setAberto(false)} eyebrow="Etapa · Ação" title="Adicionar etiqueta" footer={RODAPE}><CamposDaEtapa /></SidePanel>
  </Area>;
}

/** Vazio: o corpo mostra o estado vazio do sistema. */
export const Vazio: Story = {
  render: () => <Area><SidePanel open eyebrow="Histórico" title="Execuções" onClose={() => undefined}><EmptyState icon="play" title="Nenhuma execução ainda" description="Quando alguém entrar no fluxo, a execução aparece aqui." /></SidePanel></Area>,
};

/** Carregando: esqueleto no lugar das linhas. */
export const Carregando: Story = {
  render: () => <Area><SidePanel open eyebrow="Histórico" title="Execuções" onClose={() => undefined}><div role="status" aria-label="Carregando execuções" style={{ display: "grid", gap: 12 }}><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div></SidePanel></Area>,
};

/** Erro: o aviso fala numa frase e oferece tentar de novo. */
export const Erro: Story = {
  render: () => <Area><SidePanel open eyebrow="Histórico" title="Execuções" onClose={() => undefined}><Alert tone="danger" title="Não foi possível carregar" action={<Button size="sm" variant="secondary" icon={<Icon name="refresh" />}>Tentar de novo</Button>}>As execuções voltam assim que a conexão responder.</Alert></SidePanel></Area>,
};

/** Desabilitado: quem só lê vê os campos e não muda nada. */
export const Desabilitado: Story = {
  render: () => <Area><SidePanel open eyebrow="Etapa · Gatilho" title="Pessoa cadastrada" description="Você pode ver esta etapa, mas não alterar." onClose={() => undefined} footer={<Button variant="secondary" tone="danger" disabled>Excluir etapa</Button>}><CamposDaEtapa disabled /></SidePanel></Area>,
};

/** Texto longo: o título quebra sem sair da folha; a descrição respira. */
export const TextoLongo: Story = {
  render: () => <Area><SidePanel open eyebrow="Etapa · Ação · Campanha de outono com indicação" title="Enviar mensagem de boas-vindas com o catálogo completo de produtos da temporada" description="Executa a tarefa para toda pessoa que entrou pela campanha de outono, inclusive quem respondeu ao formulário de interesse e quem chegou pela indicação de um cliente." onClose={() => undefined} footer={RODAPE}><CamposDaEtapa /></SidePanel></Area>,
};

/** Muitos itens: só o corpo rola; cabeçalho e rodapé ficam. */
export const MuitosItens: Story = {
  render: () => <Area><SidePanel open eyebrow="Histórico" title="Execuções" description="30 registradas nesta automação." onClose={() => undefined}>
    <RowList label="Execuções recentes">{EXECUCOES.map((execucao, indice) => <ListRow key={execucao.id} index={indice} icon={execucao.concluida ? "check" : "clock"} title={execucao.concluida ? "Concluída" : "Aguardando"} description={execucao.pessoa} meta={execucao.quando} />)}</RowList>
  </SidePanel></Area>,
};

/** Largura estreita: o painel ocupa a área toda, ainda solto 12px das bordas. */
export const LarguraEstreita: Story = {
  render: () => <Area largura={360}><SidePanel open eyebrow="Etapa · Gatilho" title="Pessoa cadastrada" onClose={() => undefined} footer={RODAPE}><CamposDaEtapa /></SidePanel></Area>,
};
