import { render,screen,fireEvent,within } from "@testing-library/react";
import { it,expect,vi } from "vitest";
import { DataTable } from "./DataTable.js";
import { Button } from "../Button/Button.js";
it("ordena sem alterar os dados recebidos e preserva a ação da linha",()=>{
 const rows=[{id:"m",name:"Maria"},{id:"a",name:"Ana"}];const action=vi.fn();
 render(<DataTable label="Contatos" rows={rows} rowKey={r=>r.id} columns={[{id:"name",label:"Nome",cell:r=>r.name,sortValue:r=>r.name}]} actions={r=><Button onClick={()=>action(r.id)}>Abrir {r.name}</Button>} />);
 fireEvent.click(screen.getByRole("button",{name:"Nome"}));
 expect(within(screen.getAllByRole("row")[1]!).getByText("Ana")).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Abrir Ana"}));expect(action).toHaveBeenCalledWith("a");expect(rows[0]?.name).toBe("Maria");
});

it("expande a linha correta e mantém sua identidade após ordenar",()=>{
 const rows=[{id:"m",name:"Maria"},{id:"a",name:"Ana"}];
 render(<DataTable label="Expansão" rows={rows} rowKey={r=>r.id} rowLabel={r=>r.name} columns={[{id:"name",label:"Pessoa",cell:r=>r.name,sortValue:r=>r.name}]} renderExpanded={r=><p>Detalhes de {r.name}</p>}/>);
 fireEvent.click(screen.getByRole("button",{name:"Expandir detalhes de Maria"}));
 expect(screen.getByText("Detalhes de Maria")).toBeVisible();
 expect(screen.queryByText("Detalhes de Ana")).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Pessoa"}));
 expect(screen.getByRole("button",{name:"Recolher detalhes de Maria"})).toHaveAttribute("aria-expanded","true");
 fireEvent.click(screen.getByRole("button",{name:"Recolher detalhes de Maria"}));
 expect(screen.queryByText("Detalhes de Maria")).not.toBeInTheDocument();
});

it("seleciona linha e tudo pela chave, sem depender da ordem exibida",()=>{
 const rows=[{id:"m",name:"Maria"},{id:"a",name:"Ana"}];const onSelectionChange=vi.fn();
 const view=(selectedIds:string[])=><DataTable label="Contatos" rows={rows} rowKey={r=>r.id} rowLabel={r=>r.name} columns={[{id:"name",label:"Nome",cell:r=>r.name,sortValue:r=>r.name}]} selectedIds={selectedIds} onSelectionChange={onSelectionChange}/>;
 const {rerender}=render(view([]));
 fireEvent.click(screen.getByRole("checkbox",{name:"Selecionar Ana"}));
 expect(onSelectionChange).toHaveBeenCalledWith(["a"]);
 rerender(view(["a"]));
 const todas=screen.getByRole("checkbox",{name:"Selecionar todas as linhas de Contatos"});
 expect(todas).toHaveAttribute("data-indeterminate");
 fireEvent.click(todas);
 expect(onSelectionChange).toHaveBeenLastCalledWith(["m","a"]);
 rerender(view(["m","a"]));
 fireEvent.click(screen.getByRole("button",{name:"Nome"}));
 fireEvent.click(screen.getByRole("checkbox",{name:`Limpar seleção de Contatos`}));
 expect(onSelectionChange).toHaveBeenLastCalledWith([]);
});

it("não mostra caixas de seleção quando o consumidor não trata seleção",()=>{
 render(<DataTable label="Contatos" rows={[{id:"a",name:"Ana"}]} rowKey={r=>r.id} columns={[{id:"name",label:"Nome",cell:r=>r.name}]}/>);
 expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
});

it("esconde a coluna escolhida no catálogo e protege a coluna de identidade",async()=>{
 const rows=[{id:"a",name:"Ana",company:"Vega"}];const onHiddenColumnsChange=vi.fn();
 const columns=[{id:"name",label:"Nome",cell:(r:typeof rows[number])=>r.name,alwaysVisible:true},{id:"company",label:"Empresa",cell:(r:typeof rows[number])=>r.company,group:"Geral"}];
 const {rerender}=render(<DataTable label="Contatos" rows={rows} rowKey={r=>r.id} columns={columns} hiddenColumnIds={[]} onHiddenColumnsChange={onHiddenColumnsChange}/>);
 fireEvent.click(screen.getByRole("button",{name:"Escolher colunas de Contatos"}));
 expect(await screen.findByText("Geral")).toBeInTheDocument();
 expect(screen.getByRole("checkbox",{name:"Nome"})).toHaveAttribute("aria-disabled","true");
 fireEvent.click(screen.getByRole("checkbox",{name:"Empresa"}));
 expect(onHiddenColumnsChange).toHaveBeenCalledWith(["company"]);
 rerender(<DataTable label="Contatos" rows={rows} rowKey={r=>r.id} columns={columns} hiddenColumnIds={["company"]} onHiddenColumnsChange={onHiddenColumnsChange}/>);
 expect(screen.queryByRole("columnheader",{name:"Empresa"})).not.toBeInTheDocument();
 expect(screen.getByRole("columnheader",{name:"Nome"})).toBeInTheDocument();
});

