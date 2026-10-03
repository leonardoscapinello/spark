import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { FLOW_NODE_SIZE, FlowCanvas, FlowEdge, FlowEdges, FlowNode, FlowPort, flowInputAnchor, flowOutputAnchor } from "./Flow.js";

describe("Flow", () => {
  it("mostra tipo, título e descrição da etapa", () => {
    render(<FlowCanvas label="Fluxo"><FlowNode position={{ x: 0, y: 0 }} kind="Gatilho" title="Pessoa cadastrada" description="Quando alguém entra" /></FlowCanvas>);
    expect(screen.getByRole("region", { name: "Fluxo" })).toBeInTheDocument();
    expect(screen.getByText("Gatilho")).toBeInTheDocument();
    expect(screen.getByText("Pessoa cadastrada")).toBeInTheDocument();
    expect(screen.getByText("Quando alguém entra")).toBeInTheDocument();
  });

  it("porta é um botão operável e anuncia o próprio nome", async () => {
    const onClick = vi.fn();
    render(<FlowNode position={{ x: 0, y: 0 }} kind="Ação" title="Etiquetar" outputs={<FlowPort side="out" hint="Próximo passo" aria-label="Conectar próxima etapa" onClick={onClick} />} />);
    const port = screen.getByRole("button", { name: "Conectar próxima etapa" });
    port.focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("ancora as saídas a ±24 do meio quando há dois ramos", () => {
    const origin = { x: 10, y: 20 };
    const middle = origin.y + FLOW_NODE_SIZE.height / 2;
    expect(flowOutputAnchor(origin).y).toBe(middle);
    expect(flowOutputAnchor(origin, 0, 2).y).toBe(middle - 24);
    expect(flowOutputAnchor(origin, 1, 2).y).toBe(middle + 24);
    expect(flowInputAnchor(origin)).toEqual({ x: 10, y: middle });
  });

  it("não tem violação de acessibilidade", async () => {
    const { container } = render(<FlowCanvas label="Fluxo">
      <FlowEdges><FlowEdge from={{ x: 0, y: 0 }} to={{ x: 100, y: 40 }} kind="conditional" /></FlowEdges>
      <FlowNode position={{ x: 0, y: 0 }} kind="Condição" title="Pontuação" selected branched tabIndex={0} aria-label="Condição: Pontuação" outputs={<><FlowPort side="out" label="Sim" aria-label="Conectar saída sim" /><FlowPort side="out" label="Não" aria-label="Conectar saída não" /></>} />
    </FlowCanvas>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
