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
