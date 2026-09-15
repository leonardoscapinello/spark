import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Input } from "../Input/Input.js";
import { TooltipProvider } from "../Tooltip/Tooltip.js";
import { InlineField } from "./InlineField.js";

function Example() {
  const [value, setValue] = useState("Maria");
  return <TooltipProvider>
    <InlineField label="Nome" value={value}>{(close) => <Input aria-label="Nome" defaultValue={value} onBlur={(event) => { setValue(event.target.value); close(); }} />}</InlineField>
    <button type="button">Sair</button>
  </TooltipProvider>;
}

/**
 * A regra é uma só: **sair do campo grava**. Clicar fora, `Enter` e o botão de
 * fechar fazem a mesma coisa — tiram o foco, e é o `onBlur` do controle que
 * grava. Houve por um tempo um passo de confirmação aqui; ele segurava o
 * clique de fora para perguntar, o `onBlur` nunca disparava, e link, data e
 * dinheiro deixavam de gravar. Estes testes existem para isso não voltar.
 */
describe("InlineField", () => {
  it("clicar fora do campo grava o que foi digitado", () => {
    render(<Example />);
    fireEvent.click(screen.getByRole("button", { name: /Alterar Nome/ }));
    fireEvent.input(screen.getByRole("textbox", { name: "Nome" }), { target: { value: "Ana" } });
    fireEvent.pointerDown(screen.getByRole("button", { name: "Sair" }));
    expect(screen.getByRole("button", { name: /Alterar Nome.*Ana/ })).toBeInTheDocument();
  });

  it("Enter grava e fecha o campo", () => {
    render(<Example />);
    fireEvent.click(screen.getByRole("button", { name: /Alterar Nome/ }));
    const input = screen.getByRole("textbox", { name: "Nome" });
    fireEvent.input(input, { target: { value: "Ana" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("button", { name: /Alterar Nome.*Ana/ })).toBeInTheDocument();
  });

  it("clicar no campo e não digitar nada não muda o valor", () => {
    render(<Example />);
    fireEvent.click(screen.getByRole("button", { name: /Alterar Nome/ }));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Nome" }), { key: "Escape" });
    expect(screen.getByRole("button", { name: /Alterar Nome.*Maria/ })).toBeInTheDocument();
  });
});
