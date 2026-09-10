import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Glass } from "./Glass.js";

describe("Glass", () => {
  it("renderiza os filhos", () => {
    render(<Glass>conteúdo</Glass>);
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  it("renderiza como div por padrão", () => {
    render(<Glass data-testid="g">x</Glass>);
    expect(screen.getByTestId("g").tagName).toBe("DIV");
  });

  it("aceita elemento customizado via `as`", () => {
    render(
      <Glass as="nav" data-testid="g">
        x
      </Glass>,
    );
    expect(screen.getByTestId("g").tagName).toBe("NAV");
  });

  it("mescla className customizada com a própria", () => {
    render(
      <Glass className="extra" data-testid="g">
        x
      </Glass>,
    );
    expect(screen.getByTestId("g").className).toContain("extra");
  });

  it("não tem violação de acessibilidade", async () => {
    const { container } = render(<Glass>conteúdo de navegação</Glass>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
