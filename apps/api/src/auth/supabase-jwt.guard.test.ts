import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import type { ExecutionContext } from "@nestjs/common";
import { SupabaseJwtGuard } from "./supabase-jwt.guard.js";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), assurance: vi.fn() }));
vi.mock("jose", () => ({ createRemoteJWKSet: vi.fn(), jwtVerify: mocks.verify }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { mfa: { getAuthenticatorAssuranceLevel: mocks.assurance } } }) }));

function guard() {
  return new SupabaseJwtGuard(new ConfigService({ NODE_ENV: "production", SUPABASE_JWT_VERIFICATION: "jwks", SUPABASE_JWKS_URL: "https://auth.example.test/jwks", SUPABASE_AUTH_ISSUER: "https://auth.example.test", SUPABASE_URL: "https://auth.example.test", SUPABASE_SECRET_KEY: "test-key" }));
}
function context() {
  const request = { headers: { authorization: "Bearer test-token" } };
  return { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext;
}
const claims = { sub: "00000000-0000-4000-8000-000000000001", exp: 2000000000, iat: 1900000000, aal: "aal1" };
beforeEach(() => { vi.clearAllMocks(); mocks.verify.mockResolvedValue({ payload: claims }); });

describe("MFA enforced at API boundary", () => {
  it("rejects a signed password-only token when MFA is enrolled", async () => {
    mocks.assurance.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal2" }, error: null });
    await expect(guard().canActivate(context())).rejects.toThrow("Invalid or expired token");
    expect(mocks.assurance).toHaveBeenCalledWith("test-token");
  });
  it("allows accounts without an enrolled second factor", async () => {
    mocks.assurance.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
    await expect(guard().canActivate(context())).resolves.toBe(true);
  });
  it("does not call Auth remotely for a verified AAL2 token", async () => {
    mocks.verify.mockResolvedValue({ payload: { ...claims, aal: "aal2" } });
    await expect(guard().canActivate(context())).resolves.toBe(true);
    expect(mocks.assurance).not.toHaveBeenCalled();
  });
  it("fails closed when assurance cannot be checked", async () => {
    mocks.assurance.mockResolvedValue({ data: null, error: new Error("unavailable") });
    await expect(guard().canActivate(context())).rejects.toThrow();
  });
});
