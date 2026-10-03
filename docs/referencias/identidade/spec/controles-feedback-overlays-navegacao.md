# Identidade 墨 — Spec de CSS: Controles, Feedback, Sobreposições e Navegação

Extraído do DOM renderizado do manual Identidade (v1.0). Cada valor abaixo foi lido do atributo `style="…"` do elemento, do CSS global (`style1.css`) ou da lógica que resolve os placeholders (`dc.src`). Nada foi inventado: quando o manual não define algo, está escrito **não especificado**.

Fontes:

- `sections/20-controles.html`, `21-feedback.html`, `22-overlays.html`, `23-navegacao.html`, `00-shell-before-sections.html`
- `body.html` — camadas flutuantes (modal, drawer, toast, command palette, "Conectar plataforma") ficam **fora das seções**, no fim do `<main>`, "para nunca herdar transform"
- `dc.src` — resolução dos placeholders `{{ … }}`
- `style1.css` — física global e keyframes (`pf*`); `origem/base.css` — tokens (os mesmos keyframes aparecem lá como `sumi*`)

Convenções deste documento:

- `{{ x }}` resolvido aparece como `x = valor-ligado | valor-desligado`.
- `style-hover="…"` do motor do manual está escrito como `:hover { … }`.
- `corner-shape:squircle` acompanha **todo** `border-radius` de superfície (cards, modais, popovers); pílulas (`999px`) não levam.
- Fonte: `Geist` (300/400/500/600) e `'Geist Mono'`; `html,body{font-size:13px;-webkit-font-smoothing:antialiased}`.

---

## 0. Base compartilhada (física global)

Tudo abaixo vale para todos os componentes e é pré-requisito para os valores das seções seguintes.

### 0.1 Transição universal

```css
*, *::before, *::after {
  transition-property: background-color, border-color, color, box-shadow, transform, opacity, filter, outline-color;
  transition-duration: .55s;                     /* --t-default */
  transition-timing-function: cubic-bezier(.22,1,.36,1);  /* --ease "Respiro" */
}
input, textarea { transition-property: background-color, border-color, color, box-shadow; }
[data-instant], [data-instant] * { transition: none !important; }
a, button { -webkit-tap-highlight-color: transparent; }
@media (prefers-reduced-motion: reduce) { * { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
```

Qualquer `transition:` inline nos componentes **substitui** essa regra apenas para as propriedades listadas.

### 0.2 Curvas e durações (tokens `origem/base.css`)

| Token | Valor | Uso |
|---|---|---|
| `--ease` (Respiro) | `cubic-bezier(.22,1,.36,1)` | padrão, entrar, assentar |
| `--ease-move` (Maré) | `cubic-bezier(.65,0,.35,1)` | deslocar A→B |
| `--ease-spring` (Folha) | `cubic-bezier(.34,1.22,.64,1)` | toggle, pastilha, pop |
| variante spring +forte | `cubic-bezier(.34,1.28,.64,1)` | ponto do radio, ícone do toast (não tem token) |
| `--ease-out` (Saída) | `cubic-bezier(.4,0,.6,1)` | sumir, fechar |
| `--t-instant` | 100ms | press |
| `--t-fast` | 300ms | |
| `--t-base` | 450ms | |
| `--t-default` | 550ms | transição universal |
| `--t-slow` | 600ms | |
| `--t-deliberate` | 700ms | |

### 0.3 Toque — `[data-press]`

```css
[data-press] { white-space: nowrap; max-width: 100%;
  transition: transform .45s cubic-bezier(.22,1,.36,1), box-shadow .5s cubic-bezier(.22,1,.36,1),
              filter .45s cubic-bezier(.22,1,.36,1), background .45s cubic-bezier(.22,1,.36,1); }
[data-press]:active { transition-duration: .1s; }
[data-press="ink"]:active   { transform: translateY(1px) scale(.97) !important; box-shadow: var(--inkp) !important; filter: brightness(.88); }
[data-press="sheet"]:hover  { box-shadow: var(--e2) !important; transform: translateY(-1px); }
[data-press="sheet"]:active { transform: translateY(1px) scale(.98) !important; box-shadow: var(--deb) !important; }
[data-press="ghost"]:active { transform: scale(.97); }
[data-press] > span:not([data-lbl]) { flex: none; }
[data-lbl] { display: inline-block; flex: 0 1 auto; min-width: 0; max-width: 100%; vertical-align: top;
             overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
```

Rótulo de botão é sempre `<span data-lbl="1"><span>texto</span></span>` (marquee automático via `[data-mq]` quando estoura — `pfMarquee var(--mqd) ease-in-out infinite alternate`).

### 0.4 Indicador deslizante — `[data-slide]` / `[data-ind]`

Usado por: radio em cartão, segmentado (ambos), toggle de tema, item de navegação (sidebar expandida, compacta e mobile), tabs sublinhadas (`data-ind="line"`), paginação, tab bar mobile.

```css
[data-slide] { position: relative; }
[data-ind]   { position: absolute; left: 0; top: 0; opacity: 0; pointer-events: none; will-change: transform, width; }
[data-slide][data-ready] > [data-ind] {
  transition: transform .55s cubic-bezier(.22,1,.36,1), width .55s cubic-bezier(.22,1,.36,1), opacity .3s;
  /* origem/base.css acrescenta: height .55s var(--ease) */
}
[data-slide] > :not([data-ind]) { position: relative; z-index: 1; }   /* origem/base.css; no manual é inline */
```

Lógica (`slideAll`, `dc.src` linha 136), rodada 60 ms após montar e a cada render:

1. Encontra o filho com `data-on="true"`. Se não há, `opacity:0`.
2. `width = ativo.offsetWidth` px; `height = (line ? 2 : ativo.offsetHeight)` px.
3. `transform = translate(ativo.offsetLeft px, (line ? ativo.offsetTop + ativo.offsetHeight − 2 : ativo.offsetTop) px)`.
4. `opacity = 1`.
5. Na primeira medição o container ainda **não** tem `data-ready` → posiciona sem transição; `data-ready="1"` é setado após dois `requestAnimationFrame`.

O item ativo em si fica `background:transparent` — a "folha" visível é o `[data-ind]`.

### 0.5 Tooltip por CSS — `[data-tipwrap]` / `[data-tip]`

```css
[data-tip] { opacity: 0; transform: translate(-6px,-50%) scale(.96); filter: blur(2px); /* origem/base.css: pointer-events:none */ }
[data-tipwrap]:hover > [data-tip], [data-tipwrap]:focus-visible > [data-tip] {
  opacity: 1; transform: translate(0,-50%); filter: none; transition-delay: .25s; }
```

Duração da transição vem da regra universal (.55s Respiro em opacity/transform/filter).

### 0.6 Colapso — `[data-collapse]`

```css
[data-collapse] { display: grid; grid-template-rows: 0fr; opacity: 0; margin-top: calc(var(--g,0px) * -1); filter: blur(2px);
  transition: grid-template-rows .6s cubic-bezier(.22,1,.36,1), opacity .45s cubic-bezier(.22,1,.36,1),
              margin-top .6s cubic-bezier(.22,1,.36,1), filter .5s cubic-bezier(.22,1,.36,1); }
[data-collapse][data-open="true"] { grid-template-rows: 1fr; opacity: 1; margin-top: 0; filter: none; }
[data-collapse] > * { overflow: hidden; min-height: 0; }
```

### 0.7 Ícones (`{{ ic.* }}`)

Todo ícone é `mkIcon(path)`:

```html
<svg data-icon="1" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block">
  <!-- paths de icons.json; cada <path|circle|rect> recebe pathLength="100" -->
</svg>
```

O tamanho vem do `<span style="display:flex;width:Npx;height:Npx">` que o envolve (12 / 14 / 16 / 18 / 20 / 24 px). Nomes usados aqui: `info, checkCircle, warn, alert, tag, arrowUpRight, cart, search, filter, trash, x, chevronRight, chevronLeft, chevronUpDown, settings, check, lock, home, funnel, plug, file, user`.

### 0.8 Ensō (spinner) — `{{ spin14 }}`, `{{ spin20 }}`

```css
/* spinner(sz) */
span { width: sz; height: sz; border-radius: 99px; border: 1.5px solid currentColor; border-right-color: transparent;
       display: inline-block; animation: pfSpin .7s linear infinite; }
@keyframes pfSpin { to { transform: rotate(360deg); } }
```

`sz` = 14 (dentro do toast) ou 20 (carregamento, "Conectando…"). Cor = `currentColor` do pai.

### 0.9 Moldura dos exemplos (não é componente)

Cards de demonstração do manual: `background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:44px; corner-shape:squircle; padding:28px` (ou `24px 28px 12px` nas listas de switch/checkbox e `24px 20px 20px` no radio). Título do card: `font-size:12px; font-weight:500`; legenda mono: `font-family:'Geist Mono'; font-size:10.5px; color:var(--tx3)`. Bandeja afundada (para shell e overlays): `background:var(--sf2); box-shadow:var(--deb); border-radius:56px; corner-shape:squircle`.

---

## 1. Switch

"42 × 24 · pastilha 18". Trilho cavado, peça em folha; ligado = peça vira carvão (trilho `--tx`).

### Anatomia

```
button (linha inteira, clicável)            sc-camel-on-click = toggle
├─ span (textos)
│  ├─ span rótulo
│  └─ span descrição
└─ span.trilho                              42×24, pílula
   └─ span.pastilha                         18×18, translateX
```

### Estilos

```css
.linha {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%;
  padding: 14px 0; border: 0; border-bottom: 1px solid var(--bd); background: transparent;
  cursor: pointer; text-align: left; color: var(--tx); font-family: Geist, sans-serif;
}
.textos   { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.rotulo   { font-size: 13px; }
.descricao{ font-size: 11px; color: var(--tx3); }

.trilho {
  flex: none; position: relative; width: 42px; height: 24px; border-radius: 999px;
  background: swA.bg;        /* on: var(--tx)  | off: var(--sf2) */
  box-shadow: swA.tr;        /* on: inset 0 1px 2px rgba(0,0,0,.35)  | off: var(--deb), inset 0 0 0 1px var(--bd) */
  transition: background .42s cubic-bezier(.22,1,.36,1), box-shadow .42s cubic-bezier(.22,1,.36,1);
}
.pastilha {
  position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 999px;
  background: var(--sf3) var(--grain);
  box-shadow: 0 0 0 .5px var(--bd2), 0 1px 1px rgba(0,0,0,.14), 0 2px 4px -1px rgba(0,0,0,.2);
  transform: translateX(swA.x);   /* on: 18px | off: 0px */
  transition: transform .51s cubic-bezier(.34,1.22,.64,1);
}
```

### Estados

| Estado | trilho `background` | trilho `box-shadow` | pastilha `transform` |
|---|---|---|---|
| off | `var(--sf2)` | `var(--deb), inset 0 0 0 1px var(--bd)` | `translateX(0px)` |
| on | `var(--tx)` | `inset 0 1px 2px rgba(0,0,0,.35)` | `translateX(18px)` |
| hover / focus / disabled | não especificado | | |

### Movimento

- Trilho: cor e sombra em **420 ms**, Respiro.
- Pastilha: deslocamento em **510 ms**, Folha (`cubic-bezier(.34,1.22,.64,1)`, overshoot).
- Sem animação de entrada.

### Medidas

