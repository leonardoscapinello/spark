import { useState, type CSSProperties, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { EmptyState } from "../EmptyState/EmptyState.js";
import { Icon } from "../Icon/Icon.js";
import { Signal } from "../Signal/Signal.js";
import { Toolbar, ToolbarSeparator, ToolbarText } from "../Toolbar/Toolbar.js";
import { Fileira, Matriz, Prancha, Secao } from "../storybook/Prancha.js";
import { FLOW_NODE_SIZE, FlowCanvas, FlowEdge, FlowEdges, FlowNode, FlowPort, flowInputAnchor, flowOutputAnchor, type FlowPoint } from "./Flow.js";

const meta = {
  title: "Padrões/Fluxo de automação",
  component: FlowNode,
  args: {
    position: { x: 32, y: 24 },
    kind: "Gatilho",
    dot: "var(--v1)",
    title: "Pessoa cadastrada",
    description: "Define quando o fluxo começa",
    selected: false,
    dragging: false,
    movable: true,
    branched: false,
  },
  argTypes: {
    dot: { control: "select", options: ["var(--v1)", "var(--v2)", "var(--v3)", "var(--v4)"] },
    position: { control: false },
    input: { control: false },
    outputs: { control: false },
  },
} satisfies Meta<typeof FlowNode>;
export default meta;
type Story = StoryObj<typeof meta>;

/* Dados fixos das histórias. */
const TIPOS = [
  { kind: "Gatilho", dot: "var(--v1)", title: "Pessoa cadastrada", description: "Define quando o fluxo começa" },
  { kind: "Ação", dot: "var(--v2)", title: "Adicionar etiqueta Quente", description: "Executa uma tarefa" },
  { kind: "Condição", dot: "var(--v3)", title: "Pontuação acima de 50", description: "Divide o caminho por uma regra" },
  { kind: "Espera", dot: "var(--v4)", title: "Aguardar 2 dias", description: "Aguarda um período ou evento" },
] as const;
const PASSO = { x: FLOW_NODE_SIZE.width + 72, y: FLOW_NODE_SIZE.height + 40 };
const NO_ENCAIXE: FlowPoint = { x: 24, y: 12 };

/** Área da mesa com altura (e largura) fixas: a mesa preenche a grade. */
function quadro(altura: number, largura?: number): CSSProperties {
  return { display: "grid", height: altura, width: largura ?? "100%", maxWidth: "100%" };
}

/** Encaixe de uma etapa fora da mesa, com folga para as portas na borda. */
function Encaixe({ children }: { children: ReactNode }) {
  return <div style={{ position: "relative", width: FLOW_NODE_SIZE.width + 48, height: FLOW_NODE_SIZE.height + 24 }}>{children}</div>;
}

function Saidas({ branched, disabled = false }: { branched: boolean; disabled?: boolean }) {
  return branched
    ? <><FlowPort side="out" label="Sim" disabled={disabled} aria-label="Conectar saída sim" /><FlowPort side="out" label="Não" disabled={disabled} aria-label="Conectar saída não" /></>
    : <FlowPort side="out" hint="Próximo passo" disabled={disabled} aria-label="Conectar próxima etapa" />;
}

/** Uma etapa na mesa: mude tipo, cor, estado e saídas pelos controles. */
export const Interativo: Story = {
  render: (args) => <div style={quadro(240)}>
    <FlowCanvas label="Etapa de exemplo">
      <FlowNode {...args} outputs={<Saidas branched={Boolean(args.branched)} />} />
    </FlowCanvas>
  </div>,
};

/** Folha de componentes: tipo × estado, portas e ligações. */
export const Variantes: Story = {
  render: () => <Prancha>
    <Secao titulo="Tipos e estados" descricao="O tipo vive no ponto de pigmento (--v1…--v4); a folha nunca é pintada. Selecionada ganha o halo de foco; arrastada inclina 1,6°, cresce 1,035 e sobe para --e3; somente leitura não tem pega nem portas.">
      <Matriz
        colunas={["Repouso", "Selecionada", "Arrastando", "Somente leitura"]}
        linhas={TIPOS.map((tipo) => ({
          rotulo: tipo.kind,
          celulas: [
            <Encaixe><FlowNode position={NO_ENCAIXE} {...tipo} movable branched={tipo.kind === "Condição"} outputs={<Saidas branched={tipo.kind === "Condição"} />} /></Encaixe>,
            <Encaixe><FlowNode position={NO_ENCAIXE} {...tipo} movable selected branched={tipo.kind === "Condição"} outputs={<Saidas branched={tipo.kind === "Condição"} />} /></Encaixe>,
            <Encaixe><FlowNode position={NO_ENCAIXE} {...tipo} movable dragging /></Encaixe>,
            <Encaixe><FlowNode position={NO_ENCAIXE} {...tipo} /></Encaixe>,
          ],
        }))}
      />
    </Secao>
    <Secao titulo="Portas" descricao="Alvo de 44 com um ponto de 14 na borda. A dica entra com o atraso de 250 ms; a porta que segura uma ligação fica preenchida de tinta.">
      <Fileira rotulo="Saída com dica"><Encaixe><FlowNode position={NO_ENCAIXE} {...TIPOS[1]} outputs={<Saidas branched={false} />} /></Encaixe></Fileira>
      <Fileira rotulo="Saídas Sim e Não"><Encaixe><FlowNode position={NO_ENCAIXE} {...TIPOS[2]} branched outputs={<Saidas branched />} /></Encaixe></Fileira>
      <Fileira rotulo="Segurando e recebendo">
        <Encaixe><FlowNode position={NO_ENCAIXE} {...TIPOS[0]} outputs={<FlowPort side="out" active aria-label="Cancelar ligação" />} /></Encaixe>
        <Encaixe><FlowNode position={NO_ENCAIXE} {...TIPOS[1]} input={<FlowPort side="in" aria-label="Conectar a Adicionar etiqueta Quente" />} /></Encaixe>
      </Fileira>
      <Fileira rotulo="Desabilitada"><Encaixe><FlowNode position={NO_ENCAIXE} {...TIPOS[3]} outputs={<Saidas branched={false} disabled />} /></Encaixe></Fileira>
    </Secao>
    <Secao titulo="Ligações" descricao="Contínua em --bd2 para o caminho direto; tracejada (--tracejado) em --tx3 para ramo de condição e ligação em andamento.">
      <div style={quadro(220)}>
        <FlowCanvas label="Tipos de ligação">
          <FlowEdges>
            <FlowEdge from={{ x: 40, y: 40 }} to={{ x: 360, y: 40 }} />
            <FlowEdge kind="conditional" from={{ x: 40, y: 110 }} to={{ x: 360, y: 150 }} />
            <FlowEdge kind="pending" from={{ x: 40, y: 180 }} to={{ x: 360, y: 190 }} />
          </FlowEdges>
        </FlowCanvas>
      </div>
    </Secao>
  </Prancha>,
};

const GATILHO: FlowPoint = { x: 40, y: 48 };
const CONDICAO: FlowPoint = { x: 40 + PASSO.x, y: 48 };
const ACAO: FlowPoint = { x: 40 + PASSO.x * 2, y: 0 };
const ESPERA: FlowPoint = { x: 40 + PASSO.x * 2, y: 200 };

/** Um fluxo de ponta a ponta: gatilho, condição com dois ramos, ação e espera. */
export const FluxoCompleto: Story = {
  render: () => <div style={quadro(440)}>
    <FlowCanvas label="Fluxo de exemplo" contentSize={{ width: ACAO.x + FLOW_NODE_SIZE.width + 64, height: ESPERA.y + FLOW_NODE_SIZE.height + 64 }}>
      <FlowEdges>
        <FlowEdge from={flowOutputAnchor(GATILHO)} to={flowInputAnchor(CONDICAO)} />
        <FlowEdge kind="conditional" from={flowOutputAnchor(CONDICAO, 0, 2)} to={flowInputAnchor(ACAO)} />
        <FlowEdge kind="conditional" from={flowOutputAnchor(CONDICAO, 1, 2)} to={flowInputAnchor(ESPERA)} />
      </FlowEdges>
      <FlowNode position={GATILHO} {...TIPOS[0]} movable outputs={<Saidas branched={false} />} />
      <FlowNode position={CONDICAO} {...TIPOS[2]} movable selected branched outputs={<Saidas branched />} />
      <FlowNode position={ACAO} {...TIPOS[1]} movable outputs={<Saidas branched={false} />} />
      <FlowNode position={ESPERA} {...TIPOS[3]} movable outputs={<Saidas branched={false} />} />
    </FlowCanvas>
  </div>,
};

/** Ligação em andamento: a linha tracejada segue o ponteiro sobre a mesa. */
export const Ligando: Story = { render: () => <LigandoExemplo /> };

function LigandoExemplo() {
  const [ponteiro, setPonteiro] = useState<FlowPoint>({ x: CONDICAO.x - 40, y: CONDICAO.y + 40 });
  return <div style={quadro(300)}>
    <FlowCanvas label="Ligando etapas" onPointerMove={(event) => {
      const area = event.currentTarget;
      const caixa = area.getBoundingClientRect();
      setPonteiro({ x: event.clientX - caixa.left + area.scrollLeft, y: event.clientY - caixa.top + area.scrollTop });
    }}>
      <FlowEdges><FlowEdge kind="pending" from={flowOutputAnchor(GATILHO)} to={ponteiro} /></FlowEdges>
      <FlowNode position={GATILHO} kind="Gatilho" dot="var(--v1)" title="Mensagem recebida" outputs={<FlowPort side="out" active aria-label="Cancelar ligação" />} />
      <FlowNode position={CONDICAO} kind="Ação" dot="var(--v2)" title="Responder com o catálogo" input={<FlowPort side="in" aria-label="Conectar a Responder com o catálogo" />} />
    </FlowCanvas>
  </div>;
}

/** Zoom: a grade de pontos acompanha a escala do palco no mesmo tempo. */
export const ComZoom: Story = { render: () => <ZoomExemplo /> };

function ZoomExemplo() {
  const [zoom, setZoom] = useState(1);
  return <div style={quadro(360)}>
    <FlowCanvas label="Fluxo com zoom" zoom={zoom} contentSize={{ width: CONDICAO.x + FLOW_NODE_SIZE.width + 64, height: 280 }} overlay={
      <div style={{ position: "absolute", insetInlineStart: 12, insetBlockEnd: 12 }}>
        <Toolbar label="Zoom do fluxo">
          <Button iconOnly size="sm" variant="ghost" icon={<Icon name="minus" />} aria-label="Reduzir zoom" disabled={zoom <= 0.5} onClick={() => setZoom((valor) => Math.max(0.5, valor - 0.25))} />
          <Button size="sm" variant="ghost" aria-label="Voltar ao zoom de 100%" onClick={() => setZoom(1)}>{`${Math.round(zoom * 100)}%`}</Button>
          <Button iconOnly size="sm" variant="ghost" icon={<Icon name="plus" />} aria-label="Ampliar zoom" disabled={zoom >= 1.5} onClick={() => setZoom((valor) => Math.min(1.5, valor + 0.25))} />
        </Toolbar>
      </div>
    }>
      <FlowEdges><FlowEdge from={flowOutputAnchor(GATILHO)} to={flowInputAnchor(CONDICAO)} /></FlowEdges>
      <FlowNode position={GATILHO} {...TIPOS[0]} />
      <FlowNode position={CONDICAO} {...TIPOS[1]} />
    </FlowCanvas>
  </div>;
}

/** Mesa vazia: o estado vazio fica na camada fixa, centrado. */
export const Vazio: Story = {
  render: () => <div style={quadro(380)}>
    <FlowCanvas label="Fluxo vazio" overlay={<div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 24 }}>
      <EmptyState icon="bolt" title="O fluxo começa com um gatilho" description="Adicione o primeiro passo para definir quando a automação começa." action={<Button icon={<Icon name="plus" />}>Adicionar gatilho</Button>} />
    </div>} />
  </div>,
};

