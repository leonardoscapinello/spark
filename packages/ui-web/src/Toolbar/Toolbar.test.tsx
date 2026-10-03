import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Button } from "../Button/Button.js";
import { Toolbar, ToolbarSeparator, ToolbarText } from "./Toolbar.js";

describe("Toolbar", () => {
  it("é um grupo nomeado com os botões em ordem de tabulação", () => {
    render(<Toolbar label="Zoom do fluxo"><Button size="sm" variant="ghost">100%</Button><ToolbarSeparator /><ToolbarText>Pronto</ToolbarText></Toolbar>);
    expect(screen.getByRole("group", { name: "Zoom do fluxo" })).toContainElement(screen.getByRole("button", { name: "100%" }));
  });

  it("não tem violação de acessibilidade", async () => {
    const { container } = render(<Toolbar label="Etapas"><Button size="sm" variant="ghost">Adicionar etapa</Button></Toolbar>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
