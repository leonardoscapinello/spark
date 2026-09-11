import { afterEach, describe, expect, it } from "vitest";
import { orgId as orgIdFactory } from "@spark/core";
import { clearSession, getSession, getToken, saveSession } from "./auth.client";

describe("auth.client — dev-login session in localStorage", () => {
  afterEach(() => {
    clearSession();
  });

  it("saves and retrieves the full session", () => {
    const org = orgIdFactory.create();
    saveSession({ token: "abc.def.ghi", orgId: org, userId: "user-1" });

    expect(getSession()).toEqual({ token: "abc.def.ghi", orgId: org, userId: "user-1" });
    expect(getToken()).toBe("abc.def.ghi");
  });

  it("returns null when there's no saved session", () => {
    expect(getSession()).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("clearSession removes the saved session", () => {
    saveSession({ token: "x", orgId: orgIdFactory.create(), userId: "u" });
    clearSession();
    expect(getSession()).toBeNull();
  });
});
