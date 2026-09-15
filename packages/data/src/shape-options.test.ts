import { FetchError } from "@electric-sql/client";
import { setSparkAuthTokenRefreshProvider } from "@spark/api-client";
import { describe, expect, it, vi } from "vitest";
import { sparkShapeOptions } from "./shape-options.js";

describe("sparkShapeOptions", () => {
  it("renews authorization and retries a stream that received 401", async () => {
    const refresh = vi.fn(async () => "renewed-jwt");
    setSparkAuthTokenRefreshProvider(refresh);
    const error = new FetchError(401, "expired", undefined, {}, "https://api.example.test/v1/shapes/deals");

    await expect(sparkShapeOptions("deals").onError(error)).resolves.toEqual({
      headers: { authorization: "Bearer renewed-jwt" },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
