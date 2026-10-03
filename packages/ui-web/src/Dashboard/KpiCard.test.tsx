import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { KpiCard } from "./KpiCard.js";

describe("KPI", () => {
  it("anuncia o valor formatado, a variação e não tem violações", async () => {
    const { container } = render(<KpiCard label="Receita" value="R$ 184.320" delta={{ label: "+12,4%", tone: "positive", direction: "up" }} trend={[1, 3, 2, 5]} />);
    expect(screen.getByRole("article", { name: "Receita" })).toHaveTextContent("R$ 184.320");
    expect(screen.getByText("+12,4%")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("vira o próprio link quando é clicável", () => {
    render(<KpiCard label="Negócios em aberto" value={12} render={<a href="/deals" />} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/deals");
    expect(screen.getByRole("link")).toHaveTextContent("Negócios em aberto");
  });

  it("não mostra valor antigo carregando ou com erro e permite tentar de novo", async () => {
    const retry = vi.fn();
    const { rerender } = render(<KpiCard label="Conversas" value="340" state="loading" />);
    expect(screen.getByRole("status", { name: "Carregando Conversas" })).toBeInTheDocument();
    expect(screen.queryByText("340")).not.toBeInTheDocument();
    rerender(<KpiCard label="Conversas" value="340" state="error" onRetry={retry} />);
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
