import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { expect, it } from "vitest";
import { type Money } from "@spark/core";
import { MoneyInput } from "./MaskedInput.js";
it("digita da direita para a esquerda, em centavos, e distingue campo apagado",()=>{
 // Dinheiro entra como no caixa: cada dígito ocupa o centavo e empurra o resto.
 // Digitar 9 e 0 tem de dar noventa centavos, não noventa reais.
 function Campo(){
  const [valor,setValor]=useState<Money|null>(null);
  return <MoneyInput label="Valor" value={valor} onValueChange={setValor} />;
 }
 render(<Campo />);
 const campo=screen.getByRole("textbox",{name:"Valor"});
 fireEvent.change(campo,{target:{value:"9"}});
 expect(campo).toHaveValue("R$ 0,09");
 fireEvent.change(campo,{target:{value:"R$ 0,090"}});
 expect(campo).toHaveValue("R$ 0,90");
 fireEvent.change(campo,{target:{value:"R$ 0,9010029"}});
 expect(campo).toHaveValue("R$ 90.100,29");
 fireEvent.change(campo,{target:{value:""}});
 expect(campo).toHaveValue("");
});
