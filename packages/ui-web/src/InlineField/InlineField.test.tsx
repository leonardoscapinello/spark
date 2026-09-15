import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
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

function PersistedExample({ save }: { save: () => Promise<void> }) {
  const [value, setValue] = useState("Maria");
  return <TooltipProvider>
    <InlineField label="Nome" value={value}>{(close) => <Input aria-label="Nome" defaultValue={value} onBlur={(event) => {
      setValue(event.target.value);
      close(save());
    }} />}</InlineField>
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

  it("mostra o estado da persistência real até o servidor confirmar", async () => {
    let confirm!: () => void;
    const save = vi.fn(() => new Promise<void>((resolve) => { confirm = resolve; }));
    render(<PersistedExample save={save} />);
    fireEvent.click(screen.getByRole("button", { name: /Alterar Nome/ }));
    const input = screen.getByRole("textbox", { name: "Nome" });
    fireEvent.input(input, { target: { value: "Ana" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("status", { name: "Salvando Nome" })).toBeInTheDocument();
    confirm();
    expect(await screen.findByRole("status", { name: "Nome salvo" })).toBeInTheDocument();
  });

  it("expõe falha em vez de confirmar um campo que não persistiu", async () => {
    const save = vi.fn(() => Promise.reject(new Error("offline")));
    render(<PersistedExample save={save} />);
    fireEvent.click(screen.getByRole("button", { name: /Alterar Nome/ }));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Nome" }), { key: "Enter" });
    expect(await screen.findByRole("status", { name: "Falha ao salvar Nome" })).toBeInTheDocument();
  });
});
