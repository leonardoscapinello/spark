import { describe, expect, it, vi } from "vitest";
import { refreshSparkAuthToken, setSparkAuthTokenRefreshProvider } from "./http-client.js";

describe("auth token refresh", () => {
  it("shares one renewal between concurrent callers", async () => {
    let release!: (token: string) => void;
    const refresh = vi.fn(() => new Promise<string>((resolve) => { release = resolve; }));
    setSparkAuthTokenRefreshProvider(refresh);

    const first = refreshSparkAuthToken();
    const second = refreshSparkAuthToken();
    expect(refresh).toHaveBeenCalledTimes(1);

    release("renewed-jwt");
    await expect(Promise.all([first, second])).resolves.toEqual(["renewed-jwt", "renewed-jwt"]);
  });
});
