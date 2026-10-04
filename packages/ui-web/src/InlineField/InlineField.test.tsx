import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Input } from "../Input/Input.js";
import { Textarea } from "../Textarea/Textarea.js";
import { Select } from "../Select/Select.js";
import { DatePicker } from "../DateTimePicker/DateTimePicker.js";
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
  it("clicar no rótulo abre e foca o editor, sem exigir aria-label na tela", async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    render(<TooltipProvider><InlineField label="Nome" value="Maria">{() => <Input defaultValue="Maria" onBlur={save} />}</InlineField></TooltipProvider>);
    await user.click(screen.getByText("Nome", { selector: "label" }));
    const input = screen.getByRole("textbox", { name: "Nome" });
    expect(input).toHaveFocus();
    await user.type(input, " Silva");
    await user.click(screen.getByText("Nome", { selector: "label" }));
    expect(input).toHaveFocus();
    expect(input).toHaveValue("Maria Silva");
    expect(save).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: /Alterar Nome/ })).toHaveFocus();
  });

  it("o rótulo da área de texto abre o campo vazio e preserva Enter como nova linha", async () => {
    const user = userEvent.setup();
    render(<TooltipProvider><InlineField label="Observações" value="" empty multiline>{() => <Textarea />}</InlineField></TooltipProvider>);
    await user.click(screen.getByText("Observações", { selector: "label" }));
    const input = screen.getByRole("textbox", { name: "Observações" });
    expect(input).toHaveFocus();
    await user.type(input, "Primeira{Enter}Segunda");
    expect(input).toHaveValue("Primeira\nSegunda");
  });

  it("o rótulo abre também o seletor e o calendário", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<TooltipProvider><InlineField label="Etapa" value="Novo">{() => <Select label="Etapa" options={[{ value: "new", label: "Novo" }]} />}</InlineField></TooltipProvider>);
    await user.click(screen.getByText("Etapa", { selector: "label" }));
    expect(screen.getByRole("option", { name: "Novo" })).toBeVisible();
    unmount();
    render(<TooltipProvider><InlineField label="Previsão" value="">{() => <DatePicker label="Previsão" value="" onValueChange={vi.fn()} />}</InlineField></TooltipProvider>);
    await user.click(screen.getByText("Previsão", { selector: "label" }));
    expect(screen.getByRole("dialog", { name: "Previsão" })).toBeVisible();
  });

  it("a dica da regra não abre a edição e rótulos desabilitados não editam", async () => {
    const user = userEvent.setup();
    render(<TooltipProvider>
      <InlineField label="Nome" value="Maria" requirement="required">{() => <Input />}</InlineField>
      <InlineField label="Origem" value="Site" disabled>{() => <Input />}</InlineField>
    </TooltipProvider>);
    await user.click(screen.getByRole("button", { name: "Campo obrigatório" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Campo obrigatório");
    await user.click(screen.getByText("Origem", { selector: "span" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("usa a ação do registro quando o valor não tem editor", () => {
    const openProducts = vi.fn();
    render(<TooltipProvider><InlineField label="Produtos" value="5 produtos" action={{ label: "Ver itens e valores", icon: "right", onClick: openProducts }} /></TooltipProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Ver itens e valores" }));
    expect(openProducts).toHaveBeenCalledOnce();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("não executa a ação de um campo desabilitado", () => {
    render(<TooltipProvider><InlineField label="Produtos" value="5 produtos" disabled action={{ label: "Ver itens e valores", icon: "right", onClick: vi.fn() }} /></TooltipProvider>);
    expect(screen.queryByRole("button", { name: "Ver itens e valores" })).not.toBeInTheDocument();
  });

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
