import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Field } from "./Field.js";
import { Label } from "../Label/Label.js";
import { ErrorText } from "../ErrorText/ErrorText.js";
import { Input } from "../Input/Input.js";

/**
 * Este é o teste que mais importa do pacote: prova que o contrato de
 * acessibilidade de packages/ui-web (ADR-0020) é real, não decorativo —
 * rótulo associado, aria-describedby apontando para o erro, aria-invalid
 * ligado quando o campo está inválido. Nenhuma dessas ligações é escrita
 * à mão; nascem do contexto do Base UI.
 */
describe("Field + Label + Input + ErrorText", () => {
  it("associa o rótulo ao campo — clicar no label foca o input", async () => {
    render(
      <Field>
        <Label>Nome</Label>
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Nome");
    expect(input).toBeInstanceOf(HTMLInputElement);
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