Trilho 42×24; pastilha 18, inset 3; curso 18 px; linha com `padding:14px 0` (alvo ≥ 36 px — regra da seção: "Toda área clicável tem no mínimo 36px"); gap texto→trilho 16.

---

## 2. Checkbox

"20 · ✓ em um traço". Caixa 20 px squircle; o check é um `<path>` desenhado por `stroke-dashoffset`.

### Anatomia

```
button (linha)                               sc-camel-on-click = toggle
├─ span.caixa 20×20
│  └─ svg 12×12 (viewBox 0 0 24 24)
│     └─ path d="M4.5 12.5l5 5L19.5 7" stroke-dasharray="24"
└─ span (textos: rótulo 13px + descrição 11px)
```

### Estilos

```css
.linha  { display: flex; align-items: flex-start; gap: 12px; width: 100%; padding: 12px 0; border: 0;
          border-bottom: 1px solid var(--bd); background: transparent; cursor: pointer; text-align: left;
          color: var(--tx); font-family: Geist, sans-serif; }
.caixa  { flex: none; width: 20px; height: 20px; margin-top: -1px; border-radius: 7px; corner-shape: squircle;
          background: chkA.bg;   /* on: var(--tx) | off: var(--sf2) */
          box-shadow: chkA.sh;   /* on: var(--ink) | off: var(--deb), inset 0 0 0 1px var(--bd2) */
          display: flex; align-items: center; justify-content: center;
          transition: background .31s cubic-bezier(.22,1,.36,1), box-shadow .31s cubic-bezier(.22,1,.36,1); }
svg     { width: 12px; height: 12px; fill: none; stroke: var(--sf); stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
path    { stroke-dasharray: 24;
          stroke-dashoffset: chkA.off;   /* on: 0 | off: 24 */
          transition: stroke-dashoffset .51s cubic-bezier(.22,1,.36,1) .06s; }
.textos { display: flex; flex-direction: column; gap: 3px; }
.rotulo { font-size: 13px; }  .descricao { font-size: 11px; color: var(--tx3); }
```

### Estados

| Estado | caixa `background` | caixa `box-shadow` | conteúdo |
|---|---|---|---|
| off | `var(--sf2)` | `var(--deb), inset 0 0 0 1px var(--bd2)` | path com `dashoffset:24` (invisível) |
| on | `var(--tx)` | `var(--ink)` | path `dashoffset:0` |
| indeterminado | `var(--tx)` | `var(--ink)` | `<span style="width:9px;height:2.4px;border-radius:2px;background:var(--sf)">` no lugar do svg |
| desabilitado | `var(--sf2)` | `inset 0 0 0 1px var(--bd)` | linha inteira `opacity:.45`; sem `border-bottom`; não é `<button>` |
| hover / focus | não especificado | | |

### Movimento

- Caixa: cor e sombra **310 ms** Respiro.
- Traço do ✓: `stroke-dashoffset` 24→0 em **510 ms** Respiro com **60 ms de atraso** (a tinta chega depois da caixa escurecer).

### Medidas

Caixa 20, raio 7 squircle, `margin-top:-1px` para alinhar à primeira linha de texto; ✓ 12 px, traço 3.2; indeterminado 9×2.4 raio 2; gap caixa→texto 12; linha `padding:12px 0`.

---

## 3. Radio em cartão

"escolhido = folha erguida". Cada opção é um cartão; o escolhido recebe uma folha (`[data-ind]`) por baixo, que **desliza** entre opções.

### Anatomia

```
div.card[data-slide="1"]  (moldura do manual, position:relative, gap:8px)
├─ span[data-ind="1"]                       folha erguida que desliza
└─ button[data-on] × 3                      position:relative; z-index:1
   ├─ span.bolinha 20×20
   │  └─ span.ponto 7×7
   ├─ span (rótulo 13/500 + descrição 11)
   └─ span.valor (mono 11)
```

### Estilos

```css
[data-ind] { background: var(--sf3) var(--grain); border: 1px solid var(--bd2); box-shadow: var(--e2);
             border-radius: 28px; corner-shape: squircle; }            /* + regras de 0.4 */

.opcao {
  position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  border: 1px solid r.bd;        /* ativo: transparent | inativo: var(--bd) */
  border-radius: 28px; corner-shape: squircle;
  background: r.cbg;             /* sempre transparent */
  box-shadow: r.csh;             /* sempre none */
  transform: r.ty;               /* sempre none */
  cursor: pointer; text-align: left; color: var(--tx); font-family: Geist, sans-serif;
  transition: box-shadow .34s cubic-bezier(.22,1,.36,1), transform .34s cubic-bezier(.22,1,.36,1), background .34s cubic-bezier(.22,1,.36,1);
}
.bolinha { flex: none; width: 20px; height: 20px; border-radius: 999px;
           background: r.rbg;    /* ativo: var(--tx) | inativo: var(--sf2) */
           box-shadow: r.rsh;    /* ativo: var(--ink) | inativo: var(--deb), inset 0 0 0 1px var(--bd2) */
           display: flex; align-items: center; justify-content: center;
           transition: background .34s cubic-bezier(.22,1,.36,1); }
.ponto   { width: 7px; height: 7px; border-radius: 999px; background: var(--sf);
           transform: r.dot;     /* ativo: scale(1) | inativo: scale(0) */
           transition: transform .48s cubic-bezier(.34,1.28,.64,1); }
.rotulo  { font-size: 13px; font-weight: 500; color: r.fg; }   /* ativo: var(--tx) | inativo: var(--tx2) */
.descricao { font-size: 11px; color: var(--tx3); }
.valor   { font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--tx3); }
```

### Estados

| | borda do cartão | bolinha | ponto | rótulo |
|---|---|---|---|---|
| inativo | `1px solid var(--bd)` | `var(--sf2)` + `var(--deb), inset 0 0 0 1px var(--bd2)` | `scale(0)` | `var(--tx2)` |
| ativo | `transparent` (a folha `[data-ind]` com `--bd2` + `--e2` aparece por baixo) | `var(--tx)` + `var(--ink)` | `scale(1)` | `var(--tx)` |
| hover / disabled | não especificado | | | |

### Movimento

- Folha `[data-ind]`: `transform`/`width` em **550 ms** Respiro (0.4).
- Borda/sombra/fundo do cartão: 340 ms Respiro.
- Bolinha: fundo 340 ms Respiro. Ponto: `scale` em **480 ms** com `cubic-bezier(.34,1.28,.64,1)` (spring forte).

### Medidas

Cartão `padding:14px 16px`, raio 28; bolinha 20, ponto 7; gap 12; gap entre cartões 8 (do container).

---

## 4. Slider

Faixa cavada, preenchimento a carvão, botão em folha. O `<input type=range>` nativo fica invisível por cima para capturar o ponteiro.

### Anatomia

```
div.card (padding 28, gap 18)
├─ div.cabecalho  (space-between, baseline)
│  ├─ span "Slider — meta de conversão" 12/500
│  └─ span.valor   font:400 22px/1 Geist; letter-spacing:-0.02em   → sliderLabel = `${v}%`
├─ div.pista  position:relative; height:24px; display:flex; align-items:center
│  ├─ div.trilho
│  ├─ div.preenchido
│  ├─ div.botao
│  └─ input[type=range]
└─ div.marcas (0% · 50% · 100%)
```

### Estilos

```css
.trilho      { position: absolute; left: 0; right: 0; height: 8px; border-radius: 999px; background: var(--sf2); box-shadow: var(--deb); }
.preenchido  { position: absolute; left: 0; width: sliderPct; height: 8px; border-radius: 999px; background: var(--ac); }   /* sliderPct = `${v}%` */
.botao       { position: absolute; left: sliderPct; width: 22px; height: 22px; margin-left: -11px; border-radius: 999px;
               background: var(--sf3); border: 1px solid var(--bd); box-shadow: var(--e2); }
input[type=range] { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; margin: 0; }  /* min 0 max 100 */
.marcas      { display: flex; justify-content: space-between; font-family: 'Geist Mono', monospace; font-size: 10.5px; color: var(--tx3); }
```

### Estados

Valor inicial 62. Hover, active (arrastando), focus e disabled: **não especificado** (o botão não muda).

### Movimento

Nenhuma transição inline; `left`/`width` **não** estão na lista da transição universal, portanto o movimento acompanha o ponteiro sem suavização. A sombra/fundo do botão herdaria a transição universal se mudasse (não muda).

### Medidas

Trilho 8; botão 22 (centralizado em `margin-left:-11px`); área de toque 24 de altura; valor 22 px leve (400) com tracking −0.02em.

---

## 5. Segmentado

Duas variantes no manual: **papel** (fundo afundado, folha branca desliza) e **carvão** (fundo `--ac`, folha `--bg` desliza; "para a troca de modo principal da tela"). Ambas usam `[data-slide]`.

### 5.1 Segmentado papel (`segView`: Dia / Semana / Mês, inicial "Mês")

```
div[data-slide="1"]
├─ span[data-ind="1"]
└─ button[data-press="ghost"][data-on] × 3
   └─ span[data-lbl] > span
```

```css
.grupo     { position: relative; display: flex; align-self: flex-start; padding: 4px; gap: 2px; border-radius: 999px;
             background: var(--sf2); box-shadow: var(--deb); }
[data-ind] { background: var(--sf3); box-shadow: var(--sh1); border-radius: 999px; }
.item      { position: relative; z-index: 1; height: 32px; padding: 0 18px; border: 0; border-radius: 999px;
             background: o.bg;      /* sempre transparent */
             box-shadow: o.sh;      /* sempre none */
             color: o.fg;           /* ativo: var(--tx) | inativo: var(--tx3) */
             font: 500 13px/1 Geist, sans-serif; cursor: pointer;
             transition: all .34s cubic-bezier(.22,1,.36,1); }
```

Estados: ativo = texto `--tx` sobre a folha `--sf3/--sh1`; inativo = `--tx3`; `:active` (ghost) = `scale(.97)`; hover não especificado.
Movimento: folha desliza 550 ms Respiro; cor do texto 340 ms.
Medidas: altura total 40 (32 + 2×4); item `padding:0 18px`; gap 2.

### 5.2 Segmentado carvão (`segC`: Agora / Projeção, inicial "Agora")

```
div[data-slide="1"]
├─ span[data-ind="1"]
└─ button[data-on] × 2  (sem data-press)
   ├─ texto
   └─ sup (numeração 01 / 02)
```

```css
.grupo     { position: relative; display: flex; align-self: flex-start; padding: 4px; border-radius: 999px;
             background: var(--ac); box-shadow: var(--ink); }
[data-ind] { background: var(--bg); border-radius: 999px; }
.item      { position: relative; z-index: 1; height: 40px; padding: 0 22px; border: 0; border-radius: 999px; background: transparent;
             color: o.fg;           /* ativo: var(--tx) | inativo: var(--acf) */
             display: flex; align-items: center; gap: 2px; font: 500 15px/1 Geist, sans-serif; letter-spacing: -0.01em; cursor: pointer; }
.item sup  { font-size: 9px; }
```

Estados: ativo = `--tx` sobre folha `--bg`; inativo = `--acf` (texto claro sobre carvão). Hover/active não especificado.
Movimento: folha 550 ms Respiro; cor pela transição universal (.55s).
Medidas: altura total 48; item `padding:0 22px`; sem gap.

---

## 6. Toggle de tema (shell do manual)

