import { mergeConfig, defineConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

export default mergeConfig(
  sharedTestConfig,
  defineConfig({
    test: {
      // integração real com Postgres — mais lenta que teste puro de core.
      testTimeout: 10_000,
    },
  }),
);
