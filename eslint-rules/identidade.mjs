// A identidade visual vem de um lugar só: os tokens da identidade
// (packages/tokens, ADR-0044). Esta regra lê o .module.css (ou app.css) que o
// .tsx importa e reprova o que faz uma tela ficar "quase" igual ao manual:
//
//   - cor literal (#hex, rgb(), hsl()) — a identidade tem 5 tons de uma tinta;
//   - curva literal (cubic-bezier) e duração literal em transition/animation —
//     uma só física, --ease e --t-*;
//   - raio literal acima de 8px — controle é pílula, superfície é squircle;
//   - font-family literal — Geist e Geist Mono por token;
//   - font-size literal em px/rem — a escala tipográfica é --fs-*;
//   - backdrop-filter fora de packages/ui-web/src/Glass (ADR-0025);
//   - nome antigo de token (--color-*, --typography-*, --motion-ease-*,
//     --radius-*, --effect-*) — esse vocabulário foi substituído;
//   - --legado-*: aviso. É a dívida da migração; zero avisos = migração completa.
//
// Os valores da identidade em packages/tokens são a única fonte permitida de
// literais, por isso o pacote de tokens não é linted por esta regra.
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const cache = new Map();

const LITERAL_COLOR = /(^|[^a-zA-Z0-9_-])(#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\()/;
const CUBIC = /cubic-bezier\(/;
const DURATION_DECL = /(?:^|;|\{)\s*(transition|transition-duration|transition-delay|animation|animation-duration|animation-delay)\s*:\s*([^;}]*)/g;
const LITERAL_TIME = /(?:^|[\s,])\d*\.?\d+m?s\b/;
const RADIUS_DECL = /(?:^|;|\{)\s*border-(?:[a-z-]+-)?radius\s*:\s*([^;}]*)/g;
const RADIUS_PX = /(\d*\.?\d+)px/g;
const FONT_FAMILY_DECL = /(?:^|;|\{)\s*font-family\s*:\s*([^;}]*)/g;
const FONT_SHORTHAND = /(?:^|;|\{)\s*font\s*:\s*([^;}]*)/g;
const BACKDROP = /backdrop-filter\s*:/;
const OLD_VOCAB = /var\(--(color|typography|motion-ease|motion-duration|motion-scale|radius|effect)-[a-zA-Z0-9-]*/g;
const LEGADO = /var\(--legado-[a-zA-Z0-9-]*/g;
const APPEARANCE = /^(color|background|background-color|background-image|border|border-(top|right|bottom|left|block|inline)(-(start|end))?|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?-(color|style)|border-(start|end)-(start|end)-radius|border(-(top|bottom)-(left|right))?-radius|box-shadow|font|font-family|font-size|font-weight|font-style|letter-spacing|line-height|text-transform|text-decoration(-color)?|opacity|filter|transition(-[a-z-]+)?|animation(-[a-z-]+)?|outline(-color|-offset|-width|-style)?|corner-shape|fill|stroke)$/;

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

function scan(cssPath) {
  const stamp = statSync(cssPath).mtimeMs;
  const hit = cache.get(cssPath);
  if (hit?.stamp === stamp) return hit.findings;
  const raw = readFileSync(cssPath, "utf8");
  const css = stripComments(raw);
  const findings = [];
  const normalized = cssPath.replace(/\\/g, "/");
  // Glass é o único dono do vidro; a física global declara os keyframes do desfoque.
  const isGlass = normalized.includes("/packages/ui-web/src/Glass/") || normalized.endsWith("/packages/ui-web/src/identidade.css");
  const report = (index, messageId, data = {}) => findings.push({ line: lineOf(css, index), messageId, data });

  // Declarações, uma a uma: a maioria das regras é por propriedade.
  const DECL = /([a-zA-Z-]+)\s*:\s*([^;{}]*)/g;
  let decl;
  while ((decl = DECL.exec(css)) !== null) {
    const [, prop, value] = decl;
    const at = decl.index;
    if (prop === "--mq" || prop === "--mqd") continue;
    if (/^(background|background-color|color|border|border-color|border-top|border-right|border-bottom|border-left|outline|outline-color|box-shadow|fill|stroke|text-decoration-color|caret-color|accent-color|scrollbar-color|background-image|mask-image|-webkit-mask-image)$/.test(prop) || prop.startsWith("--")) {
      if (LITERAL_COLOR.test(value) && !/url\(/.test(value)) report(at, "cor", { prop });
    }
    if (CUBIC.test(value)) report(at, "curva", { prop });
    // 0.01ms é o sentinela de movimento reduzido, não uma duração de desenho.
    if (/^(transition|transition-duration|transition-delay|animation|animation-duration|animation-delay)$/.test(prop) && LITERAL_TIME.test(value.replace(/0?\.01ms/g, ""))) report(at, "duracao", { prop });
    if (/^border-([a-z-]+-)?radius$/.test(prop)) {
      let px;
      while ((px = RADIUS_PX.exec(value)) !== null) if (Number(px[1]) > 8) report(at, "raio", { value: value.trim() });
    }
    if (prop === "font-family" && !/^\s*(var\(--[a-zA-Z0-9-]+(\s*,\s*var\(--[a-zA-Z0-9-]+\))?\)|inherit)\s*$/.test(value)) report(at, "fonte", { value: value.trim() });
    if (prop === "font" && /["']|Geist|Inter|Brockmann|sans-serif|monospace/.test(value)) report(at, "fonte", { value: value.trim() });
    if (prop === "font-size" && /(^|[\s(,])\d*\.?\d+(px|rem)\b/.test(value)) report(at, "tamanho", { value: value.trim() });
    if ((prop === "backdrop-filter" || prop === "-webkit-backdrop-filter") && !isGlass) report(at, "vidro");
  }
  // Tela só faz layout (ADR-0045): aparência é do componente. Vale para o CSS
  // das telas do app; a folha global (app.css) e o design system ficam fora.
  const isScreen = normalized.includes("/apps/web/app/") && !normalized.endsWith("/apps/web/app/app.css");
  if (isScreen) {
    const SCREEN_DECL = /([a-zA-Z-]+)\s*:\s*([^;{}]*)/g;
    let d;
    while ((d = SCREEN_DECL.exec(css)) !== null) {
      const [, prop, value] = d;
      if (prop.startsWith("--")) continue;
      const v = value.trim();
      const neutral = /^(0|none|transparent|inherit|initial|unset|0px)$/.test(v);
      if (APPEARANCE.test(prop) && !neutral) report(d.index, "tela", { prop });
    }
  }
  let m;
  while ((m = OLD_VOCAB.exec(css)) !== null) report(m.index, "antigo", { name: m[0].slice(4) });
  while ((m = LEGADO.exec(css)) !== null) report(m.index, "legado", { name: m[0].slice(4) });

  cache.set(cssPath, { stamp, findings });
  return findings;
}

function rule(kinds, description) {
  return {
  meta: {
    type: "problem",
    docs: { description },
    schema: [],
    messages: {
      cor: "{{module}}:{{line}} — cor literal em `{{prop}}`. Use um token da identidade (--tx, --sf, --bd, --ok, --er, --sh1…).",
      curva: "{{module}}:{{line}} — cubic-bezier literal em `{{prop}}`. Use --ease, --ease-move, --ease-spring ou --ease-out.",
      duracao: "{{module}}:{{line}} — duração literal em `{{prop}}`. Use --t-instant, --t-fast, --t-base, --t-default, --t-slow, --t-deliberate ou os tempos nomeados (--t-pop, --t-rise…).",
      raio: "{{module}}:{{line}} — raio literal `{{value}}`. Controle é --r-pill; superfície é --r-sm/md/lg/xl/2xl com corner-shape: var(--r-shape).",
      fonte: "{{module}}:{{line}} — família literal `{{value}}`. Use var(--font), var(--font-display) ou var(--mono).",
      tamanho: "{{module}}:{{line}} — tamanho de fonte literal `{{value}}`. Use a escala --fs-* (corpo, pequeno, legenda, meta, valor…); papel novo vira token.",
      vidro: "{{module}}:{{line}} — backdrop-filter só dentro de packages/ui-web/src/Glass (ADR-0025). Use <Glass>.",
      antigo: "{{module}}:{{line}} — `{{name}}` é o vocabulário anterior. O equivalente está em docs/referencias/identidade/README.md.",
      legado: "{{module}}:{{line}} — `{{name}}` é dívida da migração: reescreva pela receita (docs/referencias/identidade/README.md) e remova o token.",
      tela: "{{module}}:{{line}} — `{{prop}}` numa tela: aparência é do componente (ADR-0045). Use ou crie o componente em packages/ui-web; a tela só posiciona.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string" || !source.endsWith(".css")) return;
        const cssPath = path.resolve(path.dirname(context.filename), source);
        let findings;
        try { findings = scan(cssPath); } catch { return; }
        const module = path.basename(source);
        for (const finding of findings) {
          if (!kinds.includes(finding.messageId)) continue;
          context.report({
            node,
            messageId: finding.messageId,
            data: { module, line: String(finding.line), ...finding.data },
          });
        }
      },
    };
  },
  };
}

export const identidade = rule(["cor", "curva", "duracao", "raio", "fonte", "tamanho", "vidro", "antigo"], "O CSS importado usa só os tokens da identidade, sem literais de cor, curva, duração, raio, família ou tamanho de fonte.");
export const identidadeLegado = rule(["legado"], "Aviso de dívida: token --legado-* ainda em uso.");
export const telaSoLayout = rule(["tela"], "CSS de tela só faz layout; aparência (cor, fundo, borda, raio, sombra, fonte, movimento) é do componente.");