É o segmentado carvão em tamanho menor, com rótulo e numeração sobrescrita ("Papel 01 / Carvão 02").

```
div[data-slide="1"]
├─ span[data-ind="1"]   background:var(--bg); border-radius:999px
└─ button[data-press="ghost"][data-on] × 2
   ├─ span[data-lbl] > span (rótulo)
   └─ span (sup: font-size:8px; line-height:1)
```

```css
.grupo { position: relative; display: flex; padding: 3px; border-radius: 999px; background: var(--ac); }
.item  { position: relative; z-index: 1; height: 30px; padding: 0 16px; padding-top: 9px; border: 0; border-radius: 999px;
         background: transparent;   /* o.bg */
         color: o.fg;               /* ativo: var(--tx) | inativo: var(--acf) */
         font: 500 13px/1 Geist, sans-serif; letter-spacing: -0.01em; cursor: pointer;
         display: flex; align-items: flex-start; gap: 2px;
         transition: all .42s cubic-bezier(.22,1,.36,1); }
```

Troca de tema: `{{ themeVars }}` aplica o mapa `DV` (tokens do tema Carvão) como `style` inline no wrapper raiz; o fundo da página tem `transition: background .51s cubic-bezier(.22,1,.36,1)`. Há um `div` fixo 2×2 px com `opacity:.01; backdrop-filter:blur(28px) saturate(.85)` para pré-aquecer o compositor do véu.

Medidas: altura total 36 (30 + 2×3); item `padding:0 16px`, `padding-top:9px` (alinha rótulo e sup pelo topo).

---

## 7. Alerta inline (Feedback)

"Mensagens falam em uma frase. A cor fica num ícone de 28px, nunca pinta o bloco inteiro." Quatro variantes: info, sucesso, atenção (com ação sheet), erro (com ação ghost).

### Anatomia

```
div.alerta
├─ span.icone 28×28 squircle (cor da variante)
│  └─ span 16×16 > {{ ic.* }}
├─ div.textos (flex:1)
│  ├─ span.titulo 13/500
│  └─ span.corpo 12, --tx2, lh 1.5
└─ button (opcional: sheet "Reconectar" | ghost "Detalhes")
```

### Estilos

```css
.alerta  { background: var(--sf) var(--grain); border: 1px solid var(--bd); box-shadow: var(--sh1);
           border-radius: 32px; corner-shape: squircle; padding: 16px 18px; display: flex; gap: 14px; align-items: flex-start; }
.icone   { flex: none; width: 28px; height: 28px; border-radius: 14px; corner-shape: squircle;
           display: flex; align-items: center; justify-content: center; }
.icone > span { display: flex; width: 16px; height: 16px; }
.textos  { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.titulo  { font-size: 13px; font-weight: 500; }
.corpo   { font-size: 12px; color: var(--tx2); line-height: 1.5; }

/* ação sheet (atenção) */
.acao-sheet { height: 28px; padding: 0 12px; border: 1px solid var(--bd); border-radius: 999px;
              background: var(--sf3) var(--grain); box-shadow: var(--sh1); color: var(--tx);
              font: 500 12px/1 Geist, sans-serif; cursor: pointer; }              /* data-press="sheet" */
/* ação ghost (erro) */
.acao-ghost { height: 28px; padding: 0 12px; border: 0; border-radius: 999px; background: transparent; color: var(--tx2);
              font: 500 12px/1 Geist, sans-serif; cursor: pointer; }             /* data-press="ghost" */
.acao-ghost:hover { background-color: var(--acs); }
```

### Variantes

| Variante | ícone | `.icone` background | `.icone` color |
|---|---|---|---|
| info | `ic.info` | `var(--ins)` | `var(--in)` |
| sucesso | `ic.checkCircle` | `var(--oks)` | `var(--ok)` |
| atenção | `ic.warn` | `var(--was)` | `var(--wa)` |
| erro | `ic.alert` | `var(--ers)` | `var(--er)` |

Grid dos quatro: `repeat(auto-fit,minmax(300px,1fr)); gap:12px`.

### Movimento

Sem animação de entrada no manual (só a universal). Dispensar/fechar: não especificado.

**Banner** (faixa de topo descartável) **não** está nestes arquivos — vive na seção `mais` (`banner`, `closeBanner`, `noBanner` em `dc.src`).

---

## 8. Badge, tag e selo (shu)

```css
/* badge de status com ponto */
.badge      { height: 22px; padding: 0 9px; border-radius: 999px; font-size: 11px; font-weight: 500;
              display: inline-flex; align-items: center; gap: 5px; }
.badge .pt  { width: 6px; height: 6px; border-radius: 9px; background: currentColor-da-variante; }
.badge.ok   { background: var(--oks); color: var(--ok); }    /* ponto var(--ok) */   "Aprovado"
.badge.wa   { background: var(--was); color: var(--wa); }    /* ponto var(--wa) */   "Pendente"
.badge.er   { background: var(--ers); color: var(--er); }    /* ponto var(--er) */   "Reembolsado"

/* neutros, sem ponto */
.badge.neutro { height: 22px; padding: 0 9px; border-radius: 999px; background: var(--sf2); color: var(--tx2); font-size: 11px; font-weight: 500; display: inline-flex; align-items: center; }  "Rascunho"
.badge.tinta  { height: 22px; padding: 0 9px; border-radius: 999px; background: var(--ac);  color: var(--acf); font-size: 11px; font-weight: 500; display: inline-flex; align-items: center; }  "Novo"

/* tag com ícone, contorno */
.tag        { height: 22px; padding: 0 9px; border-radius: 999px; border: 1px solid var(--bd2); color: var(--tx2); font-size: 11px;
              display: inline-flex; align-items: center; gap: 4px; }    /* font-weight: herdado (400) */
.tag > span { display: flex; width: 12px; height: 12px; }                /* ic.tag */

/* selo shu — contador */
.shu        { height: 18px; min-width: 18px; padding: 0 5px; border-radius: 999px; background: var(--shu); color: #fff;
              font-size: 10px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; }   "7"

/* delta positivo */
.delta      { height: 22px; padding: 0 7px; border-radius: 999px; background: var(--oks); color: var(--ok); font-size: 11px; font-weight: 500;
              display: inline-flex; align-items: center; gap: 2px; }
.delta > span { display: flex; width: 12px; height: 12px; }              /* ic.arrowUpRight */   "12,4%"
```

Linha de badges: `display:flex; gap:6px; flex-wrap:wrap; align-items:center`.
Selo shu também aparece na sidebar (contador do item "Vendas", mesmo CSS com `display:flex`) e como ponto 7×7 na sidebar compacta (ver §17).
Keyframe disponível para entrada de selo (não usado nestes arquivos): `@keyframes pfBadgeIn{from{opacity:0;transform:scale(.4)}}`.

---

## 9. Skeleton

```css
.linha-skeleton {
  height: 10px; width: 70% | 90% | 45%; border-radius: 999px;
  background: linear-gradient(90deg, var(--sf2) 0, var(--bd) 50%, var(--sf2) 100%);
  background-size: 400px 100%;
  animation: pfShimmer 1.4s linear infinite;
}
@keyframes pfShimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
```

Pilha: `display:flex; flex-direction:column; gap:8px`. Variante estática (placeholder do fundo da tab bar mobile): `height:12px; border-radius:999px; background:var(--bd)` dentro de container `opacity:.6`, larguras 60/80/40 %, gap 8.

---

## 10. Spinner / ensō

Dois desenhos no manual:

**Ensō CSS** (`spin20`) — ver §0.8: 20 px, `border:1.5px solid currentColor; border-right-color:transparent; animation:pfSpin .7s linear infinite`, cor `var(--tx)` via `<span style="display:flex;width:20px;height:20px;color:var(--tx)">`.

**Ensō SVG (traço)**:

```html
<svg width="44" height="44" viewBox="0 0 44 44">
  <circle cx="22" cy="22" r="18" fill="none" stroke="var(--tx)" stroke-width="3" stroke-linecap="round"
          stroke-dasharray="96 18" transform="rotate(-70 22 22)" opacity=".9"/>
</svg>
```

Estático no manual (sem `animation`). Circunferência ≈ 113; traço 96 + vão 18 → abertura de ~57°.

**Progress ring**: não existe nestes arquivos (há `pfIndet` para barra indeterminada: `@keyframes pfIndet{from{transform:translateX(-100%)}to{transform:translateX(260%)}}`, usada na seção `padroes`).

---

## 11. Estado vazio

```
div.card (padding 28; flex column; align-items:center; text-align:center; gap:10px)
├─ span.icone 48×48
│  └─ span 20×20 > ic.cart
├─ span.titulo
├─ span.corpo
└─ button[data-press="ink"]  → openConnect (abre modal "Conectar plataforma", §21)
```

```css
.icone  { width: 48px; height: 48px; border-radius: 24px; corner-shape: squircle; background: var(--sf2); box-shadow: var(--deb);
          display: flex; align-items: center; justify-content: center; color: var(--tx3); }
.titulo { font: 500 15px/1.3 Geist, sans-serif; }
.corpo  { font-size: 12px; color: var(--tx2); line-height: 1.5; max-width: 240px; }
.cta    { margin-top: 6px; height: 32px; padding: 0 14px; border: 0; border-radius: 999px; background: var(--ac); color: var(--acf);
          box-shadow: var(--ink); font: 500 12px/1 Geist, sans-serif; cursor: pointer; }   /* data-press="ink" */
```

**Estado de erro com retry** não está nestes arquivos (vive na seção `padroes`: `rt.err` / `rt.net`, `retry()` → `load` por 1500 ms → `ok`).

---

## 12. Tooltip

Duas implementações.

### 12.1 Tooltip controlado (seção Sobreposições)

```
div (position:relative; centro)
├─ sc-if tip → div[data-pop="1"].tooltip
├─ button[data-press="sheet"] 36×36  (mouseenter/focus → tipOn; mouseleave/blur → tipOff)
└─ span "Passe o mouse" 12 --tx3
```

```css
.tooltip { position: absolute; bottom: calc(50% + 26px); padding: 7px 12px; border-radius: 999px;
           background: var(--ac); color: var(--acf); font-size: 12px; box-shadow: var(--e2); white-space: nowrap;
           animation: popIn; }
/* popIn = pfPop .38s cubic-bezier(.22,1,.36,1)   (abrindo)
          | pfPopOut .24s cubic-bezier(.4,0,.6,1) forwards   (fechando, via closePops) */
@keyframes pfPop    { from { opacity: 0; transform: translateY(-6px) scale(.985); } to { opacity: 1; transform: none; } }
@keyframes pfPopOut { to   { opacity: 0; transform: translateY(-4px) scale(.985); filter: blur(1px); } }

.gatilho { width: 36px; height: 36px; border: 1px solid var(--bd); border-radius: 999px; background: var(--sf3) var(--grain);
           box-shadow: var(--sh1); color: var(--tx2); display: flex; align-items: center; justify-content: center; cursor: help; }
.gatilho > span { display: flex; width: 16px; height: 16px; }   /* ic.info */
```

Legenda do manual: "Carvão · 12px · máx. 1 linha · 400ms de atraso". **Atenção:** o demo não implementa os 400 ms (`tipOn` é imediato); o atraso é regra declarada, não medida.

### 12.2 Tooltip por hover (`[data-tipwrap]`, sidebar compacta)

