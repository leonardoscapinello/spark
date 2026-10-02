import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const glass = readFileSync(resolve(process.cwd(), "src/Glass/Glass.module.css"), "utf8");
const modal = readFileSync(resolve(process.cwd(), "src/Modal/Modal.module.css"), "utf8");

// Um ancestral com opacity/filter/mask impede o blur de enxergar a página até
// o fim da animação. jsdom não compõe pixels; este contrato protege a causa.
describe("composição do backdrop", () => {
  it("não cria Backdrop Root no ancestral das camadas", () => {
    const css = `${glass}\n${modal}`.replace(/\/\*[\s\S]*?\*\//g, "");
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    const wrappers = rules.filter(([, selector]) => selector?.trim().startsWith(".backdrop") && !selector.includes(" > ") && !selector.includes(" ."));
    expect(wrappers.length).toBeGreaterThan(0);
    for (const [, , declarations] of wrappers) {
      expect(declarations).not.toMatch(/(?:^|;)\s*(?:opacity|filter|backdrop-filter|mask-image|isolation)\s*:/);
    }
  });
});
