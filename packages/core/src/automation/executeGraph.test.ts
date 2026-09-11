import { describe, expect, it } from "vitest";
import type { AutomationGraph, AutomationNode } from "../schema/automation.js";
import { automationWaitMilliseconds, evaluateAutomationCondition, firstAutomationNode, resolveAutomationTransition } from "./executeGraph.js";

const condition: AutomationNode = { id: "condition", type: "condition", position: { x: 0, y: 0 }, data: { label: "VIP", description: "", config: { field: "contact.score", operator: "greater_than", value: 80 } } };
const graph: AutomationGraph = { nodes: [{ id: "start", type: "trigger", position: { x: 0, y: 0 }, data: { label: "Manual", description: "", config: {} } }, condition], edges: [{ id: "a", source: "condition", target: "yes", label: "sim" }, { id: "b", source: "condition", target: "no", label: "não" }] };

describe("automation graph execution rules", () => {
  it("finds the initial trigger", () => expect(firstAutomationNode(graph)?.id).toBe("start"));
  it("evaluates nested conditions and chooses the labeled branch", () => {
    expect(evaluateAutomationCondition(condition.data.config, { contact: { score: 95 } })).toBe(true);
    expect(resolveAutomationTransition(graph, condition, { contact: { score: 95 } }).nextNodeIds).toEqual(["yes"]);
    expect(resolveAutomationTransition(graph, condition, { contact: { score: 20 } }).nextNodeIds).toEqual(["no"]);
  });
  it("normalizes durable wait units", () => expect(automationWaitMilliseconds({ amount: 2, unit: "hours" })).toBe(7_200_000));
});
