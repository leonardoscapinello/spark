import type { Meta, StoryObj } from "@storybook/react-vite";
import { DataChart } from "./Chart.js";
import DashboardExamples from "./DashboardExamples.js";
const meta: Meta<typeof DataChart> = { title: "Dashboard/Gráficos", component: DataChart, args: { title:"Conversas", data:[{label:"Seg",volume:12},{label:"Ter",volume:0},{label:"Qua",volume:null},{label:"Qui",volume:18}],series:[{key:"volume",label:"Conversas",color:1}] } };
export default meta;
type Story = StoryObj<typeof DataChart>;
export const Linhas: Story = {};
export const Barras: Story = {args:{kind:"bar"}};
export const Area: Story = {args:{kind:"area"}};
export const Vazio: Story = {args:{data:[]}};
export const Carregando: Story = {args:{state:"loading"}};
export const Erro: Story = {args:{state:"error"}};
export const DashboardCompleto: Story = {render:()=> <DashboardExamples />};

export const Comparacao: Story = { args: { title: "Receita ilustrativa", data: [{label:"Seg",atual:1200,anterior:950},{label:"Ter",atual:1600,anterior:1250},{label:"Qua",atual:1450,anterior:1300},{label:"Qui",atual:1900,anterior:1500}], series: [{key:"atual",label:"Período atual",color:1},{key:"anterior",label:"Período anterior",color:6,comparison:true}] } };
