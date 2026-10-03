import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { type Money } from "@spark/core";
import { MoneyInput, PercentInput } from "./MaskedInput.js";

it("digita 11% a partir de zero, edita no meio e aceita decimais sem zeros forçados", async () => {
  const change = vi.fn();
  function Campo() {
    const [valor, setValor] = useState<number | null>(0);
    return <PercentInput label="Desconto" value={valor} onValueChange={(next) => { setValor(next); change(next); }} />;
  }
  const user = userEvent.setup();
  render(<Campo />);
  const campo = screen.getByRole("textbox", { name: "Desconto" });
  await user.click(campo);
  await user.keyboard("11");
  expect(campo).toHaveValue("11");
  expect(change).toHaveBeenLastCalledWith(1100);
  await user.keyboard("{Home}{Delete}2");
  expect(campo).toHaveValue("21");
  expect(change).toHaveBeenLastCalledWith(2100);
  await user.clear(campo);
  expect(change).toHaveBeenLastCalledWith(null);
  await user.type(campo, "12,50");
  expect(campo).toHaveValue("12,50");
  expect(change).toHaveBeenLastCalledWith(1250);
  await user.tab();
  expect(change).toHaveBeenLastCalledWith(1250);
});

it("aceita colar decimais e mantém o limite de 100%", async () => {
  const change = vi.fn();
  function Campo() {
    const [valor, setValor] = useState<number | null>(null);
    return <PercentInput label="Imposto" value={valor} onValueChange={(next) => { setValor(next); change(next); }} />;
  }
  const user = userEvent.setup();
  render(<Campo />);
  const campo = screen.getByRole("textbox", { name: "Imposto" });
  await user.click(campo);
  await user.paste("11.25");
  expect(campo).toHaveValue("11,25");
  expect(change).toHaveBeenLastCalledWith(1125);
  await user.clear(campo);
  await user.type(campo, "100");
  await user.keyboard("1");
  expect(campo).toHaveValue("100");
  expect(change).toHaveBeenLastCalledWith(10000);
});
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

it("não exibe NaN quando recebe uma forma inválida durante a sincronização",()=>{
  function Campo(){
    const [valor,setValor]=useState<Money|null>({} as Money);
    return <MoneyInput label="Valor" value={valor} onValueChange={setValor} />;
  }
  render(<Campo />);
  const campo=screen.getByRole("textbox",{name:"Valor"});
  expect(campo).toHaveValue("");
  fireEvent.change(campo,{target:{value:"9"}});
  expect(campo).toHaveValue("R$ 0,09");
});
