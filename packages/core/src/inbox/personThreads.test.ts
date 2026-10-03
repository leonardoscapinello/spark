import { describe, expect, it } from "vitest";
import type { Conversation } from "../schema/inbox.js";
import { personThreads } from "./personThreads.js";
function conversation(overrides: Partial<Conversation>): Conversation {
  return {
    id: "c1" as Conversation["id"], orgId: "org" as Conversation["orgId"], contactId: "contact" as Conversation["contactId"],
    channel: "whatsapp", connectionId: null, subject: "Assunto", status: "open", priority: "normal", assigneeId: null, teamId: null,
    snoozedUntil: null, firstResponseDueAt: "2026-09-01T00:00:00.000Z", firstRespondedAt: null, resolvedAt: null, lastInboundMessageAt: null,
    lastMessageAt: "2026-09-01T00:00:00.000Z", createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("personThreads", () => {
  it("reúne canais da mesma pessoa pela atividade mais recente sem alterar as rotas", () => {
    const older = conversation({ channel: "whatsapp" });
    const recent = conversation({ channel: "email", lastMessageAt: "2026-10-01T00:00:00.000Z" });
    expect(personThreads([recent, older])).toEqual([recent]);
    expect(personThreads([older, recent])).toEqual([recent]);
    expect(older.channel).toBe("whatsapp");
  });
  it("não reúne pessoas diferentes", () => {
    const first = conversation({});
    const second = conversation({ contactId: "another" as Conversation["contactId"] });
    expect(personThreads([first, second])).toEqual([first, second]);
    expect(personThreads([])).toEqual([]);
  });
});
