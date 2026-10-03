import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { EmptyState, PageState } from "./EmptyState.js";

describe("estados vazios e de página", () => {
  it("anuncia o estado vazio pelo título e não tem violações de acessibilidade", async () => {
    const { container } = render(<EmptyState icon="file" title="Nenhum arquivo" description="Os arquivos enviados aparecem aqui." />);
    expect(screen.getByRole("region", { name: "Nenhum arquivo" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("tenta de novo no mesmo lugar e mostra a espera até a promessa terminar", async () => {
    let finish: () => void = () => undefined;
    const retry = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    render(<PageState kind="error" onRetry={retry} />);
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(await screen.findByRole("heading", { name: "Tentando de novo…" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Tentando de novo…" })).toBeInTheDocument();
    finish();
    expect(await screen.findByRole("heading", { name: "Algo deu errado" })).toBeInTheDocument();
  });

  it("sem conexão mostra o selo de cache; sem permissão não oferece tentar de novo", () => {
    const { rerender } = render(<PageState kind="offline" onRetry={() => undefined} />);
    expect(screen.getByText("Offline · cache")).toBeInTheDocument();
    rerender(<PageState kind="forbidden" onRetry={() => undefined} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
