import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { Chip } from "../Chip/Chip.js";
import { InlineEdit } from "../InlineEdit/InlineEdit.js";
import { Icon } from "../Icon/Icon.js";
import { Signal } from "../Signal/Signal.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { KanbanAddButton, KanbanBoard, KanbanCard, KanbanCardContent, KanbanColumn, KanbanDropBar, KanbanDropZone, KanbanGhost, KanbanPlaceholder, KanbanSkeleton } from "./Kanban.js";
import { useKanbanDrag } from "./useKanbanDrag.js";

const meta: Meta<typeof KanbanBoard> = { title: "Dados/Quadro", component: KanbanBoard, args: { label: "Funil de exemplo", children: null } };
export default meta;
type Story = StoryObj<typeof KanbanBoard>;

interface Card { id: string; column: string; name: string; value: string; tags: string[]; owner: string | null; signal: "danger" | "info" | "warning" }
const COLUMNS = [{ id: "contato", name: "Contato feito", dot: "var(--v2)" }, { id: "proposta", name: "Proposta enviada", dot: "var(--v1)" }, { id: "negociacao", name: "Negociação", dot: "var(--v4)" }];
const SIGNAL = { danger: "Atrasada: Ligar para Ana", info: "Próxima: Enviar proposta", warning: "Sem próximo passo" } as const;

function content(card: Pick<Card, "name" | "value" | "tags" | "owner" | "signal">, actions = true) {
  return <KanbanCardContent
    title={card.name}
    subtitle="Ana Oliveira · Acme"
    {...(actions ? { actions: <Button size="sm" variant="ghost" iconOnly icon={<Icon name="more" />} aria-label={`Ações de ${card.name}`} /> } : {})}
    chips={card.tags.map((tag, index) => <Chip key={tag} size="sm" dot={`var(--v${(index % 4) + 1})`}>{tag}</Chip>)}
    value={card.value}
    signal={<Signal tone={card.signal}>{SIGNAL[card.signal]}</Signal>}
    owner={card.owner ? { name: card.owner } : null}
    date="15/10/2026"
  />;
}

/** Arraste um cartão: o fantasma inclina, o destino abre o espaço tracejado e o cartão pousa. */
function Board() {
  const [cards, setCards] = useState<Card[]>([
    { id: "1", column: "contato", name: "Contrato anual Acme", value: "R$ 48.000,00", tags: ["cliente"], owner: "Carla Prado", signal: "info" },
    { id: "2", column: "contato", name: "Renovação Nimbus", value: "R$ 12.500,00", tags: [], owner: "Rafael Moura", signal: "warning" },
    { id: "3", column: "proposta", name: "Expansão Kaze", value: "R$ 96.000,00", tags: ["demo", "Teste CRM"], owner: "Leonardo Scapinello", signal: "danger" },
  ]);
  const [over, setOver] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const kanban = useKanbanDrag();
  const dragged = kanban.drag ? cards.find((card) => card.id === kanban.drag?.id) : undefined;
  return <>
    <div style={{ height: 520, display: "flex" }}><KanbanBoard label="Funil de exemplo">
      {COLUMNS.map((column) => {
        const present = cards.filter((card) => card.column === column.id && !kanban.isAway(card.id, card.column));
        return <KanbanColumn key={column.id} columnId={column.id} title={column.name} dot={column.dot} count={present.length} total="R$ 60.500,00" over={over === column.id && kanban.drag?.phase === "drag"}
          onDragOver={(event) => { event.preventDefault(); setOver(column.id); }}
          onDrop={(event) => { event.preventDefault(); setOver(null); const id = kanban.drag?.id; if (id) setCards((current) => current.map((card) => card.id === id ? { ...card, column: column.id } : card)); kanban.land(column.id); }}
          footer={<KanbanAddButton onClick={() => setCards((current) => [...current, { id: String(Date.now()), column: column.id, name: "Novo negócio", value: "R$ 0,00", tags: [], owner: null, signal: "warning" }])}>Adicionar negócio</KanbanAddButton>}>
          {cards.filter((card) => card.column === column.id).map((card, index) => <KanbanCard key={card.id} cardId={card.id} index={index} away={kanban.isAway(card.id, card.column)} draggable onDragStart={(event) => kanban.start(event, card.id, card.column)} onDragEnd={() => { setOver(null); setAction(null); kanban.end(); }}>{content(card)}</KanbanCard>)}
          {kanban.drag?.phase === "drag" && over === column.id && <KanbanPlaceholder height={kanban.drag.height} />}
        </KanbanColumn>;
      })}
    </KanbanBoard></div>
    <KanbanGhost drag={kanban.drag} ghostRef={kanban.ghostRef} origin={kanban.origin}>{dragged && content(dragged, false)}</KanbanGhost>
    {kanban.drag?.phase === "drag" && <KanbanDropBar label="Soltar o negócio numa ação">
      {(["Ganho", "Perdido", "Arquivar"] as const).map((label) => <KanbanDropZone key={label} over={action === label} tone={label === "Ganho" ? "success" : label === "Perdido" ? "danger" : "neutral"} onDragOver={(event) => { event.preventDefault(); setAction(label); }} onDragLeave={() => setAction(null)} onDrop={(event) => { event.preventDefault(); setAction(null); kanban.land(null); }}>{action === label ? "Soltar aqui" : label}</KanbanDropZone>)}
    </KanbanDropBar>}
  </>;
}

export const Interativo: Story = { render: () => <Board /> };

