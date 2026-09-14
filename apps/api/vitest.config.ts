import { mergeConfig, defineConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

export default mergeConfig(
  sharedTestConfig,
  defineConfig({
    test: {
      setupFiles: process.env.TEST_DATABASE_URL ? ["./test/setup.ts"] : [],
      testTimeout: 10_000, // integração real com Postgres, mais lenta que unitário
    },
  }),
);
