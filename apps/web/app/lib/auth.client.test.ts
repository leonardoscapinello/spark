import { afterEach, describe, expect, it, vi } from "vitest";
import { orgId as orgIdFactory } from "@spark/core";

const mocks = vi.hoisted(() => ({
  leaveDocument: vi.fn(),
  apiTokenProvider: undefined as (() => string | null) | undefined,
  apiTokenRefresher: undefined as (() => Promise<string | null>) | undefined,
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

vi.mock("./session-boundary.client", () => ({ leaveSessionDocument: mocks.leaveDocument }));

vi.mock("@spark/api-client", () => ({
  meControllerMe: mocks.me,
  setSparkApiBaseUrl: vi.fn(),
  setSparkAuthTokenProvider: (provider: () => string | null) => {
    mocks.apiTokenProvider = provider;
  },
  setSparkAuthTokenRefreshProvider: (provider: () => Promise<string | null>) => {
    mocks.apiTokenRefresher = provider;
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
  it("discards the old token and document when the provider has signed out", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: "real-jwt", user: { id: "auth-user" } } }, error: null });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
    mocks.me.mockResolvedValue({ id: "local-user", orgId: orgIdFactory.create(), capabilities: [] });
    await signIn("person@company.com", "password");
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(mocks.apiTokenRefresher?.()).resolves.toBeNull();
    expect(getSession()).toBeNull();
    expect(mocks.leaveDocument).toHaveBeenCalledTimes(1);
  });

  it("does not restore another user's offline profile", async () => {
    localStorage.setItem("leonardo_app_profile", JSON.stringify({ orgId: orgIdFactory.create(), userId: "old-user", authUserId: "old-auth-user", capabilities: [] }));
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: "new-jwt", user: { id: "new-auth-user" } } }, error: null });
    mocks.me.mockRejectedValue(new Error("offline"));
    await expect(restoreSession()).resolves.toBeNull();
    expect(getSession()).toBeNull();
  });

  afterEach(async () => {
    await signOut();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("authenticates with Supabase and resolves the provisioned local user", async () => {
    const orgId = orgIdFactory.create();
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: "real-jwt", user: { id: "auth-user" } } }, error: null });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
    mocks.me.mockResolvedValue({ id: "local-user", orgId, capabilities: ["users:manage"] });

    await expect(signIn("person@company.com", "strong-password")).resolves.toEqual({
      orgId,
      userId: "local-user", authUserId: "auth-user",
      capabilities: ["users:manage"],
    });
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "person@company.com",
      password: "strong-password",
    });
    expect(mocks.apiTokenProvider?.()).toBe("real-jwt");
    expect(getSession()).toEqual({ orgId, userId: "local-user", authUserId: "auth-user", capabilities: ["users:manage"] });
  });

  it("does not create a session when Supabase has no authenticated user", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(restoreSession()).resolves.toBeNull();
    expect(getSession()).toBeNull();
  });

  it("reuses the active profile when navigating between app pages", async () => {
    const orgId = orgIdFactory.create();
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: "real-jwt", user: { id: "auth-user" } } }, error: null });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
    mocks.me.mockResolvedValue({ id: "local-user", orgId, capabilities: ["contacts:read"] });

    const profile = await signIn("person@company.com", "strong-password");
    await expect(restoreSession()).resolves.toEqual(profile);
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.me).toHaveBeenCalledTimes(1);
  });

  it("renews the token used by writes and synchronized collections", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: "renewed-jwt", user: { id: "auth-user" } } }, error: null });
    await expect(mocks.apiTokenRefresher?.()).resolves.toBe("renewed-jwt");
    expect(mocks.apiTokenProvider?.()).toBe("renewed-jwt");
  });

  it("shares session restoration between the layout and page loaders", async () => {
    const orgId = orgIdFactory.create();
    let releaseSession: ((value: { data: { session: { access_token: string; user: { id: string } } }; error: null }) => void) | undefined;
    mocks.getSession.mockImplementation(() => new Promise((resolve) => { releaseSession = resolve; }));
    mocks.me.mockResolvedValue({ id: "local-user", orgId, capabilities: ["contacts:read"] });

    const layout = restoreSession();
    const page = restoreSession();
    expect(layout).toBe(page);
    expect(mocks.getSession).toHaveBeenCalledTimes(1);

    releaseSession?.({ data: { session: { access_token: "real-jwt", user: { id: "auth-user" } } }, error: null });
    await expect(Promise.all([layout, page])).resolves.toEqual([
      { orgId, userId: "local-user", authUserId: "auth-user", capabilities: ["contacts:read"] },
      { orgId, userId: "local-user", authUserId: "auth-user", capabilities: ["contacts:read"] },
    ]);
    expect(mocks.me).toHaveBeenCalledTimes(1);
  });

  it("revokes other sessions without clearing the current device", async () => {
    const orgId = orgIdFactory.create();
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: "real-jwt", user: { id: "auth-user" } } }, error: null });
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
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: "real-jwt", user: { id: "auth-user" } } }, error: null });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
    mocks.me.mockResolvedValue({ id: "local-user", orgId, capabilities: [] });
    mocks.signOut.mockResolvedValue({ error: null });

    await signIn("person@company.com", "strong-password");
    await signOutEverywhere();

    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(getSession()).toBeNull();
  });

  it("keeps the session when the API is down and restores the cached profile", async () => {
    const orgId = orgIdFactory.create();
    localStorage.setItem("leonardo_app_profile", JSON.stringify({ orgId, userId: "local-user", authUserId: "auth-user", capabilities: ["contacts:read"] }));
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: "still-valid-jwt", user: { id: "auth-user" } } }, error: null });
    mocks.me.mockRejectedValue(new Error("connect ECONNREFUSED"));

    await expect(restoreSession()).resolves.toMatchObject({ orgId, userId: "local-user" });
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(getSession()).toMatchObject({ orgId });
  });

  it("drops the session only when the API rejects the account (401)", async () => {
    localStorage.setItem("leonardo_app_profile", JSON.stringify({ orgId: orgIdFactory.create(), userId: "local-user", authUserId: "auth-user", capabilities: [] }));
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: "revoked-jwt", user: { id: "auth-user" } } }, error: null });
    mocks.me.mockRejectedValue(Object.assign(new Error("Unauthorized"), { response: { status: 401 } }));

    await expect(restoreSession()).resolves.toBeNull();
    expect(mocks.signOut).toHaveBeenCalled();
    expect(getSession()).toBeNull();
  });

  it("reports the API as unavailable at sign-in instead of an unprovisioned account", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: "real-jwt", user: { id: "auth-user" } } }, error: null });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
    mocks.me.mockRejectedValue(new Error("connect ECONNREFUSED"));

    await expect(signIn("person@company.com", "strong-password")).rejects.toMatchObject({ code: "AUTH_UNAVAILABLE" });
  });
});
