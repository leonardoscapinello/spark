# @spark/tokens

Fonte única de cor, espaço, raio, efeito e tipografia — DTCG (`tokens/*.json`), compilado por Style Dictionary. Ver `docs/adr/0020-design-system-proprio.md` e `docs/adr/0025-identidade-visual-liquid-glass.md`.

## Tipografia

**FH Duo Display** para títulos e chamadas. **FH Duo** para interface, corpo, formulário e dado. Self-hosted, sem Google Fonts — os `.woff2` estão em `fonts/`, trazidos de `landingsuite/assets/brand/fonts/` (ver `docs/adr/0025`).

⚠️ **São ativos proprietários.** Ver [`fonts/LICENSE-NOTICE.md`](fonts/LICENSE-NOTICE.md) antes de publicar este pacote em qualquer lugar fora do monorepo.

Doze arquivos por família (seis pesos × normal/itálico): `Light` (300) · `Regular` (400) · `Medium` (500) · `SemiBold` (600) · `Bold` (700) · `Black` (900).

## Build

```bash
pnpm build
```

Gera em `dist/`:
- `css/tokens.css` — `@font-face` das duas famílias + variáveis CSS, cascata de tema em três estados (claro / `prefers-color-scheme` / `data-theme`) — ver o padrão em `docs/adr/0025`.
- `fonts/` — os `.woff2` copiados, ao lado do CSS que os referencia.
- `native/theme.ts` — objeto `{ light, dark }` para `packages/ui-native`.

## Regra que não se quebra

Componente referencia só a camada **semântica** (`color.surface`, `color.accent`, `typography.fontFamily.body`...), nunca a primitiva. É o que permite reskin sem tocar componente.
