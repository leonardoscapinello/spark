import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColorPicker } from "./ColorPicker.js";

describe("entrada de cor hexadecimal", () => {
  it.each(["2d2d2d", "#2d2d2d", "  #2D2d2D  "])("aceita %s e entrega um único prefixo", async (text) => {
    const change = vi.fn();
    render(<ColorPicker label="Cor" value="red" onValueChange={change} />);
    const input = screen.getByRole("textbox", { name: "Cor hexadecimal" });
    await userEvent.click(input);
    await userEvent.paste(text);
    await userEvent.tab();
    expect(input).toHaveValue("#2D2D2D");
    expect(change).toHaveBeenLastCalledWith("#2D2D2D");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("aguarda a digitação e completa o prefixo ao receber seis dígitos", async () => {
    const change = vi.fn();
    render(<ColorPicker label="Cor" value="red" onValueChange={change} />);
    const input = screen.getByRole("textbox", { name: "Cor hexadecimal" });
    await userEvent.type(input, "2d2");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(change).not.toHaveBeenCalled();
    await userEvent.type(input, "d2d");
    expect(input).toHaveValue("#2D2D2D");
    expect(change).toHaveBeenLastCalledWith("#2D2D2D");
  });
  it("recusa caracteres inválidos e permite corrigir sem o prefixo", async () => {
    const change = vi.fn();
    render(<ColorPicker label="Cor" value="red" onValueChange={change} />);
    const input = screen.getByRole("textbox", { name: "Cor hexadecimal" });
    await userEvent.type(input, "zzzzzz");
    await userEvent.tab();
    expect(screen.getByRole("alert")).toBeVisible();
    expect(change).not.toHaveBeenCalled();
    await userEvent.clear(input);
    await userEvent.type(input, "ABCDEF");
    expect(change).toHaveBeenLastCalledWith("#ABCDEF");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
