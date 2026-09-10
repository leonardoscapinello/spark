// packages/tokens/build.mjs
// Constrói as variáveis CSS na cascata de três estados que packages/ui-web
// exige (docs/adr/0025-identidade-visual-liquid-glass.md): :root (claro),
// @media prefers-color-scheme guardado por :not([data-theme=light]), e
// [data-theme=dark] para a troca explícita vencer nos dois sentidos.
//
// Style Dictionary por si só não monta essa cascata (ele resolve UM conjunto
// de tokens por vez) — por isso dois builds (claro/escuro) e depois a
// montagem final é feita aqui.
import StyleDictionary from "style-dictionary";
import { promises as fs } from "node:fs";

const BASE_SOURCES = [
  "tokens/color.primitive.json",
  "tokens/space.json",
  "tokens/radius.json",
  "tokens/effect.json",
  "tokens/typography.json",
  "tokens/motion.json",
];

async function buildTheme(nome, semanticFile) {
  const sd = new StyleDictionary({
    source: [...BASE_SOURCES, semanticFile],
    platforms: {
      json: {
        transformGroup: "css",
        buildPath: `.tmp/${nome}/`,
        files: [{ destination: "vars.json", format: "json/nested" }],
      },
    },
  });
  await sd.buildAllPlatforms();
  const flat = JSON.parse(await fs.readFile(`.tmp/${nome}/vars.json`, "utf-8"));
  return flat;
}

function flatten(obj, prefix = []) {
  // saída do format json/nested resolve o valor direto na folha — string,
  // number, ou (para shadow) um objeto com color/offsetX/offsetY/blur/spread.
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

function toCssVars(flat, indent = "  ") {
  return Object.entries(flat)
    .map(([k, v]) => `${indent}--${k}: ${cssValue(v)};`)
    .join("\n");
}

function cssValue(v) {
  if (v && typeof v === "object" && "color" in v) {
    // shadow token do Style Dictionary vem como objeto {color, offsetX, offsetY, blur, spread}
    return `${v.offsetX} ${v.offsetY} ${v.blur} ${v.spread} ${v.color}`;
  }
  if (Array.isArray(v)) return v.map((f) => (f.includes(" ") ? `"${f}"` : f)).join(", ");
  return v;
}

// Mapa peso/estilo -> arquivo. FH Duo e FH Duo Display têm o mesmo conjunto
// de pesos (docs em packages/tokens/README.md). Ativo proprietário — ver
// packages/tokens/fonts/LICENSE-NOTICE.md antes de reusar fora deste monorepo.
const PESOS = [
  ["Light", 300], ["Regular", 400], ["Medium", 500],
  ["SemiBold", 600], ["Bold", 700], ["Black", 900],
];

function buildFontFaceCss() {
  const familias = [
    { nome: "FH Duo", pasta: "fh-duo", prefixo: "FHDuo" },
    { nome: "FH Duo Display", pasta: "fh-duo-display", prefixo: "FHDuoDisplay" },
  ];

  const blocos = [];
  for (const { nome, pasta, prefixo } of familias) {
    for (const [sufixo, peso] of PESOS) {
      for (const [styleSufixo, styleValor] of [["", "normal"], ["Italic", "italic"]]) {
        const arquivo = `${prefixo}-${sufixo}${styleSufixo}.woff2`;
        blocos.push(`@font-face {
  font-family: "${nome}";
  src: url("../fonts/${pasta}/${arquivo}") format("woff2");
  font-weight: ${peso};
  font-style: ${styleValor};
  font-display: swap;
}`);
      }
    }
  }
  return blocos.join("\n") + "\n\n";
}

async function main() {
  const light = flatten(await buildTheme("light", "tokens/color.semantic.light.json"));
  const dark = flatten(await buildTheme("dark", "tokens/color.semantic.dark.json"));

  // Só emitimos no bloco escuro o que REALMENTE diverge do claro — primitivas
  // (sage, slate, teal...) são compartilhadas e não precisam ser redeclaradas.
  // Reemitir valor idêntico não está errado, mas é peso sem propósito.
  const darkOnly = Object.fromEntries(
    Object.entries(dark).filter(([k, v]) => light[k] !== v),
  );

  const css = `/* Gerado por packages/tokens/build.mjs — NÃO editar à mão.
 * Fonte: packages/tokens/tokens/*.json (DTCG). Rodar \`pnpm build\` para atualizar.
 * Cascata de tema em três estados — ver docs/adr/0025-identidade-visual-liquid-glass.md
 * e a skill artifact-design: bare :root é sempre o tema claro completo.
 */

:root {
${toCssVars(light)}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${toCssVars(darkOnly, "    ")}
  }
}

:root[data-theme="dark"] {
${toCssVars(darkOnly)}
}
`;

  await fs.mkdir("dist/css", { recursive: true });
  await fs.mkdir("dist/fonts/fh-duo", { recursive: true });
  await fs.mkdir("dist/fonts/fh-duo-display", { recursive: true });
  for (const familia of ["fh-duo", "fh-duo-display"]) {
    for (const arquivo of await fs.readdir(`fonts/${familia}`)) {
      await fs.copyFile(`fonts/${familia}/${arquivo}`, `dist/fonts/${familia}/${arquivo}`);
    }
  }

  const fontFace = buildFontFaceCss();
  await fs.writeFile("dist/css/tokens.css", fontFace + css);

  const nativeTheme = `// Gerado por packages/tokens/build.mjs — NÃO editar à mão.
export const lightTheme = ${JSON.stringify(light, null, 2)} as const;
export const darkTheme = { ...lightTheme, ...${JSON.stringify(darkOnly, null, 2)} } as const;
export type Theme = typeof lightTheme;
`;
  await fs.mkdir("dist/native", { recursive: true });
  await fs.writeFile("dist/native/theme.ts", nativeTheme);

  await fs.rm(".tmp", { recursive: true, force: true });

  console.log(`tokens.css: ${Object.keys(light).length} variáveis (claro) + ${Object.keys(darkOnly).length} (escuro, override)`);
  console.log(`theme.ts: gerado para packages/ui-native`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
