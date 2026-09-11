import { afterEach, describe, expect, it, vi } from "vitest";
import { orgId as orgIdFactory } from "@spark/core";

const mocks = vi.hoisted(() => ({
  apiTokenProvider: undefined as (() => string | null) | undefined,
  me: vi.fn(),
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("@spark/api-client", () => ({
  meControllerMe: mocks.me,
  setSparkApiBaseUrl: vi.fn(),
  setSparkAuthTokenProvider: (provider: () => string | null) => {
    mocks.apiTokenProvider = provider;
  },
}));

vi.mock("./supabase.client", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mocks.getSession,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  }),
}));

import { getSession, restoreSession, signIn, signOut } from "./auth.client";

describe("auth.client — Supabase Auth session", () => {
  afterEach(async () => {
    await signOut();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("authenticates with Supabase and resolves the provisioned local user", async () => {
    const orgId = orgIdFactory.create();
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: "real-jwt" } }, error: null });
    mocks.me.mockResolvedValue({ id: "local-user", orgId });

    await expect(signIn("person@company.com", "strong-password")).resolves.toEqual({
      orgId,
      userId: "local-user",
    });
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "person@company.com",
      password: "strong-password",
    });
    expect(mocks.apiTokenProvider?.()).toBe("real-jwt");
    expect(getSession()).toEqual({ orgId, userId: "local-user" });
  });

  it("does not create a session when Supabase has no authenticated user", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(restoreSession()).resolves.toBeNull();
    expect(getSession()).toBeNull();
  });
});
