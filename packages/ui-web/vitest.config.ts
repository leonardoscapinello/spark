import { mergeConfig, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { sharedTestConfig } from "../../vitest.shared.js";

export default mergeConfig(
  sharedTestConfig,
  defineConfig({
    plugins: [react()],
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test-setup.ts"],
      css: true,
      pool: "threads",
      maxWorkers: 1,
      testTimeout: 10000,
    },
  }),
);
