import type { Meta, StoryObj } from "@storybook/react-vite";
import { TableExamples } from "../Catalog/TableExamples.js";
import { DataTable } from "./DataTable.js";
const meta:Meta<typeof TableExamples>={title:"Dados/Tabelas responsivas",component:TableExamples};
export default meta;
export const Interativas:StoryObj<typeof TableExamples>={};
export const Carregando = () => <DataTable label="Pessoas" rows={[]} columns={[{id:"name",label:"Pessoa",cell:(row:{id:string})=>row.id},{id:"company",label:"Empresa",cell:(row:{id:string})=>row.id},{id:"stage",label:"Etapa",cell:(row:{id:string})=>row.id}]} rowKey={(row)=>row.id} state="loading" />;
