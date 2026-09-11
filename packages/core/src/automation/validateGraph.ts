import type { AutomationGraph } from "../schema/automation.js";

export interface AutomationGraphIssue {
  code: "missing_trigger" | "missing_action" | "duplicate_node" | "duplicate_edge" | "invalid_edge" | "self_loop" | "unreachable_action";
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export function validateAutomationGraph(graph: AutomationGraph): AutomationGraphIssue[] {
  const issues: AutomationGraphIssue[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const triggers = graph.nodes.filter((node) => node.type === "trigger");
  const actions = graph.nodes.filter((node) => node.type === "action");
  if (!triggers.length) issues.push({ code: "missing_trigger", message: "Adicione pelo menos um gatilho." });
  if (!actions.length) issues.push({ code: "missing_action", message: "Adicione pelo menos uma ação." });
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) issues.push({ code: "duplicate_node", nodeId: node.id, message: `O nó ${node.id} está duplicado.` });
    nodeIds.add(node.id);
  }
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) issues.push({ code: "duplicate_edge", edgeId: edge.id, message: `A conexão ${edge.id} está duplicada.` });
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) issues.push({ code: "invalid_edge", edgeId: edge.id, message: "A conexão aponta para um nó inexistente." });
    if (edge.source === edge.target) issues.push({ code: "self_loop", edgeId: edge.id, message: "Um nó não pode conectar a si mesmo." });
  }
  if (triggers.length && actions.length) {
    const outgoing = new Map<string, string[]>();
    for (const edge of graph.edges) outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
    const reached = new Set<string>();
    const queue = triggers.map((node) => node.id);
    while (queue.length) {
      const current = queue.shift();
      if (!current || reached.has(current)) continue;
      reached.add(current);
      queue.push(...(outgoing.get(current) ?? []));
    }
    if (!actions.some((node) => reached.has(node.id))) issues.push({ code: "unreachable_action", message: "Conecte um gatilho a pelo menos uma ação." });
  }
  return issues;
}
