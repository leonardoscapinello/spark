import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { SidePanel } from "./SidePanel.js";

describe("SidePanel", () => {
  it("nomeia o painel pelo título e fecha pelo botão", async () => {
    const onClose = vi.fn();
    render(<SidePanel open title="Adicionar etapa" onClose={onClose}><p>Corpo</p></SidePanel>);
    expect(screen.getByRole("complementary", { name: "Adicionar etapa" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Fechar painel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("ao fechar, mantém o último conteúdo até a saída terminar e então sai", async () => {
    const { rerender } = render(<SidePanel open title="Configurar etapa"><p>Campos da etapa</p></SidePanel>);
    rerender(<SidePanel open={false} title="Outro título">{null}</SidePanel>);
    expect(screen.getByRole("complementary", { name: "Configurar etapa" })).toHaveAttribute("data-closing");
    expect(screen.getByText("Campos da etapa")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("complementary")).not.toBeInTheDocument());
  });

  it("não tem violação de acessibilidade", async () => {
    const { container } = render(<SidePanel open title="Execuções" eyebrow="Histórico" description="Nenhuma ainda." onClose={() => undefined}><p>Corpo</p></SidePanel>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
