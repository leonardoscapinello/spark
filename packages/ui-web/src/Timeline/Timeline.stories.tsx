import type { Meta, StoryObj } from "@storybook/react-vite";
import { TooltipProvider } from "../Tooltip/Tooltip.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { Timeline, type TimelineItem } from "./Timeline.js";

const today = new Date();
const at = (daysAgo: number, hour: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo, hour, 12).toISOString();
const ITEMS: TimelineItem[] = [
  { id: "1", title: "Etapa alterada", timestamp: at(0, 15), tone: "accent", actor: { name: "Carla Prado", email: "carla@acme.com" }, changes: [{ label: "Etapa", before: "Qualificado", after: "Proposta enviada" }] },
  { id: "2", title: "Nota registrada", timestamp: at(0, 11), description: "Cliente pediu revisão do escopo.", actor: { name: "Rafael Moura" } },
  { id: "3", title: "Negócio ganho", timestamp: at(1, 17), tone: "positive" },
  { id: "4", title: "Valor alterado", timestamp: at(1, 10), tone: "negative", changes: [{ label: "Valor", before: "R$ 50.000,00", after: "R$ 42.000,00" }] },
  { id: "5", title: "Negócio criado", timestamp: at(2, 9), actor: { name: "Leonardo Scapinello" } },
];

const meta: Meta<typeof Timeline> = { title: "Dados/Linha do tempo", component: Timeline, decorators: [(Story) => <TooltipProvider><Story /></TooltipProvider>], args: { items: ITEMS, groupByDay: true, density: "default" } };
export default meta;
type Story = StoryObj<typeof Timeline>;

export const Interativo: Story = { render: (args) => <Mesa largura={460}><Timeline {...args} /></Mesa> };

export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Densidade e agrupamento" descricao="Grupos por dia com ponto em tinta 3; eventos num fio de 1px; hora em mono.">
    <Fileira rotulo="Por dia" topo><Mesa largura={460}><Timeline groupByDay items={ITEMS} /></Mesa></Fileira>
    <Fileira rotulo="Densa" topo><Mesa largura={460}><Timeline groupByDay density="compact" items={ITEMS} /></Mesa></Fileira>
    <Fileira rotulo="Sem agrupar" topo><Mesa largura={460}><Timeline items={ITEMS.slice(0, 3)} /></Mesa></Fileira>
    <Fileira rotulo="Vazia" topo><Mesa largura={460}><Timeline items={[]} emptyText="As próximas alterações deste negócio aparecerão aqui." /></Mesa></Fileira>
    <Fileira rotulo="Estreita" topo><Mesa largura={260}><Timeline groupByDay density="compact" items={ITEMS} /></Mesa></Fileira>
  </Secao></Prancha>,
};

export const MuitosEventos: Story = { render: () => <Mesa largura={460}><Timeline groupByDay density="compact" initialCount={10} pageSize={10} items={Array.from({ length: 40 }, (_, index) => ({ id: String(index), title: `Campo alterado ${index + 1}`, timestamp: at(Math.floor(index / 6), 18 - (index % 6)), changes: [{ label: "Origem", before: "Site", after: "Indicação" }] }))} /></Mesa> };