/** Somente leitura: sem pega, sem portas — dá para ver e abrir, não para mudar. */
export const SomenteLeitura: Story = {
  render: () => <div style={quadro(260)}>
    <FlowCanvas label="Fluxo somente leitura">
      <FlowEdges><FlowEdge from={flowOutputAnchor(GATILHO)} to={flowInputAnchor(CONDICAO)} /></FlowEdges>
      <FlowNode position={GATILHO} {...TIPOS[0]} />
      <FlowNode position={CONDICAO} {...TIPOS[1]} selected />
    </FlowCanvas>
  </div>,
};

/** Texto longo: título em até 2 linhas e descrição em até 3, depois reticências. */
export const TextoLongo: Story = {
  render: () => <div style={quadro(240)}>
    <FlowCanvas label="Etapa com texto longo">
      <FlowNode position={{ x: 32, y: 32 }} kind="Ação" dot="var(--v2)" movable branched title="Enviar mensagem de boas-vindas com o catálogo completo de produtos da temporada e o link de agendamento" description="Executa a tarefa para toda pessoa que entrou pela campanha de outono, inclusive quem respondeu ao formulário de interesse e quem chegou pela indicação de um cliente." outputs={<Saidas branched />} />
    </FlowCanvas>
  </div>,
};

/** Muitas etapas: a mesa rola; a grade de pontos rola junto. */
export const MuitasEtapas: Story = {
  render: () => {
    const etapas = Array.from({ length: 12 }, (_, indice) => ({ indice, tipo: TIPOS[indice % TIPOS.length] ?? TIPOS[0], posicao: { x: 40 + (indice % 4) * PASSO.x, y: 40 + Math.floor(indice / 4) * PASSO.y } }));
    return <div style={quadro(460)}>
      <FlowCanvas label="Fluxo com muitas etapas" contentSize={{ width: 40 + PASSO.x * 4, height: 40 + PASSO.y * 3 }}>
        <FlowEdges>{etapas.slice(1).map((etapa) => {
          const anterior = etapas[etapa.indice - 1];
          return anterior ? <FlowEdge key={etapa.indice} from={flowOutputAnchor(anterior.posicao)} to={flowInputAnchor(etapa.posicao)} /> : null;
        })}</FlowEdges>
        {etapas.map((etapa) => <FlowNode key={etapa.indice} position={etapa.posicao} {...etapa.tipo} title={`${etapa.tipo.title} ${etapa.indice + 1}`} movable outputs={<Saidas branched={false} />} />)}
      </FlowCanvas>
    </div>;
  },
};

