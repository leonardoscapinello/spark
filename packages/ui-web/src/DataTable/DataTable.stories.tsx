import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Chip } from "../Chip/Chip.js";
import { CollectionToolbar } from "../CollectionToolbar/CollectionToolbar.js";
import { Icon } from "../Icon/Icon.js";
import { MenuButton, MenuItem } from "../Menu/Menu.js";
import { PersonIdentity } from "../PersonIdentity/PersonIdentity.js";
import { Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { DataTable, type TableColumn } from "./DataTable.js";
import { TableActions, TableIconAction } from "./TableActions.js";

interface Pessoa { id: string; nome: string; email: string; empresa: string; etapa: string; tom: "neutral" | "info" | "success" | "warning"; valor: number }

const ETAPAS = [["Novo lead", "neutral"], ["Em contato", "info"], ["Qualificado", "success"], ["Proposta", "warning"]] as const;
const NOMES = ["Ana Souza", "Rafael Lima", "Beatriz Nogueira", "Carlos Dias", "Marina Costa", "João Pedro Alves", "Luiza Prado", "Diego Melo"];
const EMPRESAS = ["Aurora Cosméticos", "Vega Engenharia", "Arco Logística", "Trilha Educação"];

function pessoas(quantidade: number): Pessoa[] {
  return Array.from({ length: quantidade }, (_, indice) => {
    const nome = NOMES[indice % NOMES.length] ?? "Pessoa";
    const [etapa, tom] = ETAPAS[indice % ETAPAS.length] ?? ETAPAS[0];
    return {
      id: String(indice + 1),
      nome: indice < NOMES.length ? nome : `${nome} ${Math.floor(indice / NOMES.length) + 1}`,
      email: `${nome.split(" ")[0]?.toLowerCase() ?? "pessoa"}${indice}@exemplo.com.br`,
      empresa: EMPRESAS[indice % EMPRESAS.length] ?? "",
      etapa,
      tom,
      valor: ((indice * 7919) % 90000) * 100 + 150000,
    };
  });
}

const real = (centavos: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);

const COLUNAS: readonly TableColumn<Pessoa>[] = [
  { id: "pessoa", label: "Pessoa", cell: linha => <PersonIdentity name={linha.nome} detail={linha.email} />, sortValue: linha => linha.nome, alwaysVisible: true },
  { id: "empresa", label: "Empresa", cell: linha => linha.empresa, sortValue: linha => linha.empresa, group: "Geral" },
  { id: "etapa", label: "Etapa", cell: linha => <Chip dot tone={linha.tom}>{linha.etapa}</Chip>, sortValue: linha => linha.etapa, group: "Geral" },
  { id: "valor", label: "Valor", cell: linha => real(linha.valor), sortValue: linha => linha.valor, align: "end", group: "Negócio" },
];

const DADOS = pessoas(8);

function Aberto({ children }: { children: (abrir: (linha: Pessoa, opcoes: { newTab: boolean }) => void, ultima: string) => ReactNode }) {
  const [ultima, setUltima] = useState("Clique numa linha, aperte Enter ou use o botão do meio.");
  return <>{children((linha, { newTab }) => setUltima(`Abriria ${linha.nome}${newTab ? " em nova aba" : ""}.`), ultima)}</>;
}

const meta: Meta<typeof DataTable> = {
  title: "Dados/Tabela",
  component: DataTable,
  subcomponents: { TableActions, TableIconAction },
  parameters: {
    docs: { description: { component: "Tabela de registros. Regra do produto: a linha inteira abre a página do registro (clique, Enter, Cmd/Ctrl ou botão do meio para nova aba). No hover, uma tira de papel acompanha a linha. Cabeçalho 11 em --tx3, linhas de 52, números em mono alinhados à direita. Seleção, catálogo de colunas, ordem e largura são da tela." } },
  },
};

export default meta;
type Story = StoryObj<typeof DataTable>;

export const Interativo: Story = {
  name: "Linha abre o registro",
  render: () => (
    <Aberto>
      {(abrir, ultima) => (
        <Prancha>
          <p role="status">{ultima}</p>
          <DataTable label="Pessoas" rows={DADOS} columns={COLUNAS} rowKey={linha => linha.id} rowLabel={linha => linha.nome} onRowOpen={abrir} />
        </Prancha>
      )}
    </Aberto>
  ),
};

export const Estados: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Carregando"><DataTable label="Pessoas carregando" rows={[]} columns={COLUNAS} rowKey={linha => linha.id} state="loading" /></Secao>
      <Secao titulo="Vazio"><DataTable label="Pessoas vazio" rows={[]} columns={COLUNAS} rowKey={linha => linha.id} emptyText="Nenhuma pessoa com esses filtros" /></Secao>
      <Secao titulo="Erro"><DataTable label="Pessoas com erro" rows={[]} columns={COLUNAS} rowKey={linha => linha.id} state="error" onRetry={() => undefined} /></Secao>
    </Prancha>
  ),
};

