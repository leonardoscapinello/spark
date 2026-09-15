import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CustomFieldDefinition, CustomFieldType } from "@spark/core";
import { TooltipProvider } from "../Tooltip/Tooltip.js";
import { CustomFieldValue } from "./CustomFieldValue.js";

function field(type: CustomFieldType, label: string): CustomFieldDefinition {
  return { id: `field-${type}`, key: type, label, type, required: false, archivedAt: null } as unknown as CustomFieldDefinition;
}

describe("CustomFieldValue", () => {
  it("salva dinheiro como centavos e mantém a confirmação antes de a réplica chegar", async () => {
    const save = vi.fn(async () => undefined);
    const definition = field("currency", "Ticket");
    const { rerender } = render(<TooltipProvider><CustomFieldValue field={definition} value={null} onSave={save} /></TooltipProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Alterar Ticket/ }));
    const input = screen.getByRole("textbox", { name: "Ticket" });
    fireEvent.change(input, { target: { value: "12345" } });
    await act(async () => { fireEvent.blur(input); });
    expect(save).toHaveBeenCalledWith(12345);
    expect(screen.getByRole("button", { name: /Alterar Ticket.*123,45/ })).toBeInTheDocument();
    rerender(<TooltipProvider><CustomFieldValue field={definition} value={null} onSave={save} /></TooltipProvider>);
    expect(screen.getByRole("button", { name: /Alterar Ticket.*123,45/ })).toBeInTheDocument();
    rerender(<TooltipProvider><CustomFieldValue field={definition} value={20000} onSave={save} /></TooltipProvider>);
    expect(screen.getByRole("button", { name: /Alterar Ticket.*200,00/ })).toBeInTheDocument();
  });

  it("uma falha real restaura o valor confirmado e informa o erro", async () => {
    const onError = vi.fn();
    render(<TooltipProvider><CustomFieldValue field={field("currency", "Ticket")} value={10000} onSave={vi.fn(async () => { throw new Error("Sem conexão"); })} onError={onError} /></TooltipProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Alterar Ticket/ }));
    const input = screen.getByRole("textbox", { name: "Ticket" });
    fireEvent.change(input, { target: { value: "20000" } });
    await act(async () => { fireEvent.blur(input); });
    expect(onError).toHaveBeenCalledWith("Sem conexão");
    expect(screen.getByRole("button", { name: /Alterar Ticket.*100,00/ })).toBeInTheDocument();
  });

  it("mantém cada dígito digitado no campo monetário", () => {
    render(<TooltipProvider><CustomFieldValue field={field("currency", "Ticket")} value={null} onSave={vi.fn()} /></TooltipProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Alterar Ticket/ }));
    const input = screen.getByRole("textbox", { name: "Ticket" });

    fireEvent.change(input, { target: { value: "9" } });
    expect(input).toHaveValue("R$ 0,09");
    fireEvent.change(input, { target: { value: "R$ 0,090" } });
    expect(input).toHaveValue("R$ 0,90");
  });

  it("o botão cancelar restaura o valor anterior sem salvar", () => {
    const save = vi.fn();
    render(<TooltipProvider><CustomFieldValue field={field("text", "Cargo")} value="Diretora" onSave={save} /></TooltipProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Alterar Cargo/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Cargo" }), { target: { value: "Gerente" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar alteração em Cargo" }));

    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Alterar Cargo.*Diretora/ }));
    expect(screen.getByRole("textbox", { name: "Cargo" })).toHaveValue("Diretora");
  });

  it("Escape também descarta o rascunho sem salvar", () => {
    const save = vi.fn();
    render(<TooltipProvider><CustomFieldValue field={field("text", "Cargo")} value="Diretora" onSave={save} /></TooltipProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Alterar Cargo/ }));
    const input = screen.getByRole("textbox", { name: "Cargo" });
    fireEvent.change(input, { target: { value: "Gerente" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Alterar Cargo.*Diretora/ }));
    expect(screen.getByRole("textbox", { name: "Cargo" })).toHaveValue("Diretora");
  });
});
