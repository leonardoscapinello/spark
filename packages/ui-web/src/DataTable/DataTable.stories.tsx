import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TableExamples } from "../Catalog/TableExamples.js";
import { CollectionToolbar } from "../CollectionToolbar/CollectionToolbar.js";
import { Button } from "../Button/Button.js";
import { DataTable } from "./DataTable.js";
const meta:Meta<typeof TableExamples>={title:"Dados/Tabelas responsivas",component:TableExamples};
export default meta;
export const Interativas:StoryObj<typeof TableExamples>={};
export const Carregando = () => <DataTable label="Pessoas" rows={[]} columns={[{id:"name",label:"Pessoa",cell:(row:{id:string})=>row.id},{id:"company",label:"Empresa",cell:(row:{id:string})=>row.id},{id:"stage",label:"Etapa",cell:(row:{id:string})=>row.id}]} rowKey={(row)=>row.id} state="loading" />;
export const Selecao = () => <SelectionExample />;

const people=[
 {id:"1",name:"Ana Prado",company:"Vega",stage:"Novo lead"},
 {id:"2",name:"Bruno Dias",company:"Arco",stage:"Em contato"},
 {id:"3",name:"Carla Nunes",company:"Vega",stage:"Qualificado"},
 {id:"4",name:"Diego Melo",company:"Trilha",stage:"Novo lead"},
];

/** A seleção pertence à tela: a tabela só informa o que mudou, e a barra decide
 * quais ações em lote ficam disponíveis. */
function SelectionExample(){
 const [selected,setSelected]=useState<string[]>([]);
 return <>
  <CollectionToolbar
   count={selected.length?`${selected.length} de ${people.length} selecionadas`:`${people.length} pessoas`}
   actions={selected.length?<>
    <Button size="sm" variant="secondary">Nova mensagem</Button>
    <Button size="sm" variant="secondary">Adicionar marcação</Button>
    <Button size="sm" variant="ghost" onClick={()=>setSelected([])}>Limpar</Button>
   </>:undefined}
  />
  <DataTable label="Pessoas" rows={people} rowKey={row=>row.id} rowLabel={row=>row.name}
   columns={[{id:"name",label:"Pessoa",cell:row=>row.name,sortValue:row=>row.name},{id:"company",label:"Empresa",cell:row=>row.company,sortValue:row=>row.company},{id:"stage",label:"Etapa",cell:row=>row.stage}]}
   selectedIds={selected} onSelectionChange={setSelected}/>
 </>;
}
