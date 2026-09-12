import { afterEach, describe, expect, it, vi } from "vitest";
import { orgId as orgIdFactory } from "@spark/core";

const mocks = vi.hoisted(() => ({
  apiTokenProvider: undefined as (() => string | null) | undefined,
  me: vi.fn(),
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  listFactors: vi.fn(),
  challengeAndVerify: vi.fn(),
  enroll: vi.fn(),
  unenroll: vi.fn(),
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
      mfa: {
        getAuthenticatorAssuranceLevel: mocks.getAuthenticatorAssuranceLevel,
        listFactors: mocks.listFactors,
        challengeAndVerify: mocks.challengeAndVerify,
        enroll: mocks.enroll,
        unenroll: mocks.unenroll,
      },
    },
  }),
}));

import { getSession, restoreSession, signIn, signOut, signOutEverywhere, signOutOtherSessions } from "./auth.client";

describe("auth.client — Supabase Auth session", () => {
  afterEach(async () => {
    await signOut();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("authenticates with Supabase and resolves the provisioned local user", async () => {
    const orgId = orgIdFactory.create();
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: "real-jwt" } }, error: null });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
    mocks.me.mockResolvedValue({ id: "local-user", orgId, capabilities: ["users:manage"] });

    await expect(signIn("person@company.com", "strong-password")).resolves.toEqual({
      orgId,
      userId: "local-user",
      capabilities: ["users:manage"],
    });
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "person@company.com",
      password: "strong-password",
    });
    expect(mocks.apiTokenProvider?.()).toBe("real-jwt");
    expect(getSession()).toEqual({ orgId, userId: "local-user", capabilities: ["users:manage"] });
  });

  it("does not create a session when Supabase has no authenticated user", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(restoreSession()).resolves.toBeNull();
    expect(getSession()).toBeNull();
  });

  it("reuses the active profile when navigating between app pages", async () => {
    const orgId = orgIdFactory.create();
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: "real-jwt" } }, error: null });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
    mocks.me.mockResolvedValue({ id: "local-user", orgId, capabilities: ["contacts:read"] });

    const profile = await signIn("person@company.com", "strong-password");
    await expect(restoreSession()).resolves.toEqual(profile);
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.me).toHaveBeenCalledTimes(1);
  });

  it("revokes other sessions without clearing the current device", async () => {
    const orgId = orgIdFactory.create();
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: "real-jwt" } }, error: null });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
    mocks.me.mockResolvedValue({ id: "local-user", orgId, capabilities: [] });
    mocks.signOut.mockResolvedValue({ error: null });

    await signIn("person@company.com", "strong-password");
    await signOutOtherSessions();

    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "others" });
    expect(getSession()).not.toBeNull();
  });

  it("clears the local session when every device is signed out", async () => {
    const orgId = orgIdFactory.create();
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: "real-jwt" } }, error: null });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
    mocks.me.mockResolvedValue({ id: "local-user", orgId, capabilities: [] });
    mocks.signOut.mockResolvedValue({ error: null });

    await signIn("person@company.com", "strong-password");
    await signOutEverywhere();

    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(getSession()).toBeNull();
  });
});
