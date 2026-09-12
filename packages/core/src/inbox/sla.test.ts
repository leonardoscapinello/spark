import { describe, expect, it } from "vitest";
import { conversationSlaState, firstResponseDueAt } from "./sla.js";
describe("inbox SLA", () => {
  it("aplica 15 minutos em conversa prioritária", () => expect(firstResponseDueAt("2026-09-11T12:00:00.000Z", "priority")).toBe("2026-09-11T12:15:00.000Z"));
  it("marca prazo próximo e violado", () => { expect(conversationSlaState("2026-09-11T12:09:00Z", null, new Date("2026-09-11T12:00:00Z"))).toBe("due_soon"); expect(conversationSlaState("2026-09-11T11:59:00Z", null, new Date("2026-09-11T12:00:00Z"))).toBe("breached"); });
});
