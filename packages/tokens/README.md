# @spark/tokens

Fonte única de cor, espaço, raio, efeito e tipografia — DTCG (`tokens/*.json`), compilado por Style Dictionary. Ver `docs/adr/0020-design-system-proprio.md` e `docs/adr/0025-identidade-visual-liquid-glass.md`.

## ⚠️ Tipografia é placeholder

`tokens/typography.json` usa a stack de fonte do sistema porque a tipografia da marca ainda não foi definida. A **escala** (tamanho, peso, altura de linha, tracking) já é definitiva — só `fontFamily.display` e `fontFamily.body` mudam quando a fonte chegar. Trocar é editar um arquivo; nenhum componente muda.

## Build

```bash
pnpm build
```

Gera em `dist/`:
- `css/tokens.css` — variáveis CSS, cascata de tema em três estados (claro / `prefers-color-scheme` / `data-theme`) — ver o padrão em `docs/adr/0025`.
- `native/theme.ts` — objeto `{ light, dark }` para `packages/ui-native`.

## Regra que não se quebra

Componente referencia só a camada **semântica** (`color.surface`, `color.accent`...), nunca a primitiva (`color.sage.600`). É o que permite reskin sem tocar componente.
