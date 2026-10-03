import { render,screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it,expect,vi } from "vitest";
import { SearchSelect } from "./SearchSelect.js";
it("busca no próprio campo sem criar outro input e troca a seleção pelo teclado", async () => {
 const user = userEvent.setup();
 const change = vi.fn();
 const options = [{ value: "lic", label: "Licença mensal" }, { value: "sup", label: "Suporte premium" }];
 render(<SearchSelect label="Produto do catálogo" options={options} defaultValue={options[0]} onValueChange={change} />);
 const campo = screen.getByRole("combobox", { name: "Produto do catálogo" });
 await user.clear(campo);
 await user.type(campo, "Suporte");
 expect(screen.getAllByRole("combobox")).toHaveLength(1);
 expect(screen.queryByRole("option", { name: /Licença/ })).not.toBeInTheDocument();
 await user.keyboard("{ArrowDown}{Enter}");
 expect(change.mock.calls.at(-1)?.[0]).toMatchObject({ value: "sup" });
 expect(campo).toHaveValue("Suporte premium");
});
it("busca no dropdown e seleciona uma opção com descrição pelo teclado",async()=>{
 const change=vi.fn();const user=userEvent.setup();
 render(<SearchSelect label="Responsável" searchPlacement="dropdown" onValueChange={change} options={[{value:"m",label:"Maria",description:"Atendimento",avatar:null},{value:"j",label:"João",description:"Vendas",avatar:null}]}/>);
 await user.click(screen.getByRole("combobox",{name:"Responsável"}));
 await user.type(await screen.findByRole("combobox",{name:"Buscar em Responsável"}),"Maria");
 expect(screen.queryByRole("option",{name:/João/})).not.toBeInTheDocument();
 await user.keyboard("{ArrowDown}{Enter}");
 expect(change.mock.calls.at(-1)?.[0]).toMatchObject({value:"m"});
});
