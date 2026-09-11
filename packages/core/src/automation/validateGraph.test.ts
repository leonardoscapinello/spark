import { describe, expect, it } from "vitest";
import type { AutomationGraph } from "../schema/automation.js";
import { validateAutomationGraph } from "./validateGraph.js";

const valid: AutomationGraph = {
  nodes: [
    { id: "trigger-1", type: "trigger", position: { x: 20, y: 40 }, data: { label: "Contato criado", description: "", config: {} } },
    { id: "action-1", type: "action", position: { x: 320, y: 40 }, data: { label: "Adicionar tag", description: "", config: {} } },
  ],
  edges: [{ id: "edge-1", source: "trigger-1", target: "action-1" }],
};

describe("validateAutomationGraph", () => {
  it("accepts a trigger connected to an action", () => expect(validateAutomationGraph(valid)).toEqual([]));
  it("rejects incomplete and disconnected flows", () => {
    expect(validateAutomationGraph({ nodes: [valid.nodes[1]!], edges: [] }).map((issue) => issue.code)).toContain("missing_trigger");
    expect(validateAutomationGraph({ ...valid, edges: [] }).map((issue) => issue.code)).toContain("unreachable_action");
  });
  it("rejects dangling and self-referencing edges", () => {
    const codes = validateAutomationGraph({ ...valid, edges: [{ id: "broken", source: "trigger-1", target: "trigger-1" }, { id: "lost", source: "missing", target: "action-1" }] }).map((issue) => issue.code);
    expect(codes).toContain("self_loop");
    expect(codes).toContain("invalid_edge");
  });
});
