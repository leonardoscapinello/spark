// @vitest-environment node
import { describe, expect, it } from "vitest";
import { refreshQueuedAuthorization, retryQueuedResponse } from "./queued-request";
const token = (sub: string, iss = "https://auth.example", exp = 1) => `e30.${Buffer.from(JSON.stringify({ sub, iss, exp })).toString("base64url")}.signature`;
const request = (jwt: string) => new Request("https://api.example/v1/contacts", { method: "POST", headers: { Authorization: `Bearer ${jwt}` }, body: "original" });
describe("identidade de envios offline", () => {
  it("renova a mesma identidade e preserva corpo/método", async () => {
    const fresh = token("alice", undefined, 2);
    const refreshed = refreshQueuedAuthorization(request(token("alice")), fresh);
    expect(refreshed.headers.get("Authorization")).toBe(`Bearer ${fresh}`);
    expect(refreshed.method).toBe("POST");
    expect(await refreshed.text()).toBe("original");
  });
  it("não atribui um envio a outra pessoa ou outro emissor", () => {
    const original = token("alice");
    for (const fresh of [token("bob"), token("alice", "https://other.example"), "broken", null]) {
      expect(refreshQueuedAuthorization(request(original), fresh).headers.get("Authorization")).toBe(`Bearer ${original}`);
    }
  });
  it("preserva falhas temporárias, mas não repete rejeições definitivas", () => {
    for (const status of [401, 408, 429, 500, 502, 503]) expect(retryQueuedResponse(status)).toBe(true);
    for (const status of [200, 201, 400, 403, 404, 409, 422]) expect(retryQueuedResponse(status)).toBe(false);
  });
});
