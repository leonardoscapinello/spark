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
});