```css
[data-tip] { position: absolute; left: 54px; top: 50%; white-space: nowrap; padding: 7px 12px; border-radius: 999px;
             background: var(--ac); color: var(--acf); font-size: 12px; box-shadow: var(--e2); z-index: 3; pointer-events: none; }
/* + estado base/aberto de §0.5: oculto = opacity:0; translate(-6px,-50%) scale(.96); blur(2px);
     visível = opacity:1; translate(0,-50%); filter:none; transition-delay:.25s */
```

Entrada: 250 ms de atraso + .55 s Respiro (universal). Saída: imediata (sem delay), .55 s.

---

## 13. Popover

```
div (position:relative)
├─ button.gatilho[data-press="sheet"]  (ic.filter + "Filtros · {{ popCount }}")
└─ sc-if pop → div[data-pop="1"].popover
   ├─ span.titulo 13/500
   ├─ div.chips (flex; gap 6; wrap) → button.chip × 4 (Aprovadas, Pix, Cartão, Boleto)
   └─ div.rodape (flex-end; gap 6) → ghost "Limpar" · ink "Aplicar"
```

```css
.gatilho  { height: 32px; padding: 0 12px 0 14px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--bd);
            border-radius: 999px; background: var(--sf3) var(--grain); box-shadow: var(--sh1); color: var(--tx);
            font: 500 12px/1 Geist, sans-serif; cursor: pointer; }
.gatilho > span:first-child { display: flex; width: 14px; height: 14px; }

.popover  { position: absolute; top: 40px; left: 0; z-index: 6; width: min(300px,100%); padding: 16px;
            display: flex; flex-direction: column; gap: 12px;
            background: var(--glass); backdrop-filter: blur(24px) saturate(1.5); -webkit-backdrop-filter: blur(24px) saturate(1.5);
            border: 1px solid var(--gbd); box-shadow: var(--e2); border-radius: 28px; corner-shape: squircle;
            animation: popIn; }   /* pfPop .38s Respiro | pfPopOut .24s Saída forwards */

.chip     { height: 28px; padding: 0 12px; border-radius: 999px;
            border: 1px solid c.bd;   /* ligado: var(--ac) | desligado: var(--bd2) */
            background: c.bg;         /* ligado: var(--ac) | desligado: transparent */
            color: c.fg;              /* ligado: var(--acf) | desligado: var(--tx2) */
            font: 400 12px/1 Geist, sans-serif; cursor: pointer;
            transition: all .3s cubic-bezier(.22,1,.36,1); }   /* data-press="ghost" */

.limpar   { height: 28px; padding: 0 12px; border: 0; border-radius: 999px; background: transparent; color: var(--tx2);
            font: 500 12px/1 Geist, sans-serif; cursor: pointer; }  .limpar:hover { background-color: var(--acs); }
.aplicar  { height: 28px; padding: 0 12px; border: 0; border-radius: 999px; background: var(--ac); color: var(--acf);
            box-shadow: var(--ink); font: 500 12px/1 Geist, sans-serif; cursor: pointer; }   /* data-press="ink" */
```

Comportamento: `pointerdown` fora de `[data-pop]`/`[data-pop-trigger]` → `closePops()` → seta `popOut` (todas as camadas `[data-pop]` tocam `pfPopOut .24s`) e remove após **230 ms**. Seleção inicial: Aprovadas e Pix ligados. Aplicar fecha e dispara toast "Filtros aplicados". Esc **não** fecha popover (só modal/cmd).

Medidas: gatilho 32; popover 300 máx., raio 28, `top:40px` (gatilho 32 + 8); chips 28.

---

## 14. Véu e 4 camadas de blur progressivo

Receita compartilhada por modal, confirmação, command palette e "Conectar plataforma" (`blurLayers`); o drawer usa a variante lateral (`dBlur`). O véu é **papel**, não preto: `--veil: rgba(240,240,238,.18)` no tema Papel, `rgba(12,11,9,.42)` no Carvão.

### Estrutura (ordem no DOM = ordem de pintura)

```
div.overlay  position:fixed; inset:0; z-index:N; (clique = fechar)
├─ div.veu            position:absolute; inset:0; background:var(--veil); animation: scrimAnim
├─ div.blur × 4       position:absolute; inset:0; backdrop-filter: l.f; mask-image: l.m; pointer-events:none; animation: l.a
├─ div.vinheta        (só no modal) radial-gradient(ellipse 60% 55% at 50% 50%, transparent 40%, var(--vig) 100%); pointer-events:none; animation: scrimAnim
└─ div.painel         position:relative; …; animation: modalAnim   (clique = stopPropagation)
```

### Camadas radiais (`blurLayers`) — modal, cmd, conectar

| # | `l.f` | `l.m` (`mask-image` e `-webkit-mask-image`) |
|---|---|---|
| 1 | `blur(2px) saturate(.85)` | `radial-gradient(ellipse 70% 65% at 50% 50%, transparent 0%, #000 35%)` |
| 2 | `blur(6px) saturate(.85)` | `radial-gradient(ellipse 70% 65% at 50% 50%, transparent 10%, #000 55%)` |
| 3 | `blur(14px) saturate(.85)` | `radial-gradient(ellipse 70% 65% at 50% 50%, transparent 25%, #000 75%)` |
| 4 | `blur(28px) saturate(.85)` | `radial-gradient(ellipse 70% 65% at 50% 50%, transparent 40%, #000 100%)` |

`l.a` = abrindo `pfBlurIn .7s cubic-bezier(.22,1,.36,1) both` · fechando `pfBlurOut .28s cubic-bezier(.4,0,.6,1) forwards`.
(Na command palette e no "Conectar", `l.a` usa o **mesmo** `blurLayers`, portanto fecha com a curva do modal mesmo que esses painéis não animem a saída.)

### Camadas laterais (`dBlur`) — drawer

| # | `l.f` | `l.m` |
|---|---|---|
| 1 | `blur(2px) saturate(.85)` | `linear-gradient(270deg, #000 0, #000 30%, transparent 60%)` |
| 2 | `blur(6px) saturate(.85)` | `linear-gradient(270deg, #000 0, #000 30%, transparent 72%)` |
| 3 | `blur(14px) saturate(.85)` | `linear-gradient(270deg, #000 0, #000 30%, transparent 84%)` |
| 4 | `blur(26px) saturate(.85)` | `linear-gradient(270deg, #000 0, #000 30%, transparent 100%)` |

`l.a` = abrindo `pfBlurIn .5s cubic-bezier(.22,1,.36,1) both` · fechando `pfBlurOut .22s ease forwards`.

### Keyframes

```css
@keyframes pfFade    { from { opacity: 0; } to { opacity: 1; } }
@keyframes pfFadeOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes pfBlurIn  { from { backdrop-filter: blur(0px) saturate(1); -webkit-backdrop-filter: blur(0px) saturate(1); } }
@keyframes pfBlurOut { to   { backdrop-filter: blur(0px) saturate(1); -webkit-backdrop-filter: blur(0px) saturate(1); } }
```

Variante simplificada (gaveta mobile, §17.3): uma única camada `backdrop-filter:blur(10px) saturate(.85); animation:pfBlurIn .45s cubic-bezier(.22,1,.36,1) both`.

Camadas de z-index observadas: modal 100 · drawer 100 · conectar 102 · detalhe kanban 104 · command palette 105 · toast simples 110 · pilha de toasts 111 · ghost de arrasto 120.

---

## 15. Modal (confirmação destrutiva)

O único modal da seção é a confirmação "Desconectar Meta Ads?". Contrato declarado no manual (tabela de garantia): "máx 480 · margem 24 · raio 44 · `--e3 --veil` · blur progressivo 2→28px · Sobe 10px em 620ms; desfoque cresce em 700ms; sai em 280ms · Foco preso dentro; Esc fecha; aria-modal".

### Anatomia

```
sc-if modal → div.overlay (z 100; flex center; padding 24px; click → closeModal)
├─ véu + 4 blur + vinheta  (§14)
└─ div.painel (click → stop)
   ├─ div.topo (space-between; align flex-start; gap 12)
   │  ├─ span.icone 40×40 squircle --ers/--er → span 18×18 ic.trash
   │  └─ button.fechar 32×32 ghost → ic.x 16
   ├─ div.textos (column; gap 6)
   │  ├─ span.titulo
   │  └─ span.corpo
   └─ div.acoes (flex-end; gap 8; margin-top 8)
      ├─ button sheet "Cancelar"
      └─ button ink destrutivo "Desconectar"
```

### Estilos

```css
.overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; padding: 24px; }
.painel  { position: relative; width: min(440px,100%); padding: 28px; display: flex; flex-direction: column; gap: 16px;
           background: var(--sf3) var(--grain); border: 1px solid var(--bd); box-shadow: var(--e3);
           border-radius: 44px; corner-shape: squircle; color: var(--tx);
           animation: modalAnim; }
.icone   { width: 40px; height: 40px; border-radius: 20px; corner-shape: squircle; background: var(--ers); color: var(--er);
           display: flex; align-items: center; justify-content: center; }
.icone > span { display: flex; width: 18px; height: 18px; }
.fechar  { width: 32px; height: 32px; border: 0; border-radius: 999px; background: transparent; color: var(--tx2);
           display: flex; align-items: center; justify-content: center; cursor: pointer; }   /* data-press="ghost" */
.fechar:hover { background-color: var(--acs); }
.titulo  { font: 500 20px/1.25 Geist, sans-serif; letter-spacing: -0.02em; }
.corpo   { font-size: 13px; color: var(--tx2); line-height: 1.55; }
.cancelar{ height: 36px; padding: 0 16px; border: 1px solid var(--bd); border-radius: 999px; background: var(--sf3) var(--grain);
           box-shadow: var(--sh1); color: var(--tx); font: 500 13px/1 Geist, sans-serif; cursor: pointer; }   /* sheet */
.destruir{ height: 36px; padding: 0 16px; border: 0; border-radius: 999px; background: var(--er); color: #fff;
           box-shadow: var(--ink); font: 500 13px/1 Geist, sans-serif; cursor: pointer; }                     /* ink */
```

### Movimento

| Peça | Abrindo | Fechando |
|---|---|---|
| véu + vinheta (`scrimAnim`) | `pfFade .55s cubic-bezier(.22,1,.36,1)` | `pfFadeOut .28s cubic-bezier(.4,0,.6,1) forwards` |
| 4 camadas de blur (`l.a`) | `pfBlurIn .7s cubic-bezier(.22,1,.36,1) both` | `pfBlurOut .28s cubic-bezier(.4,0,.6,1) forwards` |
| painel (`modalAnim`) | `pfRise .62s cubic-bezier(.22,1,.36,1)` | `pfSink .28s cubic-bezier(.4,0,.6,1) forwards` |

```css
@keyframes pfRise { from { opacity: 0; transform: translateY(10px) scale(.975); } to { opacity: 1; transform: none; } }
@keyframes pfSink { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(8px) scale(.97); } }
```

Sequência de fechamento: `closeModal` seta `closing:true` e desmonta após **280 ms**; `confirmModal` desmonta após **200 ms** e dispara toast "Meta Ads desconectado". Esc fecha (`keydown` global; se a command palette estiver aberta, Esc fecha ela primeiro). Foco preso e `aria-modal`: declarados no contrato, **não implementados no demo**.

### Medidas

Painel 440 máx. (contrato diz 480), padding 28, raio 44, gap 16; ícone 40 (raio 20); botões 36; margem externa 24.

---

