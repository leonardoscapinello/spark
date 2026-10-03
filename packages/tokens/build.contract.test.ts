import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Teste de contrato do build de tokens — testa o que os consumidores
 * (packages/ui-web, packages/ui-native) exigem: a cascata de três estados existe
 * e o vocabulário da identidade está completo e igual ao CSS de origem.
 * `pretest` roda o build antes (ver package.json) — este teste lê o artefato real.
 */
const css = readFileSync(new URL("./dist/css/tokens.css", import.meta.url), "utf-8");
const native = readFileSync(new URL("./dist/native/theme.ts", import.meta.url), "utf-8");
const origem = JSON.parse(readFileSync(new URL("../../docs/referencias/identidade/origem/tokens.json", import.meta.url), "utf-8")) as { themes: Record<string, Record<string, string>> };

function vars(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([a-zA-Z0-9-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
}

const rootBlock = css.match(/^:root\s*{([^}]*)}/m)?.[1] ?? "";
const darkBlock = css.match(/:root\[data-theme="dark"\]\s*{([^}]*)}/)?.[1] ?? "";
// A origem declara os dois temas em ordem: claro e depois escuro.
const [origemClaro, origemEscuro] = Object.values(origem.themes).map(theme => Object.fromEntries(Object.entries(theme).map(([k, v]) => [k.replace(/^--/, ""), v])));

describe("cascata de tema em três estados (ADR-0025)", () => {
  it("define :root claro completo, sem depender de media query", () => {
    expect(rootBlock).toContain("--bg:");
    expect(rootBlock).toContain("--tx:");
    expect(rootBlock).toContain("--space-4:");
  });

  it("sobrescreve só o que diverge dentro de @media (prefers-color-scheme: dark)", () => {
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)/);
    expect(css).toMatch(/:root:not\(\[data-theme="light"\]\)/);
    // escala compartilhada NÃO é redeclarada no bloco escuro
    expect((css.match(/--r-pill:/g) ?? []).length).toBe(1);
  });

  it("[data-theme=dark] vence a preferência do sistema nos dois sentidos", () => {
    expect(css).toMatch(/:root\[data-theme="dark"\]\s*{/);
  });

  it("gera o tema nativo com light e dark", () => {
    expect(native).toContain("export const lightTheme");
    expect(native).toContain("export const darkTheme");
  });
});

describe("vocabulário da identidade é igual ao CSS de origem (ADR-0044)", () => {
  const claro = vars(rootBlock);
  const escuro = vars(darkBlock);
  // Style Dictionary escreve 0.06 e .1 onde a origem escreve .06 e .10: mesmo valor.
  const norm = (v: string) => v.replace(/\s+/g, "").replace(/"/g, "'").replace(/([,(])0\./g, "$1.").replace(/(\.\d*[1-9])0+(?=\D)/g, "$1");

  it("todo token do tema claro existe com o mesmo nome e valor", () => {
    for (const [name, value] of Object.entries(origemClaro)) {
      expect(claro[name], `--${name}`).toBeDefined();
      expect(norm(claro[name]), `--${name}`).toBe(norm(value));
    }
  });

  it("todo token do tema escuro existe com o mesmo nome e valor", () => {
    for (const [name, value] of Object.entries(origemEscuro)) {
      if (norm(origemClaro[name] ?? "") === norm(value)) continue; // igual ao claro: não é reemitido
      expect(escuro[name], `--${name}`).toBeDefined();
      expect(norm(escuro[name]), `--${name}`).toBe(norm(value));
    }
  });

  it("escalas: forma, altura, física e tipografia", () => {
    expect(claro["r-pill"]).toBe("999px");
    expect(claro["r-sm"]).toBe("18px");
    expect(claro["r-md"]).toBe("28px");
    expect(claro["r-lg"]).toBe("36px");
    expect(claro["r-xl"]).toBe("44px");
    expect(claro["r-2xl"]).toBe("56px");
    expect(claro["h-sm"]).toBe("28px");
    expect(claro["h-md"]).toBe("36px");
    expect(claro["h-lg"]).toBe("44px");
    expect(claro["h-field"]).toBe("40px");
    expect(claro["ease"]).toBe("cubic-bezier(0.22, 1, 0.36, 1)");
    expect(claro["ease-move"]).toBe("cubic-bezier(0.65, 0, 0.35, 1)");
    expect(claro["ease-spring"]).toBe("cubic-bezier(0.34, 1.22, 0.64, 1)");
    expect(claro["ease-out"]).toBe("cubic-bezier(0.4, 0, 0.6, 1)");
    expect(claro["t-instant"]).toBe("100ms");
    expect(claro["t-default"]).toBe("550ms");
    expect(claro["font"]).toMatch(/^Geist,/);
    expect(claro["mono"]).toMatch(/^["']Geist Mono["'],/);
    expect(claro["vidro-menu"]).toBe("blur(24px) saturate(1.3)");
  });
});

describe("fontes", () => {
  it("declara Geist, Geist Mono e Inter variáveis, e a Brockmann da organização", () => {
    const brandFonts = JSON.parse(readFileSync(new URL("./fonts/brockmann/manifest.json", import.meta.url), "utf-8"));
    expect((css.match(/@font-face/g) ?? []).length).toBe(3 + brandFonts.length);
    expect(css).toMatch(/url\("\.\.\/fonts\/geist\//);
    expect(css).toMatch(/url\("\.\.\/fonts\/geist-mono\//);
    expect(css).not.toMatch(/fh-duo/);
  });
});

describe("molas perceptuais viram linear() no CSS", () => {
  it("emite cada preset como easing pronto e a duração total em ms", () => {
    for (const name of ["smooth", "snappy", "bouncy"]) {
      expect(css).toMatch(new RegExp(`--motion-spring-${name}: linear\\(0, `));
      expect(css).toMatch(new RegExp(`--motion-spring-${name}-duration: \\d+ms;`));
      expect(css).not.toContain(`--motion-spring-${name}-bounce`);
    }
  });

  it("mantém duration e bounce crus no tema nativo", () => {
    expect(native).toContain('"motion-spring-smooth-duration": 0.45');
    expect(native).toContain('"motion-spring-snappy-bounce": 0.15');
  });
});
