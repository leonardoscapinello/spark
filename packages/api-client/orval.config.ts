import { defineConfig } from "orval";

/**
 * Gera cliente tipado + hooks TanStack Query a partir de
 * packages/contracts/openapi.json (docs/adr/0004). Nunca editar o output
 * à mão — src/generated é sempre reescrito por `pnpm gen`.
 */
export default defineConfig({
  spark: {
    input: "../contracts/openapi.json",
    output: {
      target: "src/generated.ts",
      client: "react-query",
      httpClient: "axios",
      mode: "single",
      clean: false, // nunca true — apaga a pasta inteira, incluindo http-client.ts (escrito à mão, mesma pasta)
      override: {
        mutator: {
          path: "./src/http-client.ts",
          name: "sparkHttpClient",
        },
      },
    },
  },
});