## 16. Drawer

Folha lateral direita, solta da borda por 12 px em todos os lados. Gatilho (`openDrawer`) fica em outra seção; o markup vive nas camadas flutuantes.

### Anatomia

```
sc-if drawer → div.overlay (z 100; click → closeDrawer)
├─ div.veu   background: linear-gradient(270deg, var(--veil) 0, transparent 100%), var(--veil); animation: dScrim
├─ div.blur × 4 (dBlur, §14)
└─ div.painel (click → stop)
   ├─ div.cabecalho (space-between; padding 22px 22px 16px 26px; border-bottom 1px --bd)
   │  ├─ div (column; gap 4) → span.mono "Pedido #48213" · span.titulo
   │  └─ button.fechar 32×32 (sem data-press) → ic.x 16
   ├─ div.corpo (flex:1; overflow:auto; padding 22px 26px; column; gap 18)
   │  ├─ div (baseline; gap 10) → span.valor · badge.ok "Aprovado"
   │  └─ div.lista → div.linha × 4
   └─ div.rodape (flex; gap 8; padding 16px 22px; border-top 1px --bd)
      ├─ button sheet "Reembolsar" (flex:1)
      └─ button ink "Concluir" (flex:1)
```

### Estilos

```css
.painel    { position: absolute; top: 12px; right: 12px; bottom: 12px; width: min(420px, calc(100% - 24px));
             display: flex; flex-direction: column; background: var(--sf3) var(--grain); border: 1px solid var(--bd);
             box-shadow: var(--e3); border-radius: 44px; corner-shape: squircle; color: var(--tx); overflow: hidden;
             animation: drawerAnim; }
.mono      { font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--tx3); }
.titulo    { font: 500 20px/1.2 Geist, sans-serif; letter-spacing: -0.02em; }
.fechar    { width: 32px; height: 32px; border: 0; border-radius: 999px; background: transparent; color: var(--tx2);
             display: flex; align-items: center; justify-content: center; cursor: pointer; }
.valor     { font: 300 40px/1 Geist, sans-serif; letter-spacing: -0.04em; }
.linha     { display: flex; justify-content: space-between; padding: 11px 0; border-top: 1px solid var(--bd); font-size: 13px; }
.linha > span:first-child { color: var(--tx2); }
.linha .mono-valor { font-family: 'Geist Mono', monospace; }
.reembolsar{ flex: 1; height: 40px; border: 1px solid var(--bd); border-radius: 999px; background: var(--sf3); box-shadow: var(--sh1);
             color: var(--tx); font: 500 13px/1 Geist, sans-serif; cursor: pointer; }   /* sheet; sem grain */
.concluir  { flex: 1; height: 40px; border: 0; border-radius: 999px; background: var(--ac); color: var(--acf); box-shadow: var(--ink);
             font: 500 13px/1 Geist, sans-serif; cursor: pointer; }                    /* ink */
```

### Movimento

| Peça | Abrindo | Fechando |
|---|---|---|
| véu (`dScrim`) | `pfFade .3s ease` | `pfFadeOut .22s ease forwards` |
| blur (`dBlur[].a`) | `pfBlurIn .5s cubic-bezier(.22,1,.36,1) both` | `pfBlurOut .22s ease forwards` |
| painel (`drawerAnim`) | `pfDrawerIn .45s cubic-bezier(.22,1,.36,1)` | `pfDrawerOut .22s ease forwards` |

```css
@keyframes pfDrawerIn  { from { transform: translateX(104%); } to { transform: none; } }
@keyframes pfDrawerOut { from { transform: none; } to { transform: translateX(104%); } }
```

Desmonta **220 ms** após `closeDrawer`. Esc: não tratado para o drawer.

### Medidas

Largura 420 máx.; inset 12; raio 44; cabeçalho `22/22/16/26`; corpo `22 26`; rodapé `16 22`; botões 40.

**Sheet** (folha inferior) não existe nestes arquivos.

---

## 17. Command palette (busca global ⌘K)

Dois exemplares: um **embutido** na seção Sobreposições (dentro da bandeja afundada) e um **flutuante** (z 105) aberto por ⌘K / Ctrl+K, pelo botão "Buscar" da sidebar/topbar ou `openCmd`.

### 17.1 Flutuante

```
sc-if cmdOpen → div.overlay (z 105; flex; justify-content:center; align-items:flex-start; padding: 14vh 24px 24px; click → closeCmd)
├─ div.veu  background:var(--veil); animation: pfFade .3s ease
├─ div.blur × 4 (blurLayers)
└─ div.painel (click → stop)
   ├─ div.cabecalho 56px → ic.search 16 (--tx3) · input · button "esc"
   ├─ div.lista (padding 8; column; gap 2; max-height 50vh; overflow auto)
   │  └─ por item: [span.grupo] + button.item
   └─ div.rodape 40px → "↵ abrir" · "esc fechar" · "⌘K" (margin-left:auto, mono)
```

```css
.painel   { position: relative; width: min(560px,100%); display: flex; flex-direction: column;
            background: var(--sf3) var(--grain); border: 1px solid var(--bd); box-shadow: var(--e3);
            border-radius: 36px; corner-shape: squircle; overflow: hidden; color: var(--tx);
            animation: pfRise .35s cubic-bezier(.22,1,.36,1); }
.cabecalho{ height: 56px; padding: 0 20px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--bd); }
input     { flex: 1; min-width: 0; border: 0; background: transparent; outline: none; color: var(--tx); font: 400 15px/1 Geist, sans-serif; }  /* autofocus */
.esc      { height: 24px; padding: 0 8px; border: 0; border-radius: 999px; background: var(--sf2);
            font-family: 'Geist Mono', monospace; font-size: 10.5px; color: var(--tx3); cursor: pointer; }
.grupo    { font-size: 11px; color: var(--tx3); padding: 8px 12px 4px; }
.item     { height: 42px; padding: 0 12px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 999px;
            background: r.bg;    /* primeiro resultado: var(--acs) | demais: transparent */
            color: var(--tx); font: 400 13px/1 Geist, sans-serif; cursor: pointer; text-align: left; }
.item:hover { background-color: var(--acs); }
.item > span:first-child { display: flex; width: 16px; height: 16px; color: var(--tx2); }
.item > span:nth-child(2) { flex: 1; }
.item > span:last-child   { font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--tx3); }
.rodape   { height: 40px; padding: 0 20px; display: flex; align-items: center; gap: 16px; border-top: 1px solid var(--bd); font-size: 11px; color: var(--tx3); }
```

Lógica: filtro por todas as palavras digitadas em `título + grupo`; cabeçalho de grupo aparece quando o grupo muda; primeiro resultado pré-realçado (`--acs`); Enter/setas **não implementados**. Esc fecha. Saída: sem animação (desmonta direto; o `l.a` das camadas de blur ainda carrega a curva de fechamento do modal se `closing` estiver ativo, o que normalmente não ocorre).

### 17.2 Embutido (seção)

Diferenças em relação ao flutuante: container de vidro em vez de papel sólido, sem rodapé, sem `max-height`.

```css
.painel   { width: min(560px,100%); display: flex; flex-direction: column;
            background: var(--glass); backdrop-filter: blur(24px) saturate(1.5); -webkit-backdrop-filter: blur(24px) saturate(1.5);
            border: 1px solid var(--gbd); box-shadow: var(--e3); border-radius: 36px; corner-shape: squircle; overflow: hidden; }
.cabecalho{ height: 52px; padding: 0 18px; gap: 10px; border-bottom: 1px solid var(--bd); }
input     { font: 400 14px/1 Geist, sans-serif; }
.esc      { height: 22px; padding: 0 8px; border-radius: 999px; background: var(--sf2); font-family: 'Geist Mono'; font-size: 10.5px; color: var(--tx3); display: flex; align-items: center; }  /* span, não botão */
.lista    { padding: 8px; column; gap: 2px; min-height: 120px; }
.item     { height: 40px; … (igual) }   /* data-press="ghost" */
```

Rótulo flutuante da bandeja: `position:absolute; left:28px; top:20px; 'Geist Mono' 11px --tx3` "Busca rápida · ⌘K".

### 17.3 Gatilhos de busca

Sidebar (expandida e mobile): `button[data-pop-trigger="1"]{height:34px;padding:0 12px;display:flex;align-items:center;gap:8px;border:0;border-radius:999px;background:var(--sf2);box-shadow:var(--deb);color:var(--tx3);font:400 12px/1 Geist;cursor:text;text-align:left;width:100%}` → ic.search 14 · "Buscar" (flex:1) · "⌘K" (mono 10).
Topbar: ver §23.

---

## 18. Toast

### 18.1 Toast simples (`toast` / `toastMsg`, `toastOf(msg)`)

Pílula carvão centralizada na base. Contrato: "pílula · máx 1 linha · base 28px · `--ac --acf --e3` · Sobe 16px em 300ms; some após 3,2s · role=status; não roubar foco".

```
sc-if toast → div.toast (fixed)
├─ span 16×16 color --ok → ic.checkCircle
├─ span {{ toastMsg }}
├─ button ghost "Abrir"
└─ button ghost fechar 28×28 → ic.x 14
```

```css
.toast  { position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); z-index: 110;
          display: flex; align-items: center; gap: 12px; padding: 10px 10px 10px 16px;
          animation: pfToast .3s cubic-bezier(.22,1,.36,1);
          background: var(--ac); color: var(--acf); box-shadow: var(--e3); border-radius: 999px; font-size: 13px; }
.abrir  { height: 28px; padding: 0 12px; border: 0; border-radius: 999px; background: rgba(255,255,255,.12); color: var(--acf);
          font: 500 12px/1 Geist, sans-serif; cursor: pointer; }   /* ghost */
.fechar { width: 28px; height: 28px; border: 0; border-radius: 999px; background: transparent; color: var(--acf); opacity: .6;
          display: flex; align-items: center; justify-content: center; cursor: pointer; }   /* ghost */
@keyframes pfToast { from { opacity: 0; transform: translate(-50%,16px); } to { opacity: 1; transform: translate(-50%,0); } }
```

Vida: aparece por **3200 ms** e desmonta sem animação de saída. Novo `toastOf` reinicia o timer e troca a mensagem. `role="status"`: declarado, não presente no DOM.

### 18.2 Pilha de toasts (`stk`) — simples, com ação, com promessa

Canto inferior direito; cada toast é uma pílula 54 px com ícone em quatro camadas sobrepostas (load / ok / err / info) que trocam por fade+spring, texto que re-anima quando a mensagem muda e um halo que pulsa ao resolver uma promessa.

```
sc-if stk.has → div.pilha (fixed; mouseenter/leave → stk.enter/leave)
└─ sc-for stk.items (mais novo primeiro, i = 0) → div.slot (absolute; transform/opacity/z por índice)
   └─ div.toast (animation t.anim)
      ├─ span.halo (absolute inset 0; color t.hc; animation t.halo)
      ├─ span.icone 18×18 (relative)
      │  ├─ span.L  spin14  color --acf
      │  ├─ span.O  ic.checkCircle 16  color --ok
      │  ├─ span.E  ic.alert 16        color --er
      │  └─ span.I  ic.info 16         color --in
      ├─ span.msg (animation t.ta)
      └─ button.fechar 30×30 → ic.x 14
```

