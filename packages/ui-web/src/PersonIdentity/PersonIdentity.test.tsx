import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { PersonIdentity } from "./PersonIdentity.js";

describe("identidade de pessoa", () => {
  it("mostra nome e detalhe, com o avatar fora da árvore acessível", async () => {
    const { container } = render(<PersonIdentity name="Ana Souza" detail="ana@aurora.com.br" />);
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("ana@aurora.com.br")).toBeInTheDocument();
    expect(container.querySelector("[aria-hidden='true']")).toHaveTextContent("AS");
    expect(await axe(container)).toHaveNoViolations();
  });
});
