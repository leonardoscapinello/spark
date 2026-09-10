import { mergeConfig, defineConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

export default mergeConfig(
  sharedTestConfig,
  defineConfig({
    test: {
      setupFiles: ["../../apps/api/test/setup.ts"], // carrega o .env de apps/api — mesmo segredo, mesmo banco
      testTimeout: 10_000,
    },
  }),
);
