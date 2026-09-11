import type { AutomationEdge, AutomationGraph, AutomationNode } from "../schema/automation.js";

export interface AutomationTransition {
  nextNodeIds: string[];
  result: Record<string, unknown>;
}

export function firstAutomationNode(graph: AutomationGraph): AutomationNode | null {
  const incoming = new Set(graph.edges.map((edge) => edge.target));
  return graph.nodes.find((node) => node.type === "trigger" && !incoming.has(node.id)) ?? graph.nodes.find((node) => node.type === "trigger") ?? null;
}

export function resolveAutomationTransition(graph: AutomationGraph, node: AutomationNode, context: Record<string, unknown>): AutomationTransition {
  const outgoing = graph.edges.filter((edge) => edge.source === node.id);
  if (node.type !== "condition") return { nextNodeIds: outgoing.map((edge) => edge.target), result: {} };
  const matched = evaluateAutomationCondition(node.data.config, context);
  const selected = outgoing.filter((edge) => edgeMatchesCondition(edge, matched));
  return { nextNodeIds: selected.map((edge) => edge.target), result: { matched } };
}

export function evaluateAutomationCondition(config: Record<string, unknown>, context: Record<string, unknown>): boolean {
  const field = typeof config.field === "string" ? config.field : "";
  const operator = typeof config.operator === "string" ? config.operator : "equals";
  const expected = config.value;
  const actual = readPath(context, field);
  if (operator === "exists") return actual !== undefined && actual !== null && actual !== "";
  if (operator === "not_equals") return actual !== expected;
  if (operator === "contains") return Array.isArray(actual) ? actual.includes(expected) : String(actual ?? "").toLocaleLowerCase().includes(String(expected ?? "").toLocaleLowerCase());
  if (operator === "greater_than") return Number(actual) > Number(expected);
  if (operator === "less_than") return Number(actual) < Number(expected);
  return actual === expected;
}

export function automationWaitMilliseconds(config: Record<string, unknown>): number {
  const amount = typeof config.amount === "number" && Number.isFinite(config.amount) ? Math.max(0, config.amount) : 0;
  const unit = config.unit;
  const multiplier = unit === "days" ? 86_400_000 : unit === "hours" ? 3_600_000 : unit === "minutes" ? 60_000 : 1_000;
  return Math.round(amount * multiplier);
}

function edgeMatchesCondition(edge: AutomationEdge, matched: boolean): boolean {
  const label = edge.label?.trim().toLocaleLowerCase();
  if (!label) return true;
  return matched ? ["sim", "true", "verdadeiro"].includes(label) : ["não", "nao", "false", "falso"].includes(label);
}
function readPath(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").filter(Boolean).reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, source);
}