```css
.pilha { position: fixed; right: 24px; bottom: 24px; z-index: 111; width: min(360px, calc(100vw - 48px)); height: 56px;
         padding-top: stk.hpad;   /* hover: (n−1)×62px | repouso: 0px */
         box-sizing: content-box; }
.slot  { position: absolute; left: 0; right: 0; bottom: 0;
         z-index: t.z;            /* 50 − i */
         transform: t.tf;         /* hover: translateY(−i×62px) | repouso: translateY(−i×9px) scale(1 − i×.045) */
         opacity: t.op;           /* saindo: 0 | repouso: i>2 ? 0 : 1 − i×.12 | hover: 1 */
         transform-origin: bottom center;
         transition: transform .6s cubic-bezier(.22,1,.36,1), opacity .5s cubic-bezier(.22,1,.36,1); }
.toast { position: relative; height: 54px; display: flex; align-items: center; gap: 12px; padding: 0 8px 0 16px;
         border-radius: 999px; background: var(--ac); color: var(--acf); box-shadow: var(--e3); font-size: 13px;
         animation: t.anim; }     /* entrando: pfToastIn .6s cubic-bezier(.22,1,.36,1) | saindo: pfToastOut .34s cubic-bezier(.4,0,.6,1) forwards */
.halo  { position: absolute; inset: 0; border-radius: 999px; pointer-events: none;
         color: t.hc;             /* err: var(--er) | demais: var(--ok) */
         animation: t.halo; }     /* após resolver promessa (v>0): pfHaloA|pfHaloB 1.1s cubic-bezier(.22,1,.36,1) | senão none */
.icone { position: relative; flex: none; width: 18px; height: 18px; }
.icone > span { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
         opacity: X.o;            /* camada ativa: 1 | demais: 0 */
         transform: scale(X.s) rotate(X.r);   /* ativa: scale(1) rotate(0deg) | inativa: scale(.4) rotate(load ? 90deg : -30deg) */
         transition: opacity .4s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.34,1.28,.64,1); }
.icone > span > span { display: flex; width: 14px (L) | 16px (O, E, I); height: idem; }
.msg   { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
         animation: t.ta; }       /* pfMsgA|pfMsgB .55s cubic-bezier(.22,1,.36,1) both — alterna A/B a cada mudança de mensagem para re-disparar */
.fechar{ flex: none; width: 30px; height: 30px; border: 0; border-radius: 999px; background: transparent; color: var(--acf); opacity: .6;
         display: flex; align-items: center; justify-content: center; cursor: pointer; }

@keyframes pfToastIn  { from { opacity: 0; transform: translateY(18px) scale(.96); } }
@keyframes pfToastOut { to   { opacity: 0; transform: translateY(10px) scale(.96); filter: blur(2px); } }
@keyframes pfMsgA     { from { opacity: 0; transform: translateY(8px); filter: blur(3px); } }   /* pfMsgB idêntico */
@keyframes pfHaloA    { 0% { box-shadow: 0 0 0 0 currentColor; opacity: .55; } 100% { box-shadow: 0 0 0 10px currentColor; opacity: 0; } }   /* pfHaloB idêntico */
```

Tipos (`kind`): `ok` (checkCircle, `--ok`), `info` (info, `--in`), `err` (alert, `--er`), `load` (ensō 14, `--acf`).

Ciclo de vida (`pushToast`, `promise`, `dismissToast`):

- Máximo **6** na pilha (`slice(-6)`); além do 3º visível (i>2) fica `opacity:0` em repouso.
- `ok/info/err` auto-dispensam em **5000 ms**; `load` não.
- Promessa: entra como `load` ("Exportando relatório…"); após **1900 ms** vira `ok` ("Relatório exportado · 2,4 MB", dispensa em 3500 ms) ou `err` ("Falha ao sincronizar · token expirado", 5000 ms). A troca incrementa `v` → halo pulsa e mensagem re-anima.
- Dispensar: `leaving:true` → `pfToastOut .34s` → remove após **340 ms**.
- Hover na pilha: expande (cada slot sobe 62 px, opacidade 1, container ganha `padding-top`), transição 600 ms Respiro.

Medidas: largura 360 máx.; toast 54 (slot 56); passo empilhado 9 px / escala −4.5 % por nível; passo expandido 62; margem 24.

---

## 19. Tabs

### 19.1 Tabs sublinhadas (`tabs`, indicador `data-ind="line"`)

```
div[data-slide="1"]  position:relative; display:flex; gap:24px; border-bottom:1px solid var(--bd); overflow-x:auto
├─ span[data-ind="line"]  background:var(--tx); border-radius:2px      (JS: height 2px, y = bottom − 2)
└─ button[data-on] × 4
   ├─ texto
   └─ span.barra (absolute; left 0; right 0; bottom −1px; height 2px; radius 2; background: t.bar = transparent)
```

```css
.tab { position: relative; z-index: 1; height: 36px; padding: 0; border: 0; background: transparent;
       color: t.fg;     /* ativa: var(--tx) | inativa: var(--tx3) */
       font: 500 13px/1 Geist, sans-serif; cursor: pointer; white-space: nowrap; }
```

A barra própria de cada tab fica sempre `transparent` (reserva do layout); quem sublinha é o `[data-ind="line"]` deslizando (550 ms Respiro em `transform` e `width`). Cor do texto pela transição universal. Hover: não especificado.

### 19.2 Tabs em pílula

Não há uma "tab pílula" separada: é o **segmentado papel** (§5.1). O contrato do manual junta os dois: "Abas & segmentado · pílula 30–40 · indicador deslizante · `--sf3 --sh1` ou linha 2px · Indicador desliza 550ms Respiro · role=tablist; setas trocam" (role/setas não implementados).

---

## 20. Breadcrumb

Seção Navegação:

```css
.trilha { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--tx3); }
.trilha .sep { display: flex; width: 12px; height: 12px; }     /* ic.chevronRight, herda --tx3 */
.trilha .atual { color: var(--tx); }
```

Topbar do manual (§23): mesma receita com `gap:8px; color:var(--tx2)`, separadores em `var(--tx4)`, primeiro nível "Identidade" `flex:none`, nível do grupo `flex:none; color:var(--tx3)`, último `min-width:0; overflow:hidden; text-overflow:ellipsis; color:var(--tx)`; o container tem `white-space:nowrap; overflow:hidden`.

---

## 21. Paginação

```
div.linha (space-between; gap 12; wrap)
├─ span "41–60 de 248 pedidos"  12px --tx3
└─ div[data-slide="1"] (flex; align center; gap 2)
   ├─ span[data-ind="1"]  background:var(--ac); box-shadow:var(--ink); border-radius:999px
   ├─ button.seta "Anterior" (ghost)
   ├─ button.pagina[data-on] × 5 (ghost)
   └─ button.seta "Próximo" (ghost)
```

```css
.seta   { width: 32px; height: 32px; border: 0; border-radius: 999px; background: transparent; color: var(--tx2);
          display: flex; align-items: center; justify-content: center; cursor: pointer; }
.seta:hover { background-color: var(--acs); }
.seta > span { display: flex; width: 14px; height: 14px; }   /* chevronLeft / chevronRight */
.pagina { position: relative; z-index: 1; width: 32px; height: 32px; border: 0; border-radius: 999px;
          background: p.bg;    /* sempre transparent */
          color: p.fg;         /* atual: var(--acf) | demais: var(--tx2) */
          font: 500 12px/1 'Geist Mono', monospace; cursor: pointer; }
```

Página atual = carvão `[data-ind]` (`--ac` + `--ink`) deslizando por baixo (550 ms); número vira `--acf`. Limites 1–5. Hover na página: não especificado (só `:active scale(.97)`).

---

## 22. Stepper (passos)

### 22.1 Horizontal (seção Navegação)

```
div.card (padding 20px 24px; flex; align center; gap 10; wrap)
├─ div.passo.feito   → span.bola 24 (ac/acf) > ic.check 12 · span "Conta" 12
├─ span.ligacao.feita   flex:1; min-width:20px; height:1px; background:var(--tx)
├─ div.passo.atual   → span.bola 24 (ac/acf; 11/500; box-shadow:0 0 0 4px var(--ring)) "2" · span "Integrações" 12/500
├─ span.ligacao.futura  flex:1; min-width:20px; height:0; border-top:1px dashed var(--bd2)
└─ div.passo.futuro (color --tx3) → span.bola 24 (sf2 + --deb; 11) "3" · span "Metas" 12
```

```css
.passo { display: flex; align-items: center; gap: 8px; }
.bola  { width: 24px; height: 24px; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
.bola.feito, .bola.atual { background: var(--ac); color: var(--acf); }
.bola.atual  { font-size: 11px; font-weight: 500; box-shadow: 0 0 0 4px var(--ring); }
.bola.futuro { background: var(--sf2); box-shadow: var(--deb); font-size: 11px; }
.bola.feito > span { display: flex; width: 12px; height: 12px; }
```

Estático (sem estado interativo).

### 22.2 Stepper do modal "Conectar plataforma" (`cn.steps`)

```css
.passo  { display: flex; align-items: center; gap: 8px; flex: 1; }
.bola   { flex: none; width: 22px; height: 22px; border-radius: 999px; font-size: 10.5px; font-weight: 600;
          display: flex; align-items: center; justify-content: center;
          background: t.bg;   /* feito/atual: var(--tx) | futuro: var(--sf2) */
          box-shadow: t.sh;   /* atual: 0 0 0 4px var(--ring) | feito: none | futuro: var(--deb) */
          color: t.fg;        /* feito/atual: var(--sf) | futuro: var(--tx3) */
          transition: all .51s cubic-bezier(.22,1,.36,1); }
.bola.feito > span { display: flex; width: 11px; height: 11px; }   /* ic.check; futuro/atual mostram o número */
.rotulo { font-size: 12px; white-space: nowrap; color: t.lbl; }     /* feito/atual: var(--tx) | futuro: var(--tx3) */
.ligacao{ flex: 1; height: 1px; background: t.lc; }                 /* feito: var(--tx) | demais: var(--bd2) */
```

Passo atual por etapa: `list→1, key→2, load→2, ok→3`. Transição de 510 ms Respiro em tudo.

---

## 23. Modal "Conectar plataforma" (fluxo do estado vazio)

Aberto por `openConnect` (CTA do estado vazio). Quatro etapas no mesmo painel: lista → credenciais → carregando → pronto. O corpo tem `data-morph="1"` (o motor do manual mede a altura antes/depois e anima a troca de conteúdo; detalhe de implementação, não CSS declarado).

```
sc-if cn.open → div.overlay (z 102; flex center; padding 24; click → cn.close)
├─ véu pfFade .3s ease · 4 blur (blurLayers)
└─ div.painel
   ├─ div.cabecalho (padding 22px 22px 16px 26px; column; gap 16; border-bottom 1px --bd)
   │  ├─ linha: span.titulo 18/500 ls −0.02em · button.fechar 32 ghost (hover --acs)
   │  └─ stepper §22.2 (flex; gap 8)
   └─ div.corpo[data-morph] (flex:1; overflow:auto; padding 16px 18px 20px)
      ├─ etapa lista [data-pop] (column; gap 12; animation popIn)
      │  ├─ div.busca 40px → ic.search 16 · input "Buscar plataforma"
      │  ├─ grid 2 colunas gap 8 → button.plataforma × 8
      │  └─ div[data-collapse][data-open=cn.empty] --g:12px → "Nenhuma plataforma com esse nome. <u>Pedir integração</u>"
      ├─ etapa credenciais [data-pop] (column; gap 14; popIn)
      │  ├─ avatar 44 squircle (cor da plataforma) + nome 15/500 + dica 12 --tx3
      │  ├─ label → "Token de acesso" 12/500 · campo 42px (ic.lock 16 + input mono 12.5px) · erro em [data-collapse] · ajuda 11 --tx3
      │  └─ rodapé: ghost "‹ Voltar" 38 · ink "Conectar" 38 (opacity cn.goOp)
      ├─ etapa carregando [data-pop] (padding 28px 0; centro; gap 14; popIn) → spin20 em 28×28 · "Conectando com X…" 14/500 · 12 --tx3
      └─ etapa pronto (padding 18px 0 4px; centro; gap 12; animation pfRise .4s Respiro) → ícone 56 --oks/--ok > ic.check 24 · 17/500 · 12 --tx2 · ink "Ir para o dashboard" 38
```

