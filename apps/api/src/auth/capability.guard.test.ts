import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import type { Capability } from "@spark/core";
import { CapabilityGuard } from "./capability.guard.js";
import { RequireResourceAccess } from "./require-capability.decorator.js";
import type { GetCurrentUserUseCase } from "../modules/identity/application/get-current-user.usecase.js";
import type { PermissionGroupsRepository } from "../modules/identity/infrastructure/permission-groups.repository.js";

@RequireResourceAccess("link_previews")
class ProtectedResource { resolve() {} }
class UndeclaredResource { resolve() {} }

function authorize(capabilities: Capability[], target = ProtectedResource) {
  const currentUser = { execute: vi.fn().mockResolvedValue({ id: "user" }) } as unknown as GetCurrentUserUseCase;
  const groups = { getUserCapabilities: vi.fn().mockResolvedValue([{ capabilities }]) } as unknown as PermissionGroupsRepository;
  const context = {
    getClass: () => target,
    getHandler: () => target.prototype.resolve,
    switchToHttp: () => ({ getRequest: () => ({ supabaseUser: { sub: "subject" } }) }),
  } as unknown as ExecutionContext;
  return new CapabilityGuard(new Reflector(), currentUser, groups).canActivate(context);
}

describe("resource authorization shared with sync", () => {
  it("allows a directory reader without requiring an unrelated capability", async () => {
    await expect(authorize(["inbox:read"])).resolves.toBe(true);
  });
  it("rejects an authenticated account without directory access", async () => {
    await expect(authorize([])).rejects.toThrow("Missing access");
  });
  it("keeps undeclared endpoints denied by default", async () => {
    await expect(authorize(["inbox:read"], UndeclaredResource)).rejects.toThrow("no declared capability");
  });
});
