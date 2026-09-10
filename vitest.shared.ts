// Base compartilhada de Vitest — todo pacote com teste estende isto.
// Existe porque o Vitest v5 mudou o default: só exclui node_modules e .git,
// não mais dist/. Sem isto, o `tsc` do build (rodado pelo Turbo como
// dependsOn: ["^build"] de outro pacote) deixa .test.js compilado em dist/,
// e o Vitest roda os testes em dobro — um vindo de src/, outro de dist/,
// silenciosamente, sem avisar que são a mesma coisa duas vezes.
import { defineConfig } from "vitest/config";

export const sharedTestConfig = defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/.turbo/**"],
  },
});