```css
.painel     { position: relative; width: min(480px,100%); max-height: calc(100vh - 48px); display: flex; flex-direction: column;
              background: var(--sf3) var(--grain); border: 1px solid var(--bd); box-shadow: var(--e3);
              border-radius: 40px; corner-shape: squircle; color: var(--tx); overflow: hidden;
              animation: pfRise .42s cubic-bezier(.22,1,.36,1); }
.busca      { height: 40px; padding: 0 14px; display: flex; align-items: center; gap: 8px; border-radius: 999px;
              background: var(--sf2); box-shadow: var(--deb); color: var(--tx3); }
.busca input{ flex: 1; min-width: 0; border: 0; background: transparent; outline: none; color: var(--tx); font: 400 13px/1 Geist, sans-serif; }
.plataforma { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--bd); border-radius: 24px; corner-shape: squircle;
              background: var(--sf) var(--grain); box-shadow: var(--sh1); color: var(--tx); cursor: pointer; text-align: left; font-family: Geist, sans-serif;
              transition: box-shadow .3s cubic-bezier(.22,1,.36,1), transform .3s cubic-bezier(.22,1,.36,1); }
.plataforma:hover { box-shadow: var(--e2); transform: translateY(-1px); }
.plataforma .ini { flex: none; width: 34px; height: 34px; border-radius: 17px; corner-shape: squircle; background: p.col; color: #fff;
              display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; }
.plataforma .n { font-size: 13px; font-weight: 500; }  .plataforma .c { font-size: 11px; color: var(--tx3); }
.campo-token{ height: 42px; padding: 0 16px; display: flex; align-items: center; gap: 8px; border-radius: 999px; background: var(--sf2);
              box-shadow: cn.keyRing; }   /* erro: var(--deb), 0 0 0 1px var(--er) | normal: var(--deb) */
.campo-token input { flex: 1; min-width: 0; border: 0; background: transparent; outline: none; color: var(--tx); font: 400 12.5px/1 'Geist Mono', monospace; }
.erro       { font-size: 11px; color: var(--er); }
.voltar     { height: 38px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent; color: var(--tx2);
              font: 500 13px/1 Geist, sans-serif; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }   /* ghost */
.conectar   { height: 38px; padding: 0 18px; border: 0; border-radius: 999px; background: var(--ac); color: var(--acf); box-shadow: var(--ink);
              font: 500 13px/1 Geist, sans-serif; cursor: pointer;
              opacity: cn.goOp;   /* token ≥ 8 chars: 1 | senão: .4 */
              transition: opacity .34s cubic-bezier(.22,1,.36,1); }   /* ink */
.pronto .icone { width: 56px; height: 56px; border-radius: 28px; corner-shape: squircle; background: var(--oks); color: var(--ok); }
.pronto .titulo{ font: 500 17px/1.3 Geist, sans-serif; }
.pronto .corpo { font-size: 12px; color: var(--tx2); max-width: 300px; line-height: 1.5; }
```

Cores das plataformas (`p.col`, literais): Hotmart `#f04e23`, Kiwify `#2bb673`, Eduzz `#0d47a1`, Shopify `#5e8e3e`, Yampi `#6c2bd9`, Nuvemshop `#2c3357`, Monetizze `#00a19a`, Stripe `#635bff`.
Fluxo: "Conectar" com token iniciado em "erro" → `cnErr` (anel vermelho + mensagem colapsável); senão `load` por **1600 ms** → `ok`; "Ir para o dashboard" fecha e dispara toast "X conectada · importando 90 dias". Sem animação de saída.

---

## 24. Sidebar

"A sidebar é uma folha erguida, solta da borda por 16px. O item ativo é uma folha pousada dentro dela."

### 24.1 Expandida (248 px)

```
div.sidebar
├─ div.conta (flex; align center; gap 10; padding 4px 6px)
│  ├─ span.logo 36 squircle (ac/acf/ink) "墨" 15px
│  ├─ div (flex:1; column; gap 2) → "Loja Aurora" 13/600 · "Plano Pro" 11 --tx3
│  └─ span 14×14 --tx3 → ic.chevronUpDown
├─ button.busca (§17.3)
├─ div[data-slide="1"] (column; gap 2)
│  ├─ span[data-ind="1"]
│  └─ button.item[data-on] × 5 (Dashboard, Funil, Vendas ·3, Fontes, Relatórios)
├─ div.divisor  height:1px; background:var(--bd); margin:0 8px
└─ div.usuario (flex; align center; gap 10; padding 2px 6px)
   ├─ span.avatar 32 (v1/#fff; 12/500) "AS"
   ├─ div (flex:1; min-width 0; column; gap 2) → "Ana Souza" 12/500 · e-mail 11 --tx3 ellipsis
   └─ span 16×16 --tx3 → ic.settings
```

```css
.sidebar   { width: 248px; padding: 16px 12px; display: flex; flex-direction: column; gap: 18px;
             background: var(--sf) var(--grain); border: 1px solid var(--bd); box-shadow: var(--e2);
             border-radius: 44px; corner-shape: squircle; }
.logo      { width: 36px; height: 36px; border-radius: 18px; corner-shape: squircle; background: var(--ac); color: var(--acf);
             box-shadow: var(--ink); display: flex; align-items: center; justify-content: center; font-size: 15px; }
[data-ind] { background: var(--sf3) var(--grain); border: 1px solid var(--bd); box-shadow: var(--sh1); border-radius: 999px; }
.item      { position: relative; z-index: 1; height: 36px; padding: 0 12px; display: flex; align-items: center; gap: 10px;
             border: 1px solid n.bd;   /* sempre transparent (reserva 1px para casar com a borda do [data-ind]) */
             border-radius: 999px;
             background: n.bg;         /* sempre transparent */
             box-shadow: n.sh;         /* sempre none */
             color: n.fg;              /* ativo: var(--tx) | inativo: var(--tx2) */
             font: 400 13px/1 Geist, sans-serif;
             font-weight: n.fw;        /* ativo: 500 | inativo: 400 */
             cursor: pointer; text-align: left;
             transition: background .3s cubic-bezier(.22,1,.36,1), box-shadow .3s cubic-bezier(.22,1,.36,1); }
.item:hover { color: var(--tx); }
.item > span:first-child { display: flex; width: 16px; height: 16px; }
.item > span:nth-child(2) { flex: 1; }
.item .selo { height: 18px; min-width: 18px; padding: 0 5px; border-radius: 999px; background: var(--shu); color: #fff;
              font-size: 10px; font-weight: 600; display: flex; align-items: center; justify-content: center; }
.avatar    { width: 32px; height: 32px; border-radius: 999px; background: var(--v1); color: #fff;
             display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 500; }
```

Estados do item: inativo `--tx2`/400; hover `--tx`; ativo `--tx`/500 sobre a folha `[data-ind]` (`--sf3` + grain + borda `--bd` + `--sh1`) que desliza 550 ms Respiro. Ativo inicial: Dashboard.

### 24.2 Compacta (68 px)

```
div.sidebar-compacta (position:relative)
├─ span.logo 40 squircle (raio 20) "墨" margin-bottom:10px
├─ div[data-slide="1"] (column; align center; gap 6)
│  ├─ span[data-ind="1"]  (mesmo visual da expandida)
│  └─ button.item[data-tipwrap][data-on] × 5  44×44
│     ├─ span 18×18 → ícone
│     ├─ [se badge] span.ponto 7×7
│     └─ span[data-tip] (§12.2)
└─ span.avatar 32 (11/500) margin-top:24px
```

```css
.sidebar-compacta { position: relative; width: 68px; padding: 16px 10px; display: flex; flex-direction: column; align-items: center; gap: 6px;
                    background: var(--sf) var(--grain); border: 1px solid var(--bd); box-shadow: var(--e2);
                    border-radius: 34px; corner-shape: squircle; }
.item   { position: relative; z-index: 1; width: 44px; height: 44px; border: 0; border-radius: 999px; background: transparent;
          color: n.fg;   /* ativo: var(--tx) | inativo: var(--tx2) */
          display: flex; align-items: center; justify-content: center; cursor: pointer; }
.ponto  { position: absolute; top: 9px; right: 9px; width: 7px; height: 7px; border-radius: 9px; background: var(--shu); box-shadow: 0 0 0 2px var(--sf); }
```

Rótulo via `aria-label` + tooltip `[data-tip]` à direita (`left:54px`). Folha ativa desliza verticalmente (44×44).

### 24.3 Mobile (gaveta) — vive na seção `responsivo`, incluída por completude

```
sc-if mSide → div.overlay (absolute no quadro do celular; inset 0; z 5; click → closeMSide)
├─ div.veu   background:var(--veil); animation:pfFade .3s ease
├─ div.blur  backdrop-filter:blur(10px) saturate(.85); animation:pfBlurIn .45s cubic-bezier(.22,1,.36,1) both
└─ div.gaveta (click → stop)
   ├─ button.fechar (absolute; top 18; right 12; z 2; 32×32; bg --sf2; --tx2) → ic.x 14
   └─ mesmo conteúdo da sidebar expandida (conta, busca, itens, …)
```

```css
.gaveta { position: absolute; top: 10px; left: 10px; bottom: 10px; width: min(280px, 82%); padding: 16px 12px;
          display: flex; flex-direction: column; gap: 18px; overflow: auto;
          background: var(--sf3) var(--grain); border: 1px solid var(--bd); box-shadow: var(--e3);
          border-radius: 44px; corner-shape: squircle;
          animation: pfSideIn .6s cubic-bezier(.22,1,.36,1); }
@keyframes pfSideIn { from { transform: translateX(-104%); } to { transform: none; } }
```

Sem animação de saída.

---

## 25. Tab bar mobile (shoji)

Barra de vidro flutuando 12 px acima da base; o item ativo recebe folha `--acs` deslizante e o ícone "sobe" com spring.

```
div.quadro (position:relative; height 150; raio 36 squircle; bg --sf grain; border --bd; overflow hidden)
├─ div.placeholder (absolute; inset 16px 20px; column; gap 8; opacity .6) → 3 linhas skeleton estáticas
├─ div[data-slide="1"].barra
│  ├─ span[data-ind="1"]  background:var(--acs); box-shadow:inset 0 0 0 1px var(--bd); border-radius:999px
│  └─ button.item[data-on] × 4 (Início, Funil, Vendas, Perfil)
│     ├─ span.icone 20×20 (transform t.itf)
│     └─ rótulo
└─ span.legenda (absolute; right 24; top 14; mono 10 --tx3) "Barra mobile · shoji"
```

