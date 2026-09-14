import { render, screen, fireEvent } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { FilterBar, type FilterCondition, type FilterFieldDefinition } from "./FilterBar.js";

const fields: FilterFieldDefinition[] = [
  { id: "leadStatus", label: "Etapa", type: "select", group: "Pessoa", options: [{ value: "new", label: "Novo lead" }, { value: "qualified", label: "Qualificado" }] },
  { id: "score", label: "Pontuação", type: "number", group: "Pessoa" },
  { id: "custom:plano", label: "Plano", type: "text", group: "Campos personalizados" },
];

it("adiciona uma condição já com o primeiro operador do tipo",async()=>{
 const onChange=vi.fn();
 render(<FilterBar fields={fields} filters={[]} onChange={onChange}/>);
 fireEvent.click(screen.getByRole("button",{name:"Adicionar filtro"}));
 fireEvent.click(await screen.findByRole("button",{name:"Pontuação"}));
 expect(onChange).toHaveBeenCalledWith([{field:"score",operator:"is",value:null}]);
});

it("descreve a condição pelo rótulo da opção, não pelo valor cru",()=>{
 const filters:FilterCondition[]=[{field:"leadStatus",operator:"is",value:"qualified"}];
 render(<FilterBar fields={fields} filters={filters} onChange={vi.fn()}/>);
 expect(screen.getByRole("button",{name:"Etapa é Qualificado"})).toBeInTheDocument();
});

it("mostra que falta valor em vez de fingir condição pronta",()=>{
 render(<FilterBar fields={fields} filters={[{field:"leadStatus",operator:"is",value:null}]} onChange={vi.fn()}/>);
 expect(screen.getByRole("button",{name:"Etapa é…"})).toBeInTheDocument();
});

it("operador sem valor não pede valor",()=>{
 render(<FilterBar fields={fields} filters={[{field:"leadStatus",operator:"is_empty",value:null}]} onChange={vi.fn()}/>);
 expect(screen.getByRole("button",{name:"Etapa está vazio"})).toBeInTheDocument();
});

it("remove a condição certa quando há duas do mesmo campo",()=>{
 const onChange=vi.fn();
 const filters:FilterCondition[]=[{field:"score",operator:"gt",value:"10"},{field:"score",operator:"lt",value:"90"}];
 render(<FilterBar fields={fields} filters={filters} onChange={onChange}/>);
 fireEvent.click(screen.getAllByRole("button",{name:"Remover filtro Pontuação"})[1]!);
 expect(onChange).toHaveBeenCalledWith([{field:"score",operator:"gt",value:"10"}]);
});

it("ignora condição de campo que não existe mais",()=>{
 render(<FilterBar fields={fields} filters={[{field:"campo_apagado",operator:"is",value:"x"}]} onChange={vi.fn()}/>);
 expect(screen.getByRole("group",{name:"Filtros aplicados"})).toBeInTheDocument();
 expect(screen.queryByText(/campo_apagado/)).not.toBeInTheDocument();
});
