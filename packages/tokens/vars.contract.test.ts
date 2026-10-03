import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Variável CSS usada e nunca definida não dá erro: o navegador descarta a
 * declaração inteira em silêncio. Foi assim que `background: var(--sf)
 * var(--grain)` deixou modal, abas e cards sem fundo (02/10/2026). Este
 * contrato reprova todo `var(--x)` sem definição e sem valor de reserva no
 * CSS do design system e do app.
 */
const ROOT = new URL("../../", import.meta.url).pathname;
const SCAN = ["packages/ui-web/src", "apps/web/app"];

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files(path, out);
    else if (/\.(css|tsx?)$/.test(name)) out.push(path);
  }
  return out;
}

/* Propriedades que o Base UI e o Sonner escrevem em tempo de execução. */
const RUNTIME = /^--(available-|anchor-|transform-origin|active-tab-|accordion-panel-|collapsible-panel-|positioner-|nested-dialogs|scroll-area-|normal-|front-toast-|toasts-|offset|gap|z-index|initial-height|lift|swipe-amount)/;

describe("toda variável CSS usada existe", () => {
  const sources = SCAN.flatMap(dir => files(join(ROOT, dir)));
  const tokens = readFileSync(join(ROOT, "packages/tokens/dist/css/tokens.css"), "utf8");
  const defined = new Set<string>();
  for (const text of [tokens, ...sources.map(path => readFileSync(path, "utf8"))]) {
    for (const match of text.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) defined.add(match[1]!);
    // Variável escrita por estilo inline no TSX: {"--i": 3} ou setProperty("--mq", …).
    for (const match of text.matchAll(/["'`](--[a-zA-Z0-9-]+)["'`]/g)) defined.add(match[1]!);
  }

  it("não há var(--x) sem definição e sem reserva", () => {
    const missing: string[] = [];
    for (const path of sources.filter(file => file.endsWith(".css"))) {
      const css = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const match of css.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*([,)])/g)) {
        const name = match[1]!;
        const hasFallback = match[2] === ",";
        if (hasFallback || defined.has(name) || RUNTIME.test(name)) continue;
        missing.push(`${path.replace(ROOT, "")}: ${name}`);
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });
});