```css
.barra { position: absolute; left: 12px; right: 12px; bottom: 12px; height: 64px; padding: 6px;
         display: flex; justify-content: space-around; align-items: center; border-radius: 999px;
         background: var(--glass); backdrop-filter: blur(24px) saturate(1.4); -webkit-backdrop-filter: blur(24px) saturate(1.4);
         border: 1px solid var(--gbd); box-shadow: var(--e2); }
.item  { position: relative; z-index: 1; flex: 1; height: 52px; border: 0; border-radius: 999px;
         background: t.bg;   /* sempre transparent */
         display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
         color: t.fg;        /* ativo: var(--tx) | inativo: var(--tx3) */
         font: 400 10px/1 Geist, sans-serif;
         font-weight: t.fw;  /* ativo: 600 | inativo: 400 */
         cursor: pointer;
         transition: background .42s cubic-bezier(.22,1,.36,1), color .42s cubic-bezier(.22,1,.36,1); }
.icone { display: flex; width: 20px; height: 20px;
         transform: t.itf;   /* ativo: translateY(-1px) scale(1.08) | inativo: none */
         transition: transform .6s cubic-bezier(.34,1.22,.64,1); }
```

Movimento: folha 550 ms Respiro; cor 420 ms; ícone 600 ms Folha. Ativo inicial: Início.

---

## 26. Shell do manual: sidebar e topbar

Exemplo vivo das receitas de sidebar e topbar aplicado ao próprio manual.

### 26.1 Layout raiz

```css
.raiz  { background: var(--bg) var(--grain); color: var(--tx); min-height: 100vh; display: flex; align-items: flex-start;
         transition: background .51s cubic-bezier(.22,1,.36,1); }
main   { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.conteudo { padding: 0 40px 120px; max-width: 1240px; width: 100%; display: flex; flex-direction: column; }
.pagina   { display: flex; flex-direction: column; animation: pfItemA .6s cubic-bezier(.22,1,.36,1) both; }   /* cada página do manual ao montar */
@keyframes pfItemA { from { opacity: 0; transform: translateY(8px); } }   /* pfItemB idêntico (alternância para re-disparar) */
```

Seções: `main section[id]{content-visibility:auto;contain-intrinsic-size:auto 1100px}` e `main section[id]:has([data-pop]), main section[id]:focus-within{content-visibility:visible}`; cada `<section>` tem `padding:40px 0 56px; gap:28px; scroll-margin-top:90px`.

### 26.2 Sidebar do manual (nav sticky, 232 px)

```
nav
├─ div.marca (flex; align center; gap 10)
│  ├─ div.logo 28 squircle raio 9 (ac/acf/ink; 400 14px) "墨"
│  └─ div (column; gap 2) → "Identidade" 13/600 · "sistema de design · v1.0" mono 10 --tx3
├─ div.busca 36px (ic.search 14 + input "Achar componente")
├─ [navSearching] div (column; gap 2; margin-top −10) → a.resultado × n
└─ [navIdle] sc-for navGroups → div.grupo (column; gap 2)
   ├─ span.titulo-grupo  11px --tx3; padding 0 8px 6px
   └─ a.link[data-navlink] × n → span.numero (mono 10 --tx4; width 18) + rótulo
```

```css
nav     { position: sticky; top: 16px; flex: 0 0 232px; height: calc(100vh - 32px); margin: 16px 0 16px 16px; overflow: auto;
          padding: 22px 14px; display: flex; flex-direction: column; gap: 22px;
          background: var(--sf) var(--grain); border: 1px solid var(--bd); border-radius: 56px; corner-shape: squircle;
          box-shadow: var(--e2);   /* declarado duas vezes; a última (--e2) vence sobre --sh1 */
          z-index: 30; }
nav > * { flex-shrink: 0; }
.busca  { height: 36px; padding: 0 12px; display: flex; align-items: center; gap: 8px; border-radius: 999px;
          background: var(--sf2); box-shadow: var(--deb); color: var(--tx3); }
.busca input { flex: 1; min-width: 0; border: 0; background: transparent; outline: none; color: var(--tx); font: 400 12px/1 Geist, sans-serif; }
.resultado { display: flex; align-items: center; height: 30px; padding: 0 10px; border-radius: 999px; color: var(--tx); font-size: 13px;
          transition: background .3s cubic-bezier(.22,1,.36,1); }
.resultado:hover { background-color: var(--acs); }
.link   { display: flex; align-items: center; gap: 8px; height: 30px; padding: 0 8px; border-radius: 999px; font-size: 13px;
          color: it.fg;              /* ativo: var(--tx)  | inativo: var(--tx2) */
          background-color: it.bg;   /* ativo: var(--sf3) | inativo: transparent */
          box-shadow: it.sh;         /* ativo: var(--sh1) | inativo: none */ }
.link:hover { background-color: var(--acs); color: var(--tx); }
.link .numero { font-family: 'Geist Mono', monospace; font-size: 10px; color: var(--tx4); width: 18px; }
```

Diferença da receita de produto (§24.1): aqui **não** há `[data-ind]`; o link ativo pinta a si mesmo (`--sf3` + `--sh1`) e a troca usa a transição universal (.55 s). Ativo = seção visível (IntersectionObserver `setupSpy`) ou página corrente.

### 26.3 Topbar (vidro, sticky)

```
div.topbar
├─ div.breadcrumb (flex:1; min-width 0; §20)
└─ div.acoes (flex:none; flex; align center; gap 12)
   ├─ button.buscar  (ic.search 14 · "Buscar" · kbd "⌘K")
   ├─ button.aovivo  (liveDot · "Ao vivo"/"Pausado")
   └─ toggle de tema (§6)
```

```css
.topbar { position: sticky; top: 16px; z-index: 20; margin: 16px 16px 0 24px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 8px 8px 8px 20px;
          background: var(--glass); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
          border: 1px solid topBd;   /* rolado: var(--bd) | topo: transparent */
          border-radius: 999px;
          box-shadow: topSh;         /* rolado: var(--e2) | topo: 0 0 0 0 rgba(0,0,0,0),0 0 0 0 rgba(0,0,0,0),0 0 0 0 rgba(0,0,0,0),0 0 0 0 rgba(0,0,0,0),inset 0 0 0 0 rgba(0,0,0,0) */
          transform: topTf;          /* rolado: translateY(-2px) | topo: none */
          transition: box-shadow .7s cubic-bezier(.22,1,.36,1), border-color .6s cubic-bezier(.22,1,.36,1),
                      transform .7s cubic-bezier(.22,1,.36,1), background-color .6s cubic-bezier(.22,1,.36,1); }

.buscar { height: 34px; padding: 0 6px 0 12px; display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--bd);
          background: var(--sf2); box-shadow: var(--deb); color: var(--tx3); border-radius: 999px;
          font: 400 12px/1 Geist, sans-serif; cursor: pointer; white-space: nowrap; }
.buscar > span:first-child { display: flex; width: 14px; height: 14px; }
.buscar kbd { height: 22px; padding: 0 7px; border-radius: 999px; background: var(--sf3); box-shadow: var(--sh1);
          font-family: 'Geist Mono', monospace; font-size: 10px; color: var(--tx2); display: flex; align-items: center; }

.aovivo { height: 34px; padding: 0 14px 0 12px; display: inline-flex; align-items: center; gap: 10px; border: 1px solid var(--bd);
          background: var(--sf) var(--grain); color: var(--tx2); border-radius: 999px; font: 500 12px/1 Geist, sans-serif;
          cursor: pointer; white-space: nowrap; overflow: visible; }
.aovivo > span:first-child { display: flex; padding: 2px; }
/* liveDot */
.dot      { position: relative; width: 8px; height: 8px; display: inline-flex; }
.dot .ping{ position: absolute; inset: 0; border-radius: 99px; background: var(--ok); animation: pfPing 1.6s ease-out infinite; }  /* só quando ao vivo */
.dot .core{ position: relative; width: 8px; height: 8px; border-radius: 99px; background: var(--ok) | var(--tx4) (pausado); }
@keyframes pfPing { 0% { transform: scale(1); opacity: .6; } 100% { transform: scale(2.6); opacity: 0; } }
```

Estado "rolado": `window.scrollY > 12` (listener passivo). A sombra "zero" tem exatamente 5 termos para casar com `--e2` e permitir interpolar o `box-shadow` em 700 ms.

### 26.4 Paginação do manual (rodapé de seção)

```css
nav.paginacao { display: flex; gap: 12px; flex-wrap: wrap; padding: 48px 0 0; margin-top: 24px; border-top: 1px solid var(--bd); }
a.card  { flex: 1; min-width: 200px; padding: 18px 22px; border-radius: 32px; corner-shape: squircle;
          background: var(--sf) var(--grain); border: 1px solid var(--bd); box-shadow: var(--sh1);
          display: flex; flex-direction: column; gap: 6px; text-align: left | right; }
a.card:hover { box-shadow: var(--e2); transform: translateY(-1px); }
a.card > span:first-child { font-size: 11px; color: var(--tx3); }      /* "← Anterior · Componentes" */
a.card > span:last-child  { font: 500 17px/1.2 Geist, sans-serif; letter-spacing: -0.015em; }
```

---

## 27. Cabeçalho de seção (padrão repetido)

```css
.eyebrow { font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--tx3); }     /* "15 — Componentes" */
h2       { margin: 0; font: 500 32px/1.1 Geist, sans-serif; letter-spacing: -0.03em; }
p.lead   { margin: 0; color: var(--tx2); max-width: 580px; line-height: 1.55; }
```

Grades das seções: controles `repeat(auto-fit,minmax(280px,1fr)) gap 16` (switch/checkbox/radio) e `minmax(300px,1fr)` (slider/segmentado); feedback `minmax(300px,1fr) gap 12` (alertas) e `minmax(280px,1fr) gap 16`; sobreposições `minmax(280px,1fr) gap 16`, cards com `min-height:240px`; navegação é `display:flex; gap:20px; wrap` dentro da bandeja afundada (`padding:24px`).

---

## 28. Pendências e placeholders não resolvidos

- **Nenhum placeholder ficou sem resolver** — todos os `{{ … }}` destes arquivos foram mapeados em `dc.src`.
- Não existem nestes arquivos: **Banner** (seção `mais`), **Estado de erro com retry** (seção `padroes`), **Progress ring**, **Sheet** inferior, **Tabs pílula** como componente próprio (é o segmentado). A **gaveta mobile** foi incluída a partir da seção `responsivo` porque completa a família da sidebar.
- Declarado no manual mas **ausente no DOM/CSS** do demo: tooltip com 400 ms de atraso; `role="status"` no toast; `role="tablist"` + setas nas abas; foco preso e `aria-modal` no modal; navegação por teclado na command palette; modal "máx 480" (o demo usa 440).
- `:focus-visible` não tem estilo em lugar nenhum (apenas o `[data-tipwrap]:focus-visible` mostra o tooltip). Estados `disabled` só aparecem no checkbox (`opacity:.45`) e no botão "Conectar" (`opacity:.4`).
- `style1.css` (manual) e `origem/base.css` (distribuível) divergem em dois pontos: o indicador deslizante em `origem/base.css` também transiciona `height .55s`; `[data-reveal]` usa .75 s no manual e .9 s em `origem/base.css`. Os keyframes são os mesmos com prefixo `pf*` → `sumi*`.
