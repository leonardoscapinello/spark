import { mergeConfig, defineConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

export default mergeConfig(
  sharedTestConfig,
  defineConfig({
    test: {
      // jsdom, não node — auth.client.ts usa localStorage de verdade.
      environment: "jsdom",
      pool: "threads",
      maxWorkers: 1,
    },
  }),
);
