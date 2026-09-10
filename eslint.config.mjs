// Lint de fronteiras do Spark — ver docs/adr/0003, 0019, 0020, 0021, 0028, 0029
// Isto não é estilo: é o mecanismo que impede a arquitetura de virar o Twenty.
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

const ELEMENTS = [
  { type: "app-api", pattern: "apps/api/**" },
  { type: "app-worker", pattern: "apps/worker/**" },
  { type: "app-scheduler", pattern: "apps/scheduler/**" },
  { type: "app-web", pattern: "apps/web/**" },
  { type: "app-desktop", pattern: "apps/desktop/**" },
  { type: "app-mobile", pattern: "apps/mobile/**" },
  { type: "app-site", pattern: "apps/site/**" },
  { type: "pkg-core", pattern: "packages/core/**" },
  { type: "pkg-contracts", pattern: "packages/contracts/**" },
  { type: "pkg-data", pattern: "packages/data/**" },
  { type: "pkg-api-client", pattern: "packages/api-client/**" },
  { type: "pkg-db", pattern: "packages/db/**" },
  { type: "pkg-email", pattern: "packages/email/**" },
  { type: "pkg-storage", pattern: "packages/storage/**" },
  { type: "pkg-tokens", pattern: "packages/tokens/**" },
  { type: "pkg-blocks", pattern: "packages/blocks/**" },
  { type: "pkg-ui-web", pattern: "packages/ui-web/**" },
  { type: "pkg-ui-native", pattern: "packages/ui-native/**" },
];

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/build/**", "**/.output/**", "**/node_modules/**", "**/coverage/**"],
  },
  ...tseslint.configs.recommended,
  {
    plugins: { boundaries },
    settings: {
      "boundaries/elements": ELEMENTS,
      "boundaries/include": ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
      // sem isto, importar por nome de pacote workspace (@spark/x) nunca resolve
      // para um arquivo real, e a regra de fronteira não pega nada — só o caminho
      // relativo funcionaria. Este é o caso comum de verdade.
      "import/resolver": {
        typescript: { project: ["packages/*/tsconfig.json", "apps/*/tsconfig.json"] },
      },
    },
    rules: {
      // ADR-0019 — core não importa de fora. É regra pura, sem I/O, sem apps.
      "boundaries/element-types": [
        "error",
        {
          default: "allow",
          rules: [
            {
              from: "pkg-core",
              disallow: ["app-*", "pkg-db", "pkg-api-client", "pkg-data", "pkg-ui-web", "pkg-ui-native"],
              message: "packages/core não importa de fora — nem de app, nem de db, nem de UI (ADR-0019).",
            },
            // ADR-0021 — só quem escreve/lê o banco toca packages/db.
            {
              from: ["app-web", "app-desktop", "app-mobile", "app-site"],
              disallow: ["pkg-db"],
              message: "Cliente não fala com o banco direto — passa por api-client ou data (ADR-0021, ADR-0026).",
            },
            // ADR-0028 — arquivo só pelo adaptador único.
            {
              from: ["app-web", "app-desktop", "app-mobile", "pkg-core", "pkg-ui-web", "pkg-ui-native"],
              disallow: ["pkg-storage"],
              message: "Só apps/api, apps/worker e apps/scheduler falam com packages/storage (ADR-0028).",
            },
          ],
        },
      ],
    },
  },
  {
    // ADR-0020 (elemento nativo) e ADR-0025 (backdrop-filter) — UM bloco só.
    // Duas config objects setando a mesma chave "no-restricted-syntax" para o
    // mesmo arquivo se sobrescrevem por inteiro em flat config; nunca duplicar essa chave.
    files: ["**/*.{ts,tsx}"],
    ignores: ["packages/ui-web/**", "packages/ui-native/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='input']",
          message: "Sem <input> nativo fora de packages/ui-web (ADR-0020). Use o componente do design system.",
        },
        {
          selector: "JSXOpeningElement[name.name='select']",
          message: "Sem <select> nativo fora de packages/ui-web (ADR-0020).",
        },
        {
          selector: "JSXOpeningElement[name.name='textarea']",
          message: "Sem <textarea> nativo fora de packages/ui-web (ADR-0020).",
        },
        {
          selector: "JSXOpeningElement[name.name='button']",
          message: "Sem <button> nativo fora de packages/ui-web (ADR-0020).",
        },
        {
          selector: "Literal[value=/backdrop-filter/]",
          message: "backdrop-filter só dentro de packages/ui-web/src/Glass (ADR-0025).",
        },
        {
          selector: "TemplateElement[value.raw=/backdrop-filter/]",
          message: "backdrop-filter só dentro de packages/ui-web/src/Glass (ADR-0025).",
        },
      ],
    },
  }
);
