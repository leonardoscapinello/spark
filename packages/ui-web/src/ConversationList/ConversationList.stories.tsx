import { useState, type CSSProperties, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "../Select/Select.js";
import { Surface } from "../Surface/Surface.js";
import { ViewSwitcher } from "../ViewSwitcher/ViewSwitcher.js";
import { withViewTransition } from "../motion/viewTransition.js";
import { Fileira, Matriz, Prancha, Secao } from "../storybook/Prancha.js";
import { ConversationList, ConversationListHeader, ConversationRow, type ConversationListLayout, type ConversationRowChannel, type ConversationRowProps } from "./ConversationList.js";

const meta = {
  title: "Dados/Lista de conversas",
  component: ConversationRow,
  args: { name: "Rafael Lima", title: "Segunda via do boleto", time: "14 min", onSelect: () => undefined },
  parameters: { docs: { description: { component: "Lista densa do atendimento: uma linha por pessoa, fio entre as linhas a partir do texto, folha da seleção deslizando. `ConversationList` recebe as linhas; `ConversationListHeader` é o cabeçalho com contagem, ordenação e formato." } } },
} satisfies Meta<typeof ConversationRow>;
export default meta;
type Story = StoryObj<typeof meta>;

type Fixture = Omit<ConversationRowProps, "onSelect" | "selected"> & { id: string };

const PESSOAS: readonly Fixture[] = [
  { id: "1", name: "Carla Menezes", title: "Dúvida sobre o plano", snippet: "Oi! Queria entender a diferença entre o anual e o mensal.", time: "2 min", channels: [{ icon: "whatsapp", label: "WhatsApp Vendas" }, { icon: "instagram", label: "Instagram Loja" }], owner: "Ana Souza", sla: { tone: "neutral", label: "Atendimento total", percent: 63, state: "on_track", status: "Em andamento", detail: "3 h 48 min de 6 h úteis · restam 2 h 12 min" }, unread: true },
  { id: "2", name: "Rafael Lima", title: "Segunda via do boleto", snippet: "Consegue me mandar de novo? O link expirou.", time: "14 min", channels: [{ icon: "mail", label: "E-mail Financeiro" }], owner: "Equipe Financeiro", sla: { tone: "success", label: "No prazo" } },
  { id: "3", name: "Beatriz Nogueira", title: "Troca de tamanho", snippet: "Recebi o pedido, mas preciso trocar por um M.", time: "1 h", channels: [{ icon: "instagram", label: "Instagram Loja Centro" }], owner: "Não atribuída", sla: { tone: "danger", label: "Vencido" }, unread: true, priority: true },
  { id: "4", name: "João Pedro Alves", title: "Agendamento de visita técnica", snippet: "Pode ser na quinta de manhã?", time: "3 h", channels: [{ icon: "message", label: "Chat do site" }], owner: "Carlos Dias", sla: { tone: "success", label: "No prazo" } },
  { id: "5", name: "Marina Costa", title: "Cancelamento", snippet: "Obrigada pelo retorno!", time: "2 d", channels: [{ icon: "telegram", label: "Telegram" }], owner: "Ana Souza" },
];

const NOMES = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Fábio", "Gabriela", "Heitor", "Isabela", "João", "Larissa", "Marcos", "Natália", "Otávio", "Paula", "Rafael", "Sofia", "Tiago", "Úrsula", "Vitor"];
const SOBRENOMES = ["Menezes", "Lima", "Nogueira", "Alves", "Costa", "Prado", "Souza", "Ribeiro", "Barros", "Teixeira"];
const ASSUNTOS = ["Dúvida sobre o plano", "Segunda via do boleto", "Troca de tamanho", "Prazo de entrega", "Cancelamento", "Nota fiscal", "Cupom não funcionou", "Agendamento"];
const CAIXAS: readonly ConversationRowChannel[] = [{ icon: "whatsapp", label: "WhatsApp Vendas" }, { icon: "instagram", label: "Instagram Loja Centro" }, { icon: "mail", label: "E-mail Suporte" }, { icon: "message", label: "Chat do site" }];
const SINAIS: readonly NonNullable<ConversationRowProps["sla"]>[] = [{ tone: "success", label: "No prazo" }, { tone: "warning", label: "Vence em 8 min" }, { tone: "danger", label: "Vencido" }, { tone: "neutral", label: "SLA 45 min" }];

/** 200 conversas para medir a densidade: a lista tem de continuar escaneável. */
const DUZENTAS: readonly Fixture[] = Array.from({ length: 200 }, (_, index) => ({
  id: `p${index}`,
  name: `${NOMES[index % NOMES.length]} ${SOBRENOMES[index % SOBRENOMES.length]}`,
  title: ASSUNTOS[index % ASSUNTOS.length]!,
  snippet: "Olá! Ainda estou esperando o retorno sobre o meu pedido.",
  time: index < 30 ? `${index * 2 + 1} min` : index < 90 ? `${Math.floor(index / 10)} h` : `${Math.floor(index / 30)} d`,
  channels: [CAIXAS[index % CAIXAS.length]!],
  owner: index % 3 === 0 ? "Não atribuída" : "Ana Souza",
  sla: SINAIS[index % SINAIS.length]!,
  unread: index % 4 === 0,
  priority: index % 17 === 0,
}));

function Lista({ rows, layout = "compact", largura, altura = 460, cabecalho = true, inicial }: { rows: readonly Fixture[]; layout?: ConversationListLayout; largura?: number; altura?: number; cabecalho?: boolean; inicial?: string | null }) {
  const [selected, setSelected] = useState<string | null>(inicial === undefined ? rows[0]?.id ?? null : inicial);
  const [view, setView] = useState<ConversationListLayout>(layout);
  return <Surface style={{ display: "flex", flexDirection: "column", width: largura ?? (view === "wide" ? 980 : 369), maxWidth: "100%", height: altura, overflow: "hidden" }}>
    {cabecalho && <ConversationListHeader title="Abertas" count={rows.length} actions={<>
      <Select appearance="filter" label="Ordenar conversas" defaultValue="recent" options={[{ value: "recent", label: "Recentes" }, { value: "oldest", label: "Antigas" }]} />
      <ViewSwitcher label="Formato da lista" value={view === "compact" ? "cards" : "table"} onValueChange={(value) => setView(value === "cards" ? "compact" : "wide")} />
    </>} />}
    <ConversationList label="Conversas abertas" layout={view} empty="Nenhuma conversa nesta caixa.">
      {rows.map(({ id, ...row }, index) => <ConversationRow key={id} {...row} index={index} selected={selected === id} onSelect={() => setSelected(id)} />)}
    </ConversationList>
  </Surface>;
}

function Uma({ children, layout = "compact", largura = 369 }: { children: ReactNode; layout?: ConversationListLayout; largura?: number }) {
  return <div style={{ width: largura }}><ConversationList label="Exemplo" layout={layout}>{children}</ConversationList></div>;
}

const base: Fixture = PESSOAS[1]!;

/** Uma linha com todos os controles: troque nome, assunto, hora, sinal e estados. */
export const Interativo: Story = {
  args: { name: "Carla Menezes", title: "Dúvida sobre o plano", time: "2 min", channels: [{ icon: "whatsapp", label: "WhatsApp Vendas" }], owner: "Ana Souza", sla: { tone: "warning", label: "Vence em 8 min" }, unread: true, priority: false, selected: true, onSelect: () => undefined },
  render: (args) => <Uma><ConversationRow {...args} /></Uma>,
};

/** Estados da linha × formato da lista. */
export const Variantes: Story = {
  render: () => <Prancha>
    <Secao titulo="Linha compacta (ao lado da conversa)" descricao="Avatar 32; nome 13 + hora em mono 11; assunto 13; caixa · responsável em 12 com o prazo como ponto + texto curto. Não lida: nome e assunto em tinta 1 e 500, ponto de carvão depois da hora.">
      <Matriz colunas={["Lida", "Não lida", "Selecionada", "Prioritária"]} linhas={[
        { rotulo: "No prazo", celulas: [<Uma key="a"><ConversationRow {...base} onSelect={() => undefined} /></Uma>, <Uma key="b"><ConversationRow {...base} unread onSelect={() => undefined} /></Uma>, <Uma key="c"><ConversationRow {...base} selected onSelect={() => undefined} /></Uma>, <Uma key="d"><ConversationRow {...base} priority onSelect={() => undefined} /></Uma>] },
        { rotulo: "Vence logo", celulas: [<Uma key="a"><ConversationRow {...base} sla={SINAIS[1]!} onSelect={() => undefined} /></Uma>, <Uma key="b"><ConversationRow {...base} sla={SINAIS[1]!} unread onSelect={() => undefined} /></Uma>, <Uma key="c"><ConversationRow {...base} sla={SINAIS[1]!} selected onSelect={() => undefined} /></Uma>, <Uma key="d"><ConversationRow {...base} sla={SINAIS[1]!} priority unread onSelect={() => undefined} /></Uma>] },
        { rotulo: "Vencido", celulas: [<Uma key="a"><ConversationRow {...base} sla={SINAIS[2]!} onSelect={() => undefined} /></Uma>, <Uma key="b"><ConversationRow {...base} sla={SINAIS[2]!} unread onSelect={() => undefined} /></Uma>, <Uma key="c"><ConversationRow {...base} sla={SINAIS[2]!} selected onSelect={() => undefined} /></Uma>, <Uma key="d"><ConversationRow {...base} sla={SINAIS[2]!} priority onSelect={() => undefined} /></Uma>] },
        { rotulo: "Sem prazo nem caixa", celulas: [<Uma key="a"><ConversationRow name={base.name} title={base.title} time={base.time} onSelect={() => undefined} /></Uma>, <Uma key="b"><ConversationRow name={base.name} title={base.title} time={base.time} unread onSelect={() => undefined} /></Uma>, <Uma key="c"><ConversationRow name={base.name} title={base.title} time={base.time} selected onSelect={() => undefined} /></Uma>, <Uma key="d"><ConversationRow name={base.name} title={base.title} time={base.time} priority onSelect={() => undefined} /></Uma>] },
      ]} />
    </Secao>
    <Secao titulo="Linha larga (caixa como cliente de e-mail)" descricao="Pessoa · assunto — trecho · caixa · prazo · hora numa linha de 44, raio curto na seleção para não virar estádio.">
      <Fileira rotulo="Lida"><Uma layout="wide" largura={980}><ConversationRow {...base} onSelect={() => undefined} /></Uma></Fileira>
      <Fileira rotulo="Não lida"><Uma layout="wide" largura={980}><ConversationRow {...base} unread onSelect={() => undefined} /></Uma></Fileira>
      <Fileira rotulo="Selecionada"><Uma layout="wide" largura={980}><ConversationRow {...base} selected onSelect={() => undefined} /></Uma></Fileira>
      <Fileira rotulo="Prioritária e vencida"><Uma layout="wide" largura={980}><ConversationRow {...base} priority sla={SINAIS[2]!} unread onSelect={() => undefined} /></Uma></Fileira>
    </Secao>
    <Secao titulo="Cabeçalho" descricao="Título 15/500 com a contagem em mono na mesma linha de base; ordenação no gatilho de filtro e o formato no ViewSwitcher.">
      <Fileira rotulo="Padrão"><div style={{ width: 369 }}><ConversationListHeader title="Abertas" count={128} actions={<><Select appearance="filter" label="Ordenar conversas" defaultValue="recent" options={[{ value: "recent", label: "Recentes" }, { value: "oldest", label: "Antigas" }]} /><ViewSwitcher label="Formato da lista" value="cards" onValueChange={() => undefined} /></>} /></div></Fileira>
      <Fileira rotulo="Título longo"><div style={{ width: 369 }}><ConversationListHeader title="Instagram Loja Centro — atendimento pós-venda" count={1204} actions={<ViewSwitcher label="Formato da lista" value="table" onValueChange={() => undefined} />} /></div></Fileira>
      <Fileira rotulo="Sem ações"><div style={{ width: 369 }}><ConversationListHeader title="Fechadas" count={0} /></div></Fileira>
    </Secao>
  </Prancha>,
};

/** A coluna ao lado da conversa, com cabeçalho, ordenação e formato. Clique para mover a folha da seleção. */
export const Compacta: Story = { render: () => <Lista rows={PESSOAS} /> };
/** A caixa larga: uma linha por pessoa, como um cliente de e-mail. */
export const Larga: Story = { render: () => <Lista rows={PESSOAS} layout="wide" inicial={null} /> };
/** A lista larga encolhida (conversa aberta ao lado): some a caixa, depois o trecho. */
export const LargaEstreita: Story = { name: "Larga e estreita", render: () => <div style={{ display: "flex", gap: 16 }}><Lista rows={PESSOAS} layout="wide" largura={700} /><Lista rows={PESSOAS} layout="wide" largura={480} /></div> };
/** 200 conversas: densidade e rolagem; a folha acompanha a linha escolhida. */
export const DuzentasConversas: Story = { name: "200 conversas", render: () => <Lista rows={DUZENTAS} altura={640} /> };
/** Nomes e assuntos que não cabem: cortam com reticências, sem quebrar a altura da linha. */
export const TextoLongo: Story = { name: "Texto longo", render: () => <Lista rows={[{ ...PESSOAS[0]!, name: "Maria Eduarda Albuquerque de Vasconcelos Figueiredo", title: "Preciso de ajuda com a troca de um produto que chegou com defeito e com a nota fiscal", owner: "Equipe de Atendimento Pós-venda e Trocas", channels: [{ icon: "instagram", label: "Instagram Loja Centro Shopping Iguatemi" }] }, ...PESSOAS.slice(1)]} /> };
/** Coluna estreita (celular ou janela pequena). */
export const Estreita: Story = { render: () => <Lista rows={PESSOAS} largura={300} /> };
/** Caixa sem conversas: a frase curta no lugar das linhas. */
export const Vazia: Story = { render: () => <Lista rows={[]} altura={260} /> };
/** Enquanto a caixa sincroniza. */
export const Carregando: Story = { render: () => <Surface style={{ display: "flex", flexDirection: "column", width: 369, height: 260, overflow: "hidden" }}><ConversationListHeader title="Abertas" /><ConversationList label="Conversas" empty="Carregando conversas…" /></Surface> };
/** Busca sem resultado ou falha de leitura: a mesma frase curta, sem tomar a tela. */
export const SemResultado: Story = { name: "Sem resultado", render: () => <Surface style={{ display: "flex", flexDirection: "column", width: 369, height: 260, overflow: "hidden" }}><ConversationListHeader title="Abertas" count={0} /><ConversationList label="Conversas" empty="Nenhuma conversa encontrada. Tente outro nome, assunto ou caixa." /></Surface> };

/**
 * Troca Conversa ↔ Lista como no atendimento: as folhas morfam (a caixa estica
 * suave e o miolo funde) e cada linha vai do cartão de duas linhas à linha
 * larga sozinha. Quem sai (conversa, detalhes) desliza e funde.
 */
function TrocaDeFormatoDemo() {
  const [layout, setLayout] = useState<ConversationListLayout>("compact");
  const folha = (name: string, morfa = false) => ({ viewTransitionName: name, ...(morfa ? { viewTransitionClass: "folha" } : {}), minHeight: 0, overflow: "hidden" }) as CSSProperties;
  return <div style={{ display: "grid", gridTemplateColumns: layout === "compact" ? "369px minmax(0, 1fr) 320px" : "minmax(0, 1fr)", gap: 8, height: 560 }}>
    <Surface as="section" style={folha("demo-lista", true)}>
      <ConversationListHeader title="Abertas" count={PESSOAS.length} actions={<ViewSwitcher label="Formato" value={layout === "compact" ? "chat" : "list"} onValueChange={value => withViewTransition(() => setLayout(value === "chat" ? "compact" : "wide"))} views={[{ value: "chat", label: "Conversa", icon: "message" }, { value: "list", label: "Lista", icon: "list" }]} />} />
      <ConversationList label="Conversas" layout={layout}>{PESSOAS.map((row, index) => <ConversationRow key={row.id} {...row} index={index} morphId={row.id} onSelect={() => undefined} />)}</ConversationList>
    </Surface>
    {layout === "compact" && <Surface as="section" style={folha("demo-conversa")}><div style={{ padding: 24 }}>Conversa com Carla Menezes</div></Surface>}
    {layout === "compact" && <Surface as="aside" style={folha("demo-detalhes")}><div style={{ padding: 24 }}>Detalhes do atendimento</div></Surface>}
  </div>;
}
export const TrocaDeFormato: Story = { name: "Troca de formato (morph)", render: () => <TrocaDeFormatoDemo /> };