/** Largura estreita (celular): a barra continua dentro da mesa e o fluxo rola de lado. */
export const LarguraEstreita: Story = {
  render: () => <div style={quadro(420, 340)}>
    <FlowCanvas label="Fluxo no celular" contentSize={{ width: CONDICAO.x + FLOW_NODE_SIZE.width + 64, height: 260 }} overlay={
      <div style={{ position: "absolute", insetInlineStart: 12, insetBlockStart: 12, maxWidth: "calc(100% - 24px)" }}>
        <Toolbar label="Etapas do fluxo">
          <Button size="sm" variant="ghost" icon={<Icon name="plus" />}>Adicionar etapa</Button>
          <ToolbarSeparator />
          <ToolbarText><Signal tone="warning">2 pendências</Signal></ToolbarText>
        </Toolbar>
      </div>
    }>
      <FlowEdges><FlowEdge from={flowOutputAnchor({ x: 24, y: 72 })} to={flowInputAnchor(CONDICAO)} /></FlowEdges>
      <FlowNode position={{ x: 24, y: 72 }} {...TIPOS[0]} movable outputs={<Saidas branched={false} />} />
      <FlowNode position={CONDICAO} {...TIPOS[1]} movable outputs={<Saidas branched={false} />} />
    </FlowCanvas>
  </div>,
};
