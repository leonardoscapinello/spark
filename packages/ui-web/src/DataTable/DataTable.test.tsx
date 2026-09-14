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
