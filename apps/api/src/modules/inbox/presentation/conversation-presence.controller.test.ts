import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { conversationId, orgId, userId } from "@spark/core";
import type { FastifyReply } from "fastify";
import type { SupabaseJwtClaims } from "../../../auth/index.js";
import type { ResourcePresenceService } from "../../../common/resource-presence.service.js";
import type { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import type { InboxRepository } from "../infrastructure/inbox.repository.js";
import { ConversationPresenceController } from "./conversation-presence.controller.js";

const claims = { sub: "subject", exp: 2000000000 } as SupabaseJwtClaims;
function fixture(available: boolean) {
  const user = { id: userId.create(), orgId: orgId.create(), name: "Servidor", avatarUrl: null };
  const id = conversationId.create();
  const exists = vi.fn().mockResolvedValue(available);
  const publishTyping = vi.fn().mockResolvedValue(undefined);
  const join = vi.fn();
  const controller = new ConversationPresenceController(
    { execute: vi.fn().mockResolvedValue(user) } as unknown as GetCurrentUserUseCase,
    { exists } as unknown as InboxRepository,
    { publishTyping, join } as unknown as ResourcePresenceService,
  );
  return { controller, user, id, exists, publishTyping, join };
}

describe("conversation presence authorization", () => {
  it("denies both presence and typing when the conversation is outside the user's organization", async () => {
    const f = fixture(false);
    await expect(f.controller.watch(f.id, claims, {} as FastifyReply)).rejects.toThrow("Conversa não encontrada");
    await expect(f.controller.typing(f.id, claims)).rejects.toThrow("Conversa não encontrada");
    expect(f.exists).toHaveBeenCalledWith(f.user.orgId, f.id);
    expect(f.join).not.toHaveBeenCalled();
    expect(f.publishTyping).not.toHaveBeenCalled();
  });
  it("publishes only the identity resolved from the authenticated subject", async () => {
    const f = fixture(true);
    await f.controller.typing(f.id, claims);
    expect(f.publishTyping).toHaveBeenCalledWith(f.user.orgId, f.id, { userId: f.user.id, name: f.user.name, avatarUrl: null });
    expect(Reflect.getMetadata("requiredCapability", f.controller.typing)).toBe("inbox:write");
    expect(Reflect.getMetadata("requiredCapability", f.controller.watch)).toBe("inbox:read");
  });
});
