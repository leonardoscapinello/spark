import { mergeConfig, defineConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

export default mergeConfig(
  sharedTestConfig,
  defineConfig({
    test: {
      setupFiles: ["../../apps/api/test/setup.ts"], // carrega o .env de apps/api — mesmo segredo, mesmo banco
      // sobe apps/api como processo real + espera o Electric replicar
      // entre duas coleções — mais lento que integração de um pacote só.
      testTimeout: 15_000,
    },
  }),
);
