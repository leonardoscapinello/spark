import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { toCents } from "@spark/core";
import { MoneyInput } from "./MaskedInput.js";
it("entrega centavos como Money e distingue campo apagado",()=>{
 const change=vi.fn();render(<MoneyInput label="Valor" value={null} onValueChange={change} />);
 fireEvent.change(screen.getByRole("textbox",{name:"Valor"}),{target:{value:"100,29"}});
 expect(toCents(change.mock.calls.at(-1)?.[0])).toBe(10029);
 fireEvent.change(screen.getByRole("textbox",{name:"Valor"}),{target:{value:""}});
 expect(change).toHaveBeenLastCalledWith(null);
});