it("não oferece catálogo quando o consumidor não trata colunas escondidas",()=>{
 render(<DataTable label="Contatos" rows={[{id:"a",name:"Ana"}]} rowKey={r=>r.id} columns={[{id:"name",label:"Nome",cell:r=>r.name}]}/>);
 expect(screen.queryByRole("button",{name:/Escolher colunas/})).not.toBeInTheDocument();
});

it("ajusta a largura da coluna pelo teclado e devolve a automática com Home",()=>{
 const onColumnWidthsChange=vi.fn();
 const render1=(widths:Record<string,number>)=>render(<DataTable label="Contatos" rows={[{id:"a",name:"Ana"}]} rowKey={r=>r.id} columns={[{id:"name",label:"Nome",cell:r=>r.name}]} columnWidths={widths} onColumnWidthsChange={onColumnWidthsChange}/>);
 const {rerender}=render1({});
 const alca=screen.getByRole("separator",{name:"Redimensionar coluna Nome"});
 fireEvent.keyDown(alca,{key:"ArrowRight"});
 expect(onColumnWidthsChange).toHaveBeenCalledWith({name:expect.any(Number)});
 rerender(<DataTable label="Contatos" rows={[{id:"a",name:"Ana"}]} rowKey={r=>r.id} columns={[{id:"name",label:"Nome",cell:r=>r.name}]} columnWidths={{name:200}} onColumnWidthsChange={onColumnWidthsChange}/>);
 const ajustada=screen.getByRole("separator",{name:"Redimensionar coluna Nome"});
 expect(ajustada).toHaveAttribute("aria-valuenow","200");
 fireEvent.keyDown(ajustada,{key:"ArrowLeft"});
 expect(onColumnWidthsChange).toHaveBeenLastCalledWith({name:184});
 fireEvent.keyDown(ajustada,{key:"Home"});
 expect(onColumnWidthsChange).toHaveBeenLastCalledWith({});
});

it("não desce abaixo da largura mínima",()=>{
 const onColumnWidthsChange=vi.fn();
 render(<DataTable label="Contatos" rows={[{id:"a",name:"Ana"}]} rowKey={r=>r.id} columns={[{id:"name",label:"Nome",cell:r=>r.name}]} columnWidths={{name:70}} onColumnWidthsChange={onColumnWidthsChange}/>);
 fireEvent.keyDown(screen.getByRole("separator",{name:"Redimensionar coluna Nome"}),{key:"ArrowLeft"});
 expect(onColumnWidthsChange).toHaveBeenLastCalledWith({name:64});
});

it("não oferece alça quando o consumidor não trata largura",()=>{
 render(<DataTable label="Contatos" rows={[{id:"a",name:"Ana"}]} rowKey={r=>r.id} columns={[{id:"name",label:"Nome",cell:r=>r.name}]}/>);
 expect(screen.queryByRole("separator")).not.toBeInTheDocument();
});

it("reordena a coluna por arrasto e por Control com as setas",()=>{
 const onColumnOrderChange=vi.fn();
 const columns=[{id:"name",label:"Nome",cell:(r:{id:string})=>r.id},{id:"company",label:"Empresa",cell:(r:{id:string})=>r.id},{id:"stage",label:"Etapa",cell:(r:{id:string})=>r.id}];
 render(<DataTable label="Contatos" rows={[{id:"a"}]} rowKey={r=>r.id} columns={columns} columnOrder={["name","company","stage"]} onColumnOrderChange={onColumnOrderChange}/>);
 const [nome,,etapa]=screen.getAllByRole("columnheader");
 fireEvent.dragStart(etapa!,{dataTransfer:{effectAllowed:""}});
 fireEvent.dragOver(nome!);
 fireEvent.drop(nome!);
 expect(onColumnOrderChange).toHaveBeenCalledWith(["stage","name","company"]);
 fireEvent.keyDown(nome!,{key:"ArrowRight",ctrlKey:true});
 expect(onColumnOrderChange).toHaveBeenLastCalledWith(["company","name","stage"]);
 fireEvent.keyDown(nome!,{key:"ArrowLeft",ctrlKey:true});
 expect(onColumnOrderChange).toHaveBeenCalledTimes(2);
});

