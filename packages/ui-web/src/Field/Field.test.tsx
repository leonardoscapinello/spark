import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Field } from "./Field.js";
import { Label } from "../Label/Label.js";
import { ErrorText } from "../ErrorText/ErrorText.js";
import { Input } from "../Input/Input.js";
import { Textarea } from "../Textarea/Textarea.js";
import { Select } from "../Select/Select.js";
import { SearchSelect } from "../SearchSelect/SearchSelect.js";
import { RecordSelect } from "../RecordSelect/RecordSelect.js";
import { PercentInput } from "../MaskedInput/MaskedInput.js";
import { DatePicker } from "../DateTimePicker/DateTimePicker.js";

/**
 * Este é o teste que mais importa do pacote: prova que o contrato de
 * acessibilidade de packages/ui-web (ADR-0020) é real, não decorativo —
 * rótulo associado, aria-describedby apontando para o erro, aria-invalid
 * ligado quando o campo está inválido. Nenhuma dessas ligações é escrita
 * à mão; nascem do contexto do Base UI.
 */
describe("Field + Label + Input + ErrorText", () => {
  it("associa o rótulo ao campo — clicar no label foca o input", async () => {
    const user = userEvent.setup();
    render(
      <Field>
        <Label>Nome</Label>
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Nome");
    expect(input).toBeInstanceOf(HTMLInputElement);
    await user.click(screen.getByText("Nome", { selector: "label" }));
    expect(input).toHaveFocus();
  });

  it.each([
    ["área de texto", <Textarea />, "textbox"],
    ["percentual", <PercentInput label="Campo" value={0} onValueChange={() => {}} />, "textbox"],
    ["busca", <SearchSelect label="Campo" options={[]} />, "combobox"],
    ["registro", <RecordSelect label="Campo" options={[]} value={null} onValueChange={() => {}} />, "combobox"],
  ] as const)("rótulo de %s foca o controle compartilhado", async (_name, control, role) => {
    const user = userEvent.setup();
    render(<Field><Label>Campo</Label>{control}</Field>);
    await user.click(screen.getByText("Campo", { selector: "label" }));
    expect(screen.getByRole(role, { name: "Campo" })).toHaveFocus();
  });

  it("rótulo de seleção abre as opções e Escape devolve o foco ao controle", async () => {
    const user = userEvent.setup();
    render(<Field><Label>Etapa</Label><Select label="Etapa" options={[{ value: "new", label: "Novo" }]} /></Field>);
    await user.click(screen.getByText("Etapa", { selector: "label" }));
    expect(screen.getByRole("combobox", { name: "Etapa" })).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(screen.getByRole("option", { name: "Novo" })).toBeVisible());
    await user.keyboard("{Escape}");
    expect(screen.getByRole("combobox", { name: "Etapa" })).toHaveFocus();
  });

  it("rótulo de data aciona o calendário e o controle desabilitado não abre", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Field><Label>Previsão</Label><DatePicker label="Previsão" value="" onValueChange={() => {}} /></Field>);
    await user.click(screen.getByText("Previsão", { selector: "label" }));
    expect(screen.getByRole("dialog", { name: "Previsão" })).toBeVisible();
    await user.keyboard("{Escape}");
    rerender(<Field disabled><Label>Previsão</Label><DatePicker label="Previsão" value="" onValueChange={() => {}} /></Field>);
    await user.click(screen.getByText("Previsão", { selector: "label" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("conecta aria-describedby ao texto de erro quando o campo está inválido", () => {
    render(
      <Field invalid>
        <Label>E-mail</Label>
        <Input />
        <ErrorText>E-mail inválido</ErrorText>
      </Field>,
    );
    const input = screen.getByLabelText("E-mail");
    const erro = screen.getByText("E-mail inválido");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(erro.id);
  });

  it("não marca aria-invalid quando o campo é válido", () => {
    render(
      <Field>
        <Label>E-mail</Label>
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("E-mail")).not.toHaveAttribute("aria-invalid", "true");
  });

  it("o conjunto completo não tem violação de acessibilidade", async () => {
    const { container } = render(
      <Field invalid>
        <Label>E-mail</Label>
        <Input />
        <ErrorText>E-mail inválido</ErrorText>
      </Field>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