/** As peças, lado a lado: coluna, cartão em cada estado, espaço de destino e barra de ações. */
export const Variantes: Story = {
  render: () => <Prancha>
    <Secao titulo="Cartão" descricao="Folha pousada de raio 24; etiquetas neutras com o ponto da cor; valor em mono; próximo passo como sinal; responsável em avatar de 24.">
      <Fileira rotulo="Em aberto" topo><Mesa largura={256}><KanbanCard cardId="a">{content({ name: "Contrato anual Acme", value: "R$ 48.000,00", tags: ["cliente", "demo"], owner: "Carla Prado", signal: "info" })}</KanbanCard></Mesa></Fileira>
      <Fileira rotulo="Atrasado" topo><Mesa largura={256}><KanbanCard cardId="b">{content({ name: "Expansão Kaze", value: "R$ 96.000,00", tags: [], owner: "Rafael Moura", signal: "danger" })}</KanbanCard></Mesa></Fileira>
      <Fileira rotulo="Sem próximo passo" topo><Mesa largura={256}><KanbanCard cardId="c">{content({ name: "Renovação Nimbus", value: "R$ 12.500,00", tags: [], owner: null, signal: "warning" })}</KanbanCard></Mesa></Fileira>
      <Fileira rotulo="Ganho" topo><Mesa largura={256}><KanbanCard cardId="d"><KanbanCardContent title="Licenças 2026" chips={[<Chip key="s" size="sm" dot tone="success">Ganho</Chip>]} value="R$ 30.000,00" owner={{ name: "Leonardo Scapinello" }} /></KanbanCard></Mesa></Fileira>
      <Fileira rotulo="Nome longo, muitas etiquetas" topo><Mesa largura={256}><KanbanCard cardId="e">{content({ name: "Implantação completa do CRM para a operação comercial nacional", value: "R$ 1.250.000,00", tags: ["cliente", "enterprise", "Teste CRM", "renovação", "prioridade"], owner: "Ana Beatriz de Oliveira Santos", signal: "info" })}</KanbanCard></Mesa></Fileira>
      <Fileira rotulo="Fantasma (sem menu)" topo><Mesa largura={256}><KanbanCard cardId="f">{content({ name: "Contrato anual Acme", value: "R$ 48.000,00", tags: ["cliente"], owner: "Carla Prado", signal: "info" }, false)}</KanbanCard></Mesa></Fileira>
    </Secao>
    <Secao titulo="Coluna" descricao="Papel cavado de raio 36; cor da etapa só no ponto; contador em folha.">
      <Fileira rotulo="Vazia e destino" topo>
        <div style={{ display: "flex", gap: 12, height: 300 }}>
          <KanbanColumn columnId="vazia" title="Entrada" dot="var(--tx3)" count={0} total="R$ 0,00" footer={<KanbanAddButton>Adicionar negócio</KanbanAddButton>} />
          <KanbanColumn columnId="destino" title="Negociação" dot="var(--v4)" count={1} total="R$ 96.000,00" over><KanbanPlaceholder height={120} /></KanbanColumn>
        </div>
      </Fileira>
      <Fileira rotulo="Carregando" topo><div style={{ display: "flex", height: 300 }}><KanbanSkeleton label="Carregando funil" columns={2} /></div></Fileira>
    </Secao>
    <Secao titulo="Barra de ações do arrasto">
      <Fileira rotulo="Zonas"><div style={{ position: "relative", display: "flex", gap: 8 }}><KanbanDropZone tone="success" icon={<Icon name="check" />}>Ganho</KanbanDropZone><KanbanDropZone tone="danger" icon={<Icon name="close" />} over>Soltar aqui</KanbanDropZone><KanbanDropZone icon={<Icon name="folder" />}>Arquivar</KanbanDropZone></div></Fileira>
    </Secao>
  </Prancha>,
};

export const MuitosCartoes: Story = {
  render: () => <div style={{ height: 560, display: "flex" }}><KanbanBoard label="Funil cheio">
    {COLUMNS.map((column, columnIndex) => <KanbanColumn key={column.id} columnId={column.id} title={column.name} dot={column.dot} count={12} total="R$ 480.000,00" footer={<KanbanAddButton>Adicionar negócio</KanbanAddButton>}>
      {Array.from({ length: 12 }, (_, index) => <KanbanCard key={index} cardId={`${column.id}-${index}`} index={index}>{content({ name: `Negócio ${columnIndex + 1}.${index + 1}`, value: "R$ 40.000,00", tags: index % 3 === 0 ? ["cliente"] : [], owner: index % 2 ? "Carla Prado" : null, signal: index % 4 === 0 ? "danger" : "info" })}</KanbanCard>)}
    </KanbanColumn>)}
  </KanbanBoard></div>,
};

function EditableHeadings() {
  const [names, setNames] = useState(["Novo", "Contato feito", "Qualificação e apresentação da proposta comercial"]);
  return <div style={{ display: "flex", height: 400 }}><KanbanBoard label="Títulos editáveis completos">
    {names.map((name, index) => <KanbanColumn key={index} columnId={String(index)}
      title={<InlineEdit label="nome da etapa" value={name} appearance="compact" wrap saveOnBlur onSave={(value) => setNames(current => current.map((item, position) => position === index ? value : item))} />}
      dot="var(--v1)" count={0} total="R$ 0,00"
      actions={<Button size="sm" variant="ghost" iconOnly icon={<Icon name="more" />} aria-label="Configurar etapa" />}
      footer={<KanbanAddButton>Adicionar negócio</KanbanAddButton>} />)}
  </KanbanBoard></div>;
}
export const TitulosEditaveis: Story = { render: () => <EditableHeadings /> };
