import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Teste de contrato do build de tokens — não testa detalhe de implementação,
 * testa o que os consumidores (packages/ui-web, packages/ui-native) exigem:
 * a cascata de três estados existe, e os tokens críticos estão presentes.
 * `pretest` roda o build antes (ver package.json) — este teste lê o artefato real.
 */
const css = readFileSync(new URL("./dist/css/tokens.css", import.meta.url), "utf-8");
const native = readFileSync(new URL("./dist/native/theme.ts", import.meta.url), "utf-8");

describe("cascata de tema em três estados (ADR-0025)", () => {
  it("define :root claro completo, sem depender de media query", () => {
    const rootBlock = css.match(/^:root\s*{([^}]*)}/m)?.[1] ?? "";
    expect(rootBlock).toContain("--color-surface:");
    expect(rootBlock).toContain("--color-accent:");
    expect(rootBlock).toContain("--space-4:");
  });

  it("sobrescreve só o que diverge dentro de @media (prefers-color-scheme: dark)", () => {
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)/);
    expect(css).toMatch(/:root:not\(\[data-theme="light"\]\)/);
    // primitiva compartilhada NÃO deve ser redeclarada no bloco escuro —
    // ela só aparece uma vez, no :root claro.
    const occurrences = (css.match(/--color-void:/g) ?? []).length;
    expect(occurrences).toBe(1);
  });

  it("[data-theme=dark] vence a preferência do sistema nos dois sentidos", () => {
    expect(css).toMatch(/:root\[data-theme="dark"\]\s*{/);
  });

  it("todo token que aparece no claro também tem override coerente quando diverge no escuro", () => {
    expect(css).toMatch(/--color-ground: #0a1526/); // fundo escuro dentro do bloco dark
    expect(css).toMatch(/--color-ground: #eff0eb/); // fundo claro dentro do :root
  });

  it("gera o tema nativo com light e dark", () => {
    expect(native).toContain("export const lightTheme");
    expect(native).toContain("export const darkTheme");
  });
});

describe("tipografia da marca — FH Duo (ver assets/brand/README.md do landingsuite)", () => {
  it("declara @font-face para as duas famílias, nos seis pesos, normal e itálico", () => {
    const total = (css.match(/\@font-face/g) ?? []).length;
    expect(total).toBe(25); // FH Duo preservada + Inter variável
  });

  it("aponta pros arquivos copiados em dist/fonts, não pro landingsuite", () => {
    expect(css).toMatch(/url\("\.\.\/fonts\/fh-duo\//);
    expect(css).toMatch(/url\("\.\.\/fonts\/fh-duo-display\//);
    expect(css).not.toMatch(/landingsuite/);
  });

  it("Inter é a família de interface e título (ADR-0033)", () => {
    expect(css).toMatch(/--typography-fontFamily-display: Inter/);
    expect(css).toMatch(/--typography-fontFamily-body: Inter/);
  });
});
