import { describe, expect, it } from "vitest";
import { buildInboxDashboard } from "./inboxDashboard.js";
import type { Conversation } from "../schema/inbox.js";

function conversation(overrides: Partial<Conversation>): Conversation {
  return {
    id: "c1" as Conversation["id"], orgId: "org" as Conversation["orgId"], contactId: "contact" as Conversation["contactId"],
    channel: "whatsapp", subject: "Assunto", status: "open", priority: "normal", assigneeId: null, teamId: null,
    snoozedUntil: null, firstResponseDueAt: "2026-09-01T00:00:00.000Z", firstRespondedAt: null, resolvedAt: null,
    lastMessageAt: "2026-09-01T00:00:00.000Z", createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildInboxDashboard", () => {
  const now = new Date("2026-09-10T00:00:00.000Z");

  it("counts open and unassigned conversations regardless of period", () => {
    const snapshot = buildInboxDashboard({
      conversations: [conversation({ status: "open", assigneeId: null }), conversation({ status: "open", assigneeId: "u1" as Conversation["assigneeId"] }), conversation({ status: "closed" })],
      now, periodDays: 7,
    });
    expect(snapshot.openConversations).toBe(2);
    expect(snapshot.unassignedConversations).toBe(1);
  });

  it("averages first response and resolution time only over conversations that reached each milestone", () => {
    const snapshot = buildInboxDashboard({
      conversations: [
        conversation({ createdAt: "2026-09-05T10:00:00.000Z", firstRespondedAt: "2026-09-05T10:30:00.000Z", resolvedAt: "2026-09-05T12:00:00.000Z" }),
        conversation({ createdAt: "2026-09-06T10:00:00.000Z", firstRespondedAt: "2026-09-06T10:10:00.000Z", resolvedAt: null }),
        conversation({ createdAt: "2026-09-07T10:00:00.000Z", firstRespondedAt: null, resolvedAt: null }),
      ],
      now, periodDays: 7,
    });
    expect(snapshot.averageFirstResponseMinutes).toBe(20); // (30 + 10) / 2
    expect(snapshot.averageResolutionMinutes).toBe(120);
    expect(snapshot.resolvedInPeriod).toBe(1);
  });

  it("excludes resolutions outside the selected period", () => {
    const snapshot = buildInboxDashboard({
      conversations: [conversation({ createdAt: "2026-08-01T00:00:00.000Z", resolvedAt: "2026-08-01T01:00:00.000Z" })],
      now, periodDays: 7,
    });
    expect(snapshot.resolvedInPeriod).toBe(0);
    expect(snapshot.averageResolutionMinutes).toBeNull();
  });

  it("returns null averages when nothing reached the milestone", () => {
    const snapshot = buildInboxDashboard({ conversations: [conversation({})], now, periodDays: 7 });
    expect(snapshot.averageFirstResponseMinutes).toBeNull();
    expect(snapshot.averageResolutionMinutes).toBeNull();
  });
});
