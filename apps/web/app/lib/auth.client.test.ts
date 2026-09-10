import { afterEach, describe, expect, it } from "vitest";
import { orgId as orgIdFactory } from "@spark/core";
import { limparSessao, obterSessao, obterToken, salvarSessao } from "./auth.client";

describe("auth.client — sessão do dev-login em localStorage", () => {
  afterEach(() => {
    limparSessao();
  });

  it("salva e recupera a sessão completa", () => {
    const org = orgIdFactory.novo();
    salvarSessao({ token: "abc.def.ghi", orgId: org, userId: "user-1" });

    expect(obterSessao()).toEqual({ token: "abc.def.ghi", orgId: org, userId: "user-1" });
    expect(obterToken()).toBe("abc.def.ghi");
  });

  it("retorna null quando não há sessão salva", () => {
    expect(obterSessao()).toBeNull();
    expect(obterToken()).toBeNull();
  });

  it("limparSessao remove a sessão salva", () => {
    salvarSessao({ token: "x", orgId: orgIdFactory.novo(), userId: "u" });
    limparSessao();
    expect(obterSessao()).toBeNull();
  });
});