it("respeita a ordem recebida e ignora seta sem Control",()=>{
 const onColumnOrderChange=vi.fn();
 const columns=[{id:"name",label:"Nome",cell:(r:{id:string})=>r.id},{id:"company",label:"Empresa",cell:(r:{id:string})=>r.id}];
 render(<DataTable label="Contatos" rows={[{id:"a"}]} rowKey={r=>r.id} columns={columns} columnOrder={["company","name"]} onColumnOrderChange={onColumnOrderChange}/>);
 expect(screen.getAllByRole("columnheader").map(cell=>cell.textContent)).toEqual(["Empresa","Nome"]);
 fireEvent.keyDown(screen.getAllByRole("columnheader")[0]!,{key:"ArrowRight"});
 expect(onColumnOrderChange).not.toHaveBeenCalled();
});

it("não arrasta cabeçalho quando o consumidor não trata ordem",()=>{
 render(<DataTable label="Contatos" rows={[{id:"a",name:"Ana"}]} rowKey={r=>r.id} columns={[{id:"name",label:"Nome",cell:r=>r.name}]}/>);
 expect(screen.getByRole("columnheader")).not.toHaveAttribute("draggable");
});


it("combina filtros por coluna, encontra valores fora da página e limpa tudo",async()=>{
 const rows=[{id:"1",name:"Ana",team:"Comercial",level:"Alto"},{id:"2",name:"Bia",team:"Suporte",level:"Baixo"},{id:"3",name:"Caio",team:"Suporte",level:"Alto"}];
 render(<DataTable label="Filtros" rows={rows} pageSize={1} rowKey={r=>r.id} columns={[{id:"name",label:"Pessoa",cell:r=>r.name},{id:"team",label:"Equipe",cell:r=>r.team,filterValue:r=>r.team},{id:"level",label:"Prioridade",cell:r=>r.level,filterValue:r=>r.level}]} />);
 fireEvent.click(screen.getByRole("button",{name:"Filtrar Equipe"}));
 fireEvent.click(await screen.findByRole("checkbox",{name:"Comercial"}));
 expect(screen.getByRole("region",{name:"Filtros"})).toHaveTextContent("Bia");
 fireEvent.keyDown(document.activeElement ?? document.body,{key:"Escape"});
 fireEvent.click(screen.getByRole("button",{name:"Filtrar Prioridade"}));
 fireEvent.click(await screen.findByRole("checkbox",{name:"Baixo"}));
 expect(screen.getByRole("region",{name:"Filtros"})).toHaveTextContent("Caio");
 expect(screen.getByRole("region",{name:"Filtros"})).not.toHaveTextContent("Ana");
 fireEvent.keyDown(document.activeElement ?? document.body,{key:"Escape"});
 fireEvent.click(screen.getByRole("button",{name:"Limpar todos os filtros"}));
 expect(screen.getByRole("region",{name:"Filtros"})).toHaveTextContent("Ana");
 expect(screen.getByText("Página 1 de 3 · 3 registros")).toBeInTheDocument();
});

it("busca opções e distingue nenhum valor selecionado de filtro limpo",async()=>{
 const rows=[{id:"1",name:"Ana",team:null},{id:"2",name:"Bia",team:"Suporte"}];
 render(<DataTable label="Vazios" rows={rows} rowKey={r=>r.id} columns={[{id:"name",label:"Pessoa",cell:r=>r.name},{id:"team",label:"Equipe",cell:r=>r.team,filterValue:r=>r.team}]} />);
 fireEvent.click(screen.getByRole("button",{name:"Filtrar Equipe"}));
 const search=await screen.findByRole("textbox",{name:"Buscar valores de Equipe"});
 fireEvent.change(search,{target:{value:"sup"}});
 expect(screen.queryByRole("checkbox",{name:"(Vazios)"})).not.toBeInTheDocument();
 expect(screen.getByRole("checkbox",{name:"Suporte"})).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Desmarcar todos"}));
 expect(screen.getByText("Nenhum resultado para os filtros selecionados.")).toBeInTheDocument();
 fireEvent.change(search,{target:{value:""}});
 fireEvent.click(screen.getByRole("checkbox",{name:"(Vazios)"}));
 expect(screen.getByRole("region",{name:"Vazios"})).toHaveTextContent("Ana");
 expect(screen.getByRole("region",{name:"Vazios"})).not.toHaveTextContent("Bia");
 fireEvent.click(screen.getByRole("button",{name:"Limpar filtro desta coluna"}));
 expect(screen.getByRole("region",{name:"Vazios"})).toHaveTextContent("Bia");
});
