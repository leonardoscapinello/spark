// packages/tokens/build.mjs
// Emite as variáveis CSS com o vocabulário da identidade visual (origem: docs/referencias/identidade/origem/base.css)
// na cascata de três estados que packages/ui-web exige (ADR-0025): :root (claro),
// @media prefers-color-scheme guardado por :not([data-theme=light]), e
// [data-theme=dark] (Carvão) para a troca explícita vencer nos dois sentidos.
//
// Style Dictionary resolve UM conjunto de tokens por vez — por isso dois builds
// (claro/escuro) e a montagem final aqui. ADR-0044.
import StyleDictionary from "style-dictionary";
import { promises as fs } from "node:fs";
import { springLinear } from "./src/spring.ts";

const BASE_SOURCES = [
  "tokens/space.json",
  "tokens/identidade.escalas.json",
  "tokens/motion.json",
  "tokens/ui.json",
];

async function buildTheme(nome, temaFile) {
  const sd = new StyleDictionary({
    source: [...BASE_SOURCES, temaFile],
    platforms: {
      json: {
        transformGroup: "css",
        buildPath: `.tmp/${nome}/`,
        files: [{ destination: "vars.json", format: "json/nested" }],
      },
    },
  });
  await sd.buildAllPlatforms();
  return JSON.parse(await fs.readFile(`.tmp/${nome}/vars.json`, "utf-8"));
}

function flatten(obj, prefix = []) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const path = [...prefix, k];
    const isShadowLeaf = v && typeof v === "object" && "color" in v && "offsetX" in v;
    if (v === null || typeof v !== "object" || isShadowLeaf) {
      out[path.join("-")] = v;
    } else {
      Object.assign(out, flatten(v, path));
    }
  }
  return out;
}

/* Mola declarada como par duration/bounce vira, no CSS, um easing linear()
 * pronto e a duração total em ms. O par cru continua no tema nativo. */
function withSprings(flat) {
  const out = { ...flat };
  for (const key of Object.keys(flat)) {
    const match = /^motion-spring-([a-zA-Z]+)-duration$/.exec(key);
    if (!match) continue;
    const name = match[1];
    const bounceKey = `motion-spring-${name}-bounce`;
    if (!(bounceKey in flat)) continue;
    const { easing, durationMs } = springLinear({ duration: Number(flat[key]), bounce: Number(flat[bounceKey]) });
    delete out[key];
    delete out[bounceKey];
    out[`motion-spring-${name}`] = easing;
    out[`motion-spring-${name}-duration`] = `${durationMs}ms`;
  }
  return out;
}

function toCssVars(flat, indent = "  ") {
  return Object.entries(withSprings(flat))
    .map(([k, v]) => `${indent}--${k}: ${cssValue(v)};`)
    .join("\n");
}

function cssValue(v) {
  if (v && typeof v === "object" && "color" in v) {
    return `${v.offsetX} ${v.offsetY} ${v.blur} ${v.spread} ${v.color}`;
  }
  if (Array.isArray(v)) {
    // cubicBezier vira cubic-bezier(); fontFamily vira a pilha com aspas onde há espaço.
    if (v.length === 4 && v.every((n) => typeof n === "number")) return `cubic-bezier(${v.join(", ")})`;
    return v.map((f) => (f.includes(" ") ? `"${f}"` : f)).join(", ");
  }
  return v;
}

/* Geist e Geist Mono são a tipografia da identidade (variáveis, Fontsource). Inter e
 * Brockmann continuam disponíveis como escolha da organização (ADR-0041 segue
 * valendo como opção, não como padrão). */
async function buildFontFaceCss() {
  let fontFace = "";
  for (const [directory, family] of [["geist", "Geist"], ["geist-mono", "Geist Mono"], ["inter", "Inter"]]) {
    const filename = `${directory}-latin-wght-normal.woff2`;
    await fs.mkdir(`dist/fonts/${directory}`, { recursive: true });
    await fs.copyFile(`node_modules/@fontsource-variable/${directory}/files/${filename}`, `dist/fonts/${directory}/${filename}`);
    await fs.copyFile(`node_modules/@fontsource-variable/${directory}/LICENSE`, `dist/fonts/${directory}/LICENSE`);
    fontFace += `@font-face {
  font-family: "${family}";
  src: url("../fonts/${directory}/${filename}") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}\n`;
  }
  await fs.mkdir("dist/fonts/brockmann", { recursive: true });
  const brandFonts = JSON.parse(await fs.readFile("fonts/brockmann/manifest.json", "utf8"));
  for (const { file: filename, weight, style } of brandFonts) {
    for (const format of ["woff2", "woff"]) {
      await fs.copyFile(`fonts/brockmann/${filename}.${format}`, `dist/fonts/brockmann/${filename}.${format}`);
    }
    fontFace += `@font-face {
  font-family: "Brockmann";
  src: url("../fonts/brockmann/${filename}.woff2") format("woff2"), url("../fonts/brockmann/${filename}.woff") format("woff");
  font-weight: ${weight};
  font-style: ${style};
  font-display: swap;
}\n`;
  }
  return fontFace;
}

async function main() {
  const claro = flatten(await buildTheme("claro", "tokens/identidade.claro.json"));
  const escuro = flatten(await buildTheme("escuro", "tokens/identidade.escuro.json"));

  // Só o que diverge entra no bloco escuro: escalas e medidas são iguais nos dois temas.
  const escuroOnly = Object.fromEntries(
    Object.entries(escuro).filter(([k, v]) => claro[k] !== v),
  );

  const css = `/* Gerado por packages/tokens/build.mjs — NÃO editar à mão.
 * Fonte: packages/tokens/tokens/*.json (DTCG). Rodar \`pnpm gen:tokens\` para atualizar.
 * Vocabulário da identidade (docs/referencias/identidade) na cascata de
 * três estados do ADR-0025: bare :root é sempre o tema claro completo.
 */

:root {
${toCssVars(claro)}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${toCssVars(escuroOnly, "    ")}
  }
}

:root[data-theme="dark"] {
${toCssVars(escuroOnly)}
}
`;

  await fs.mkdir("dist/css", { recursive: true });
  const fontFace = await buildFontFaceCss();
  await fs.writeFile("dist/css/tokens.css", fontFace + css);

  const nativeTheme = `// Gerado por packages/tokens/build.mjs — NÃO editar à mão.
export const lightTheme = ${JSON.stringify(claro, null, 2)} as const;
export const darkTheme = { ...lightTheme, ...${JSON.stringify(escuroOnly, null, 2)} } as const;
export type Theme = typeof lightTheme;
`;
  await fs.mkdir("dist/native", { recursive: true });
  await fs.writeFile("dist/native/theme.ts", nativeTheme);

  await fs.rm(".tmp", { recursive: true, force: true });

  console.log(`tokens.css: ${Object.keys(claro).length} variáveis (claro) + ${Object.keys(escuroOnly).length} (escuro, override)`);
  console.log(`theme.ts: gerado para packages/ui-native`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
