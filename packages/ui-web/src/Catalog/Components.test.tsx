import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordInput } from "../PasswordInput/PasswordInput.js";
import { Form } from "../Form/Form.js";
import { Field } from "../Field/Field.js";
import { Label } from "../Label/Label.js";
import { Button } from "../Button/Button.js";
import { Tabs } from "../Tabs/Tabs.js";
import { Accordion } from "../Accordion/Accordion.js";

describe("componentes compostos", () => {
  it("revela a senha sem perder valor, vínculo com label ou enviar formulário", async () => {
    const submit = vi.fn(e => e.preventDefault());
    render(<Form onSubmit={submit}><Field><Label>Senha</Label><PasswordInput defaultValue="exemplo" /></Field><Button type="submit">Salvar</Button></Form>);
    const input = screen.getByLabelText("Senha");
    expect(input).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("exemplo");
    expect(submit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(input).toHaveAttribute("type", "password");
  });
  it("navega abas por teclado sem ativar a desabilitada", async () => {
    render(<Tabs label="Contato" items={[{value:"a",label:"Detalhes",content:"Conteúdo A"},{value:"b",label:"Bloqueada",disabled:true,content:"Conteúdo B"},{value:"c",label:"Copiloto",content:"Conteúdo C"}]} />);
    screen.getByRole("tab", { name: "Detalhes" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Bloqueada" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Conteúdo A");
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Copiloto" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Conteúdo C");
  });
  it("abre e fecha seções independentes com teclado", async () => {
    render(<Accordion items={[{value:"a",title:"Dados",content:"Nome do contato"},{value:"b",title:"Notas",content:"Histórico"}]} />);
    const dados = screen.getByRole("button", { name: "Dados" });
    dados.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "Notas" }));
    expect(dados).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Histórico")).toBeVisible();
    await userEvent.click(dados);
    expect(dados).toHaveAttribute("aria-expanded", "false");
  });
});
