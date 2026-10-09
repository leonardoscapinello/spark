// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
const { registerRoute } = vi.hoisted(() => ({ registerRoute: vi.fn() }));
vi.mock("workbox-routing", () => ({ registerRoute }));
vi.mock("workbox-precaching", () => ({ cleanupOutdatedCaches: vi.fn(), precacheAndRoute: vi.fn() }));
vi.mock("workbox-background-sync", () => ({ Queue: class {} }));
afterEach(() => vi.unstubAllGlobals());
it("registra cada método de escrita, nunca GET, para a fila offline", async () => {
  vi.stubGlobal("self", { __WB_MANIFEST: [], skipWaiting: vi.fn(), addEventListener: vi.fn() });
  await import("./sw");
  expect(registerRoute.mock.calls.map(call => call[2])).toEqual(["POST", "PATCH", "PUT", "DELETE"]);
  const matchesPost = registerRoute.mock.calls[0]?.[0];
  const origin = new URL(import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").origin;
  const context = (path: string) => ({ request: new Request(`${origin}${path}`, { method: "POST" }), url: new URL(path, origin) });
  expect(matchesPost(context("/v1/conversations/conversation/typing"))).toBe(false);
  expect(matchesPost(context("/v1/conversations/conversation/typing/"))).toBe(false);
  expect(matchesPost(context("/v1/conversations/conversation/messages"))).toBe(true);
});