function Selecao() {
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  return (
    <>
      <CollectionToolbar
        count={selecionadas.length ? `${selecionadas.length} de ${DADOS.length} selecionadas` : `${DADOS.length} pessoas`}
        actions={selecionadas.length ? <><Button size="sm" variant="secondary" icon={<Icon name="send" />}>Nova mensagem</Button><Button size="sm" variant="secondary" icon={<Icon name="tag" />}>Etiquetar</Button><Button size="sm" variant="ghost" onClick={() => setSelecionadas([])}>Limpar</Button></> : undefined}
      />
      <DataTable label="Pessoas selecionáveis" rows={DADOS} columns={COLUNAS} rowKey={linha => linha.id} rowLabel={linha => linha.nome} selectedIds={selecionadas} onSelectionChange={setSelecionadas} onRowOpen={() => undefined} />
    </>
  );
}

export const SelecaoEmLote: Story = {
  name: "Seleção em lote",
  render: () => <Selecao />,
};

function ControleTotal() {
  const [escondidas, setEscondidas] = useState<string[]>([]);
  const [ordem, setOrdem] = useState<string[]>(COLUNAS.map(coluna => coluna.id));
  const [larguras, setLarguras] = useState<Record<string, number>>({});
  return <DataTable label="Pessoas com colunas sob medida" rows={DADOS} columns={COLUNAS} rowKey={linha => linha.id} rowLabel={linha => linha.nome} hiddenColumnIds={escondidas} onHiddenColumnsChange={setEscondidas} columnOrder={ordem} onColumnOrderChange={setOrdem} columnWidths={larguras} onColumnWidthsChange={setLarguras} onRowOpen={() => undefined} />;
}

export const ColunasSobMedida: Story = {
  name: "Colunas sob medida",
  parameters: { docs: { description: { story: "O + no fim do cabeçalho abre o catálogo de colunas (o mesmo vidro de lista). Arraste o cabeçalho para mover a coluna, ou Control + setas. Arraste a borda direita para mudar a largura; Home devolve a automática." } } },
  render: () => <ControleTotal />,
};

export const AcoesEDetalhes: Story = {
  name: "Ações e detalhes",
  render: () => (
    <DataTable
      label="Pessoas com ações"
      rows={DADOS.slice(0, 4)}
      columns={COLUNAS}
      rowKey={linha => linha.id}
      rowLabel={linha => linha.nome}
      onRowOpen={() => undefined}
      actions={linha => (
        <TableActions>
          <TableIconAction label={`Enviar mensagem para ${linha.nome}`} icon={<Icon name="send" />} />
          <MenuButton variant="ghost" size="sm" iconOnly indicator={false} icon={<Icon name="more" />} aria-label={`Mais ações para ${linha.nome}`} menu={<><MenuItem icon={<Icon name="copy" />}>Duplicar</MenuItem><MenuItem danger icon={<Icon name="trash" />}>Excluir</MenuItem></>} />
        </TableActions>
      )}
      renderExpanded={linha => <p>{linha.nome} trabalha em {linha.empresa}. Última conversa há 3 dias.</p>}
    />
  ),
};

export const MuitasLinhas: Story = {
  name: "Muitas linhas",
  render: () => <DataTable label="Duzentas pessoas" rows={pessoas(200)} columns={COLUNAS} rowKey={linha => linha.id} rowLabel={linha => linha.nome} onRowOpen={() => undefined} />,
};

export const Estreita: Story = {
  name: "Largura estreita",
  render: () => <Mesa largura={360}><DataTable label="Pessoas no celular" rows={DADOS} columns={COLUNAS} rowKey={linha => linha.id} rowLabel={linha => linha.nome} onRowOpen={() => undefined} /></Mesa>,
};
