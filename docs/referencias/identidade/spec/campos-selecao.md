# Identidade — Campos, datas/máscaras e seleção (spec CSS extraída do DOM)

Fonte: DOM renderizado de `sections/17-campos.html`, `18-avancados.html`, `19-selecao.html`; lógica em `dc.src`; CSS global em `style1.css`; tokens em `origem/base.css`.
Tudo abaixo é transcrição literal dos atributos `style="…"` e do código que resolve os placeholders `{{ … }}`. Onde o arquivo não define um valor, está escrito **não especificado**.

Convenções do DOM-fonte que viram pseudo-classes:

| Atributo no DOM | Equivale a |
|---|---|
| `style-hover="…"` | `:hover` |
| `style-focus="…"` | `:focus` |
| `style-focus-within="…"` | `:focus-within` |
| `data-press="ink|sheet|ghost"` | física de toque (ver §0.3) |
| `data-pop="1"` | superfície flutuante (fecha em `pointerdown` fora; ver §0.6) |
| `data-pop-trigger="1"` | gatilho de popover (clique nele não dispara fechamento global) |
| `data-collapse` + `data-open` | colapso animado (ver §0.4) |
| `data-slide` + `data-ind` | indicador deslizante (ver §0.5) |
| `data-lbl` | rótulo de botão com ellipsis (ver §0.3) |
| `data-morph` | crossfade de conteúdo com ghost (ver §0.7) |

Tipografia base: `html,body { font-family: Geist, -apple-system, sans-serif; font-size: 13px; -webkit-font-smoothing: antialiased }`. `* { box-sizing: border-box }`. Mono: `'Geist Mono', monospace`.

---

## 0. Física global (vale para todos os componentes)

### 0.1 Tokens usados nestas seções (`origem/base.css`)

| Token | Papel (light) | Carvão (dark) |
|---|---|---|
| `--bg` | `#f6f4ef` | `#161411` |
| `--sf` | `#fffefb` | `#1f1c18` |
| `--sf2` | `#f1eee7` (campo cavado) | `#14120f` |
| `--sf3` | `#ffffff` (folha erguida) | `#27231e` |
| `--bd` | `#e7e3da` | `#2d2923` |
| `--bd2` | `#d7d1c4` | `#3f3930` |
| `--tx` | `#1d1b18` | `#f6f1e4` |
| `--tx2` | `#67625a` | `#b3a98f` |
| `--tx3` | `#8f897f` | `#80786a` |
| `--tx4` | `#c3bcad` (desabilitado) | `#544d40` |
| `--ac` | `#1d1b18` | `#f3efe6` |
| `--ach` | `#34312c` | `#ffffff` |
| `--acf` | `#fffefb` | `#161411` |
| `--acs` | `rgba(29,27,24,.06)` (hover/selecionado) | `rgba(243,239,230,.07)` |
| `--ring` | `rgba(29,27,24,.14)` | `rgba(243,239,230,.18)` |
| `--ok` / `--oks` | `#3f8a63` / `rgba(63,138,99,.12)` | `#6fb690` / `rgba(111,182,144,.15)` |
| `--er` / `--ers` | `#cf3f28` / `rgba(207,63,40,.10)` | `#f0644c` / `rgba(240,100,76,.15)` |
| `--wa` / `--was` | `#a56f2c` / `rgba(201,138,60,.14)` | `#e0ac6a` / `rgba(224,172,106,.16)` |
| `--in` / `--ins` | `#45689f` / `rgba(90,130,194,.12)` | `#8fabdc` / `rgba(143,171,220,.16)` |
| `--glass` | `rgba(250,247,240,.62)` | `rgba(31,28,24,.62)` |
| `--gbd` | `rgba(255,255,255,.45)` | `rgba(255,255,255,.035)` |
| `--sh1` | `0 0 0 .5px rgba(29,27,24,.06),0 1px 1px rgba(29,27,24,.05),0 2px 3px -2px rgba(29,27,24,.10),0 0 0 0 rgba(0,0,0,0),inset 0 .5px 0 rgba(255,255,255,.55)` | `0 0 0 .5px rgba(0,0,0,.5),0 1px 1px rgba(0,0,0,.4),0 2px 3px -2px rgba(0,0,0,.5),0 0 0 0 rgba(0,0,0,0),inset 0 .5px 0 rgba(255,255,255,.018)` |
| `--e2` | `0 0 0 .5px rgba(29,27,24,.06),0 1px 1px rgba(29,27,24,.06),0 5px 6px -4px rgba(29,27,24,.12),0 14px 18px -14px rgba(29,27,24,.20),inset 0 .5px 0 rgba(255,255,255,.55)` | `0 0 0 .5px rgba(0,0,0,.5),0 1px 1px rgba(0,0,0,.45),0 5px 6px -4px rgba(0,0,0,.55),0 14px 18px -14px rgba(0,0,0,.7),inset 0 .5px 0 rgba(255,255,255,.022)` |
| `--e3` | `0 0 0 .5px rgba(29,27,24,.06),0 2px 2px rgba(29,27,24,.06),0 12px 14px -10px rgba(29,27,24,.18),0 32px 40px -28px rgba(29,27,24,.34),inset 0 .5px 0 rgba(255,255,255,.55)` | `0 0 0 .5px rgba(0,0,0,.5),0 2px 2px rgba(0,0,0,.45),0 12px 14px -10px rgba(0,0,0,.6),0 32px 40px -28px rgba(0,0,0,.8),inset 0 .5px 0 rgba(255,255,255,.026)` |
| `--deb` (cavado) | `inset 0 1px 2px rgba(29,27,24,.08),inset 0 0 0 .5px rgba(29,27,24,.03),0 .5px 0 rgba(255,255,255,.4)` | `inset 0 1px 2px rgba(0,0,0,.5),inset 0 0 0 .5px rgba(0,0,0,.3),0 1px 0 rgba(255,255,255,.04)` |
| `--ink` (tinta) | `inset 0 .5px 0 rgba(255,255,255,.07),0 1px 1px rgba(29,27,24,.12),0 2px 3px -2px rgba(29,27,24,.14)` | `inset 0 .5px 0 rgba(255,255,255,.18),0 1px 1px rgba(0,0,0,.4),0 2px 3px -2px rgba(0,0,0,.4)` |
| `--inkp` (tinta pressionada) | `inset 0 1px 1.5px rgba(0,0,0,.28),0 0 0 rgba(0,0,0,0)` | `inset 0 1px 2px rgba(0,0,0,.3),0 0 0 rgba(0,0,0,0)` |
| `--grain` | SVG `feTurbulence` fractalNoise baseFrequency .85, 3 oitavas, 180×180, alpha .14 | mesmo, alpha .05, cor clara |
| `--v1…--v4` | `#3c64c8`, `#2f9c98`, `#e0843a`, `#8a6fd6` (avatares) | `#7d9ef2`, `#5cc4bf`, `#f0a464`, `#a993ec` |

Escalas nomeadas em `origem/base.css` (os HTMLs usam os valores literais, não as vars): `--space-1:4px … --space-16:64px`; `--r-pill:999px; --r-sm:18px; --r-md:28px; --r-lg:36px; --r-xl:44px; --r-2xl:56px`; `--h-sm:28px; --h-md:36px; --h-lg:44px; --h-field:40px`; `--ease:cubic-bezier(.22,1,.36,1)` (Respiro), `--ease-move:cubic-bezier(.65,0,.35,1)` (Maré), `--ease-spring:cubic-bezier(.34,1.22,.64,1)` (Folha), `--ease-out:cubic-bezier(.4,0,.6,1)` (Saída); `--t-instant:100ms; --t-fast:300ms; --t-base:450ms; --t-slow:600ms; --t-deliberate:700ms; --t-default:550ms`.

### 0.2 Transição universal (`style1.css`)

```css
*, *::before, *::after {
  transition-property: background-color, border-color, color, box-shadow, transform, opacity, filter, outline-color;
  transition-duration: .55s;
  transition-timing-function: cubic-bezier(.22,1,.36,1);
}
input, textarea { transition-property: background-color, border-color, color, box-shadow; }
[data-instant], [data-instant] * { transition: none !important; }
a, button { -webkit-tap-highlight-color: transparent; }
@media (prefers-reduced-motion: reduce) { * { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
main section[id] { content-visibility: auto; contain-intrinsic-size: auto 1100px; }
main section[id]:has([data-pop]), main section[id]:focus-within { content-visibility: visible; }
```

Consequência: toda troca de `background`, `border-color`, `box-shadow` (anel de foco, anel de erro), `color`, `opacity`, `transform` que não declare transição própria escoa em **550 ms Respiro**.

### 0.3 Toque — `[data-press]`

```css
[data-press] { white-space: nowrap; max-width: 100%;
  transition: transform .45s cubic-bezier(.22,1,.36,1), box-shadow .5s cubic-bezier(.22,1,.36,1), filter .45s cubic-bezier(.22,1,.36,1), background .45s cubic-bezier(.22,1,.36,1); }
[data-press]:active { transition-duration: .1s; }
[data-press="ink"]:active   { transform: translateY(1px) scale(.97) !important; box-shadow: var(--inkp) !important; filter: brightness(.88); }
[data-press="sheet"]:hover  { box-shadow: var(--e2) !important; transform: translateY(-1px); }
[data-press="sheet"]:active { transform: translateY(1px) scale(.98) !important; box-shadow: var(--deb) !important; }
[data-press="ghost"]:active { transform: scale(.97); }
[data-press] > span:not([data-lbl]) { flex: none; }
[data-lbl] { display: inline-block; flex: 0 1 auto; min-width: 0; max-width: 100%; vertical-align: top; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
```

### 0.4 Colapso — `[data-collapse]`

```css
[data-collapse] { display: grid; grid-template-rows: 0fr; opacity: 0; margin-top: calc(var(--g,0px) * -1); filter: blur(2px);
  transition: grid-template-rows .6s cubic-bezier(.22,1,.36,1), opacity .45s cubic-bezier(.22,1,.36,1), margin-top .6s cubic-bezier(.22,1,.36,1), filter .5s cubic-bezier(.22,1,.36,1); }
[data-collapse][data-open="true"] { grid-template-rows: 1fr; opacity: 1; margin-top: 0; filter: none; }
[data-collapse] > * { overflow: hidden; min-height: 0; }
```
`--g` = o `gap` do pai (6px no grupo de campo, 2px em listas) para que o bloco fechado não ocupe o gap.

### 0.5 Indicador deslizante — `[data-slide] > [data-ind]`

```css
[data-ind] { position: absolute; left: 0; top: 0; opacity: 0; pointer-events: none; will-change: transform, width; }
[data-slide][data-ready] > [data-ind] { transition: transform .55s cubic-bezier(.22,1,.36,1), width .55s cubic-bezier(.22,1,.36,1), opacity .3s; }
```
JS (dc.src L136): acha o filho `[data-on="true"]`, aplica no indicador `width = offsetWidth`, `height = offsetHeight`, `transform: translate(offsetLeft px, offsetTop px)`, `opacity: 1`; `data-ready` é setado após 2 `requestAnimationFrame` (a primeira posição não anima).

### 0.6 Popovers — abertura, flip e fechamento

Keyframes (`style1.css`):

```css
@keyframes pfPop    { from { opacity: 0; transform: translateY(-6px) scale(.985); } to { opacity: 1; transform: none; } }   /* abre para baixo */
@keyframes pfPopUp  { from { opacity: 0; transform: translateY(4px)  scale(.98);  } to { opacity: 1; transform: none; } }   /* abre para cima */
@keyframes pfPopOut { to   { opacity: 0; transform: translateY(-4px) scale(.985); filter: blur(1px); } }                     /* saída */
@keyframes pfRise   { from { opacity: 0; transform: translateY(10px) scale(.975); } to { opacity: 1; transform: none; } }
@keyframes pfItemA  { from { opacity: 0; transform: translateY(8px); } }   /* pfItemB é idêntico; alternam só para re-disparar */
@keyframes pfPopI   { 0% { transform: scale(1); } 40% { transform: scale(1.22); } 100% { transform: scale(1); } }
@keyframes pfSpin   { to { transform: rotate(360deg); } }
@keyframes pfShimmer{ 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
```

Valores resolvidos dos placeholders:

| Placeholder | Valor |
|---|---|
| `{{ popIn }}` | aberto: `pfPop .38s cubic-bezier(.22,1,.36,1)` · fechando: `pfPopOut .24s cubic-bezier(.4,0,.6,1) forwards` |
| `{{ dpPos }}` (seção 18) | para baixo: `top:70px; bottom:auto; transform-origin:top left; animation: pfPop .38s …` · para cima: `top:auto; bottom:calc(100% - 14px); transform-origin:bottom left; animation: pfPopUp .38s cubic-bezier(.22,1,.36,1)` · fechando: `pfPopOut .24s cubic-bezier(.4,0,.6,1) forwards` |
| `{{ dd.pos }}` (variações de dropdown) | para baixo: `top:calc(100% + 6px); bottom:auto; pfPop .38s` · para cima: `top:auto; bottom:calc(100% + 6px); pfPopUp .38s` · fechando: `pfPopOut .24s … forwards` (mantém a posição) |
| `{{ cs.pos }}` (país/bandeira/moeda) | idêntico a `dd.pos` |

Decisão de flip (medida no `pointerdown` do gatilho, `r = getBoundingClientRect()`):

| Componente | Altura estimada `h` | Vira para cima quando |
|---|---|---|
| Date picker | 380 | `innerHeight - r.bottom < h + 16 && r.top > h + 16` |
| Date-time picker | 400 | idem |
| Time picker | 330 | idem |
| Variações de dropdown (`dd`) | 300 | `innerHeight - r.bottom < 300 && r.top > 300` |
| País / bandeira / moeda (`cs`) | 340 | `innerHeight - r.bottom < 340 && r.top > 340` |
| Busca, Período, Select, Menu de ações, Combobox | — | nunca viram (posição fixa) |

Fechamento (`closePops`, dc.src L156): seta `popOut=true` (todos os popovers abertos trocam a animação para `pfPopOut .24s … forwards`), e **230 ms** depois zera o estado (`selOpen, dateOpen, menu, dd, dpOpen, cs.open, dcOn…`). Listener global `pointerdown` em captura (L108): ignora se o alvo está dentro de `[data-pop]` ou `[data-pop-trigger]`; senão chama `closePops()`.
Exceções sem animação de saída: Date picker ao escolher dia (`dpOpen:null` direto), botões "Confirmar"/"OK"/"Agora" dos pickers (`dpClose` direto).

### 0.7 Morph de conteúdo — `[data-morph]` (dc.src L109-116)

Quando o HTML interno de um `[data-morph]` muda (troca de estado do upload):
1. Um ghost (`[data-morph-ghost]`, `data-instant`, `aria-hidden`) com o HTML anterior é posicionado `position:absolute` sobre a caixa (mesmos paddings/display/flex-direction/align-items/gap), `pointer-events:none; z-index:0`.
2. Altura da caixa: `animate([{height: prevH}, {height: newH}], {duration: 620, easing: cubic-bezier(.22,1,.36,1)})` com `overflow:hidden` durante (só se diferença > 1px).
3. Ghost: `[{opacity:1, filter:blur(0), transform:none} → {opacity:0, filter:blur(4px), transform:translateY(-4px) scale(.99)}]`, `380ms cubic-bezier(.4,0,.6,1) forwards`.
4. Filhos novos (índice i): `[{opacity:0, filter:blur(4px), transform:translateY(6px) scale(.99)} → {opacity:1, filter:blur(0), transform:none}]`, `620ms cubic-bezier(.22,1,.36,1)`, `delay: 120 + i*30 ms`, `fill: backwards`.
5. Ghost removido em 760 ms. Mudanças só de texto (mesma contagem de tags, diferença < 6 chars) não disparam o morph.

### 0.8 Tinta ao digitar (global, evento `input`, dc.src L118-119)

Para qualquer `INPUT`/`TEXTAREA` (exceto `range`, `file`, opacity 0):
- Caixa do campo = primeiro ancestral com `border-top-left-radius >= 18px`. Ela recebe `animate([{transform:scale(1), outline:0px solid transparent, outlineOffset:0}, {transform:scale(1.0015), outline:1px solid var(--ring), outlineOffset:1px, offset:.3}, {transform:scale(1), outline:1px solid transparent, outlineOffset:2px}], {duration:480, easing:cubic-bezier(.22,1,.36,1)})`, com throttle de 140 ms.
- Por caractere inserido (não em `type=password`): um "borrão" `span` absoluto com a cor de fundo do campo, `left = x-1`, `top = 18%` da altura do campo, `width = larguraDoChar + 3`, `height = 64%` da altura, `border-radius:3px`, `z-index:2`: `[{opacity:1, clipPath:inset(0)}, {opacity:.85, clipPath:inset(0 0 55% 0), offset:.45}, {opacity:0, transform:translateY(-3px), clipPath:inset(0 0 100% 0)}]` 420 ms Respiro, forwards, remove ao fim. E um "fio" de 1.5px na cor do texto a 78% da altura, `width = max(4, larguraDoChar)`, `border-radius:2px`: `[{opacity:.55, transform:translateX(0) scaleX(1), filter:blur(0)} → {opacity:0, transform:translateX(5px) scaleX(1.6), filter:blur(2px)}]` 520 ms Respiro.
- Textarea: mesmo par, com offsets 12% / 78% da altura da linha e o fio em 88%.

### 0.9 Ícones

`mkIcon` (dc.src L64): `<svg data-icon="1" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block">`, com `pathLength="100"` nos paths. O tamanho vem sempre do `<span style="display:flex;width:Npx;height:Npx">` que o envolve. Spinner (`{{ spin14 }}`): `<span style="width:14px;height:14px;border-radius:99px;border:1.5px solid currentColor;border-right-color:transparent;display:inline-block;animation:pfSpin .7s linear infinite">`.

### 0.10 Contêineres de demonstração (seção)

- Cartão de seção (campos/seleção): `background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:48px; corner-shape:squircle; padding:32px; display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:28px 24px`. Na seção 18: `border-radius:44px`, `minmax(250px,1fr)`, `align-items:start; min-height:220px`. Na seção 19 (primeira grade): `align-items:start; min-height:380px`.
- Cartão isolado (textarea, upload): `border-radius:44px; corner-shape:squircle; padding:28px; display:flex; flex-direction:column; gap:6px`, mesma superfície.
- Cabeçalho de seção: eyebrow `font-family:'Geist Mono',monospace; font-size:11px; color:var(--tx3)`; `h2 { margin:0; font:500 32px/1.1 Geist,sans-serif; letter-spacing:-0.03em }`; `p { margin:0; color:var(--tx2); max-width:580px; line-height:1.55 }`.

---

## 1. Grupo de campo — rótulo, campo e ajuda

### Anatomia
```
label|div  (grupo)                       display:flex; flex-direction:column; gap:6px  [+ position:relative quando há popover]
├─ span   (rótulo)                       font-size:12px; font-weight:500
├─ <campo>                               ver cada componente
└─ span   (ajuda)                        font-size:11px; color:var(--tx3)
```

### Estilos
```css
.grupo  { display:flex; flex-direction:column; gap:6px; }           /* min-width:0 quando dentro de grid (seção 18) */
.rotulo { font-size:12px; font-weight:500; }                          /* line-height: não especificado (herda normal) */
.ajuda  { font-size:11px; color:var(--tx3); }
```

### Estados
- Desabilitado: rótulo e ajuda `color:var(--tx4)` (ver §7).
- Erro: ajuda `color:var(--er)` (ver §5) — o texto de erro vive num `[data-collapse]` com `--g:6px`.
- Sucesso/informativo: ajuda `color:var(--ok)` / `var(--tx2)` conforme estado (ver §15).

### Medidas
Rótulo 12/500 · 6px até o campo · ajuda 11px a 6px abaixo.

---

## 2. Campo de texto

### Anatomia
```
label (grupo §1)
├─ span rótulo "Nome da campanha"
├─ input[placeholder]
└─ span ajuda
```

### Estilos
```css
input {
  height:36px; padding:0 16px;
  border:1px solid transparent; border-radius:999px;
  background:var(--sf2); box-shadow:var(--deb);
  color:var(--tx); font:400 13px/1 Geist,sans-serif; outline:none;
}
input:focus { border-color:var(--tx3); box-shadow:var(--deb), 0 0 0 3px var(--ring); }
```
Placeholder: cor **não especificada** (sem regra global `::placeholder` exceto para `type=password`).

### Estados
- Padrão: cavado (`--deb`), borda transparente.
- Foco: borda `var(--tx3)` + anel `0 0 0 3px var(--ring)` somado ao `--deb`.
- Digitação: §0.8 (pulso de outline 480 ms + borrão/fio por caractere).

### Movimento
`border-color`/`box-shadow` via transição universal de inputs: `.55s cubic-bezier(.22,1,.36,1)`.

### Medidas
Altura 36 · padding horizontal 16 · borda 1 · raio pílula · anel 3px.

---

## 3. Busca (com atalho ⌘K, carregamento, limpar e resultados)

### Anatomia
```
div (grupo; position:relative; grid-column:span 2; min-width:0)
├─ span rótulo "Busca"
├─ div.caixa  (height:40px …; style-focus-within)
│  ├─ span 16×16  {{ ic.search }}
│  ├─ input  (flex:1)
│  ├─ [se qLoading] span 14×14 color:var(--tx3) {{ spin14 }}
│  ├─ [se qHas]     button.limpar 28×28  > span 14×14 {{ ic.x }}
│  └─ span.kbd "⌘K"
├─ [se qOpen] div[data-pop].lista
│  ├─ [se q vazio]  span.cabecalho "Buscas recentes" + button.recente × N (clock 14 + texto)
│  ├─ [se qLoading] div.skeleton (2 barras shimmer)
│  ├─ group × N: span.cabecalho {{ g.g }} + button.resultado × N (ícone em disco 28 + título/meta)
│  └─ div[data-collapse][data-open=qEmpty] > div > div.vazio
└─ span ajuda
```

### Estilos
```css
.caixa { height:40px; padding:0 6px 0 14px; display:flex; align-items:center; gap:8px;
  border:1px solid transparent; border-radius:999px; background:var(--sf2); box-shadow:var(--deb); color:var(--tx3); }
.caixa:focus-within { border-color:var(--tx3); }            /* sem anel de 3px aqui */
.caixa input { flex:1; min-width:0; border:0; background:transparent; outline:none; color:var(--tx); font:400 13px/1 Geist,sans-serif; }
.limpar { width:28px; height:28px; border:0; border-radius:999px; background:transparent; color:var(--tx2);
  display:flex; align-items:center; justify-content:center; cursor:pointer; }
.limpar:hover { background-color:var(--acs); }
.kbd { height:26px; padding:0 9px; border-radius:999px; background:var(--sf3); box-shadow:var(--sh1);
  font-family:'Geist Mono',monospace; font-size:10.5px; color:var(--tx2); display:flex; align-items:center; }

.lista { position:absolute; top:70px; left:0; right:0; z-index:7; padding:6px; display:flex; flex-direction:column; gap:2px;
  background:var(--glass); backdrop-filter:blur(24px) saturate(1.5); -webkit-backdrop-filter:blur(24px) saturate(1.5);
  border:1px solid var(--gbd); box-shadow:var(--e2); border-radius:28px; corner-shape:squircle;
  animation:{{ popIn }}; max-height:340px; overflow:auto; }
.cabecalho { font-size:11px; color:var(--tx3); padding:8px 12px 4px; }
.recente { height:36px; padding:0 12px; display:flex; align-items:center; gap:10px; border:0; border-radius:999px;
  background:transparent; color:var(--tx); font:400 13px/1 Geist,sans-serif; cursor:pointer; text-align:left; }
.recente:hover { background-color:var(--acs); }
.recente > span.icone { display:flex; width:14px; height:14px; color:var(--tx3); }
.skeleton { padding:14px 12px; display:flex; flex-direction:column; gap:10px; }
.skeleton > div { height:10px; border-radius:999px;
  background:linear-gradient(90deg,var(--sf2) 0,var(--bd) 50%,var(--sf2) 100%); background-size:400px 100%;
  animation:pfShimmer 1.2s linear infinite; }              /* larguras 60% e 80% */
.resultado { min-height:46px; padding:6px 12px; display:flex; align-items:center; gap:10px; border:0;
  border-radius:20px; corner-shape:squircle; background:transparent; color:var(--tx); cursor:pointer; text-align:left; font-family:Geist,sans-serif; }
.resultado:hover { background-color:var(--acs); }
.resultado > .disco { flex:none; width:28px; height:28px; border-radius:14px; corner-shape:squircle; background:var(--sf2);
  display:flex; align-items:center; justify-content:center; color:var(--tx2); }
.resultado > .disco > span { display:flex; width:14px; height:14px; }
.resultado > .texto { display:flex; flex-direction:column; gap:2px; min-width:0; }
.resultado .titulo { font-size:13px; }  .resultado .meta { font-size:11px; color:var(--tx3); }
.vazio-wrap[data-collapse] { --g:2px; }
.vazio { padding:20px 12px; display:flex; flex-direction:column; align-items:center; gap:6px; text-align:center; }
.vazio .t { font-size:13px; font-weight:500; }  .vazio .d { font-size:12px; color:var(--tx3); }
```

### Estados (dc.src L262-266)
- `qOpen` = input focado; `blur` fecha após **160 ms** (itens usam `onMouseDown`, não `onClick`, para vencer o blur).
- `qLoading` = true ao digitar, false após **420 ms** (debounce por `setTimeout`).
- `qRecent` = `q.length === 0` → mostra "Buscas recentes".
- `qGroups` = vazio enquanto carrega; agrupa Pedidos/Campanhas/Clientes filtrando por substring.
- `qEmpty` = `q.length>0 && !qLoading && nenhuma keyword` → abre o `[data-collapse]`.
- Limpar: aparece quando `q.length>0`; zera `q` e `qLoading`.

### Movimento
- Lista: `{{ popIn }}` → `pfPop .38s cubic-bezier(.22,1,.36,1)`; saída `pfPopOut .24s cubic-bezier(.4,0,.6,1) forwards`. Posição fixa `top:70px` (não vira).
- Spinner `pfSpin .7s linear infinite`. Shimmer `pfShimmer 1.2s linear infinite`.
- Vazio: colapso §0.4 com `--g:2px`.

### Medidas
Caixa 40 · padding 0 6 0 14 · gap 8 · ícone busca 16 · spinner 14 · limpar 28 (ícone 14) · kbd 26 alto, padding 0 9, mono 10.5 · lista padding 6, gap 2, raio 28, máx 340 · recente 36 · resultado ≥46, raio 20, disco 28/raio 14, ícone 14.

---

## 4. Campo com prefixo e sufixo (Orçamento diário)

### Anatomia
```
label (grupo)
├─ span rótulo "Orçamento diário"
├─ div.caixa
│  ├─ span.prefixo "R$"
│  ├─ input[inputmode=numeric]  (mono)
│  └─ span.sufixo "/dia"
└─ span ajuda "Prefixo e sufixo em tinta 淡"
```

### Estilos
```css
.caixa { height:36px; padding:0 16px; display:flex; align-items:center; gap:8px; border-radius:999px; background:var(--sf2); box-shadow:var(--deb); }
.prefixo { font-size:13px; color:var(--tx3); }
.caixa input { flex:1; min-width:0; border:0; background:transparent; outline:none; color:var(--tx); font:400 13px/1 'Geist Mono',monospace; }
.sufixo { font-size:12px; color:var(--tx3); }
```
Foco: **não especificado** (nenhum `style-focus`/`focus-within` nesta caixa).

### Lógica (`f2.onBudget`, L355)
Só dígitos, remove zeros à esquerda, máx 10 dígitos, divide por 100 e formata `pt-BR` com 2 casas (`1.250,00`).

### Medidas
Altura 36 · padding 0 16 · gap 8 · prefixo 13 · sufixo 12 · valor mono 13.

---

## 5. E-mail com validação inline

### Anatomia
```
label (grupo)
├─ span rótulo "E-mail"
├─ div.caixa  (box-shadow:{{ f2.emRing }})
│  ├─ input[type=email]
│  └─ span.status 16×16  {{ f2.emIcon }}  (color/opacity/transform dinâmicos)
└─ div[data-collapse][data-open={{ f2.emBad }}] style="--g:6px"
   └─ div > span.erro "Inclua um domínio, ex.: ana@profitify.com"
```

### Estilos
```css
.caixa { height:36px; padding:0 14px 0 16px; display:flex; align-items:center; gap:8px; border-radius:999px; background:var(--sf2); box-shadow:{{ f2.emRing }}; }
.caixa input { flex:1; min-width:0; border:0; background:transparent; outline:none; color:var(--tx); font:400 13px/1 Geist,sans-serif; }
.status { display:flex; width:16px; height:16px; color:{{ f2.emIc }}; opacity:{{ f2.emIcOp }}; transform:scale({{ f2.emIcS }});
  transition: opacity .45s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.34,1.28,.64,1), color .45s cubic-bezier(.22,1,.36,1); }
.erro { font-size:11px; color:var(--er); }
```

### Estados (L355)
`ok = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)`; `bad = email.length>0 && !ok`.

| | vazio | inválido | válido |
|---|---|---|---|
| `emRing` | `var(--deb)` | `var(--deb), 0 0 0 1px var(--er)` | `var(--deb), 0 0 0 1px var(--ok)` |
| `emIcon` | alert | alert (`ic.alert`) | `ic.checkCircle` |
| `emIc` | `var(--er)` | `var(--er)` | `var(--ok)` |
| `emIcOp` / `emIcS` | 0 / .5 | 1 / 1 | 1 / 1 |
| `emBad` (erro aberto) | false | true | false |

### Movimento
Ícone: opacity .45s Respiro, transform .6s `cubic-bezier(.34,1.28,.64,1)` (mola), color .45s. Anel: transição universal de input (.55s). Erro: colapso §0.4 com `--g:6px`.

### Medidas
Altura 36 · padding 0 14 0 16 · ícone 16 · anel de estado 1px.

---

## 6. Senha (força e visibilidade)

### Anatomia
```
label (grupo)
├─ span rótulo "Senha"
├─ div.caixa  color:var(--tx3)
│  ├─ span 16×16 {{ ic.lock }}
│  ├─ input[type={{ pwType }}]            (password|text)
│  └─ button[data-press=ghost] 28×28 "Mostrar ou ocultar senha" > span 16×16 {{ pwIcon }} (eye|eyeOff)
└─ div.forca  display:flex; align-items:center; gap:8px
   ├─ div.barras  display:flex; gap:3px; flex:1
   │  └─ span.trilho × 4 > span.preenchimento
   └─ span.hint  font-size:11px; color:var(--tx3); animation:{{ pwHintAnim }}
```
Além disso o runtime injeta dentro de `.caixa` um `<span data-pw-ov data-morph-ghost data-instant aria-hidden>` (overlay "carvão", §6.1).

### Estilos
```css
.caixa { height:36px; padding:0 4px 0 14px; display:flex; align-items:center; gap:8px; border-radius:999px; background:var(--sf2); box-shadow:var(--deb); color:var(--tx3); }
.caixa input { flex:1; min-width:0; border:0; background:transparent; outline:none; color:var(--tx); font:400 13px/1 Geist,sans-serif; }
/* global (style1.css) */
input[type=password] { color:transparent !important; caret-color:var(--tx); letter-spacing:.34em; }
input[type=password]::placeholder { color:var(--tx3); letter-spacing:0; }
.toggle { width:28px; height:28px; border:0; border-radius:999px; background:transparent; color:var(--tx2); display:flex; align-items:center; justify-content:center; cursor:pointer; }
.toggle:hover { background-color:var(--acs); }
.trilho { flex:1; height:3px; border-radius:2px; background:var(--bd); overflow:hidden; }
.preenchimento { display:block; height:100%; width:100%; border-radius:2px; background:{{ b.fc }};
  transform:scaleX({{ b.sx }}); transform-origin:left center;
  transition: transform .7s cubic-bezier(.22,1,.36,1) {{ b.d }}, background-color .6s cubic-bezier(.22,1,.36,1); }
.hint { font-size:11px; color:var(--tx3); animation:{{ pwHintAnim }}; }
```

### Estados (L227-229)
- `pwType` = `pw ? 'text' : 'password'`; `pwIcon` = `pw ? ic.eyeOff : ic.eye`.
- Barra i (0..3): `fc = len>9 ? var(--ok) : var(--wa)`; `sx = i < min(4, ceil(len/3)) ? 1 : 0`; `d = i*60 ms` (0, 60, 120, 180).
- `pwHint` = `len>9 ? 'Senha forte' : 'Use 10+ caracteres'`; `pwHintAnim` = `(len>9 ? pfItemA : pfItemB) .5s cubic-bezier(.22,1,.36,1) both` (alterna o nome para re-disparar ao cruzar 10 caracteres).
- Foco da caixa: **não especificado**.

### 6.1 Overlay "senha a carvão" (`syncPw`, L123-127)
Com `type=password` o texto é transparente e cada caractere vira um borrão de carvão:
- Overlay: `position:absolute; pointer-events:none; z-index:1; display:flex; align-items:center; overflow:hidden; left: input.offsetLeft + paddingLeft; top: input.offsetTop; height: input.offsetHeight; width: clientWidth − paddings`.
- Cada borrão k (seed determinístico `(k*9301+49297)%233280/233280`): `width: 6.4 + seed*2.2 px`; `height: w*(.82 + ((k*37)%10)/40)`; `margin-right: max(1, larguraDo'•'+letter-spacing − w)`; `border-radius: 52% 46% 55% 44% / 48% 56% 44% 52%`; `background: radial-gradient(ellipse at 42% 40%, var(--tx) 0%, var(--tx) 34%, color-mix(in oklab, var(--tx) 55%, transparent) 56%, transparent 74%)`; três `box-shadow` deslocados (`-2.5-seed`px/`1.5+seed`px spread −2.3px a 45%; `2.6+seed`px/−1.8px spread −2.5px a 35%; .5px/3px spread −2.6px a 30%); `opacity: .78 + seed*.2`; `transform: rotate(round((seed−.5)*70)deg)`.
- Entrada: `[{scale(.15), blur(2.5px), opacity 0}, {scale(1.18), blur(.6px), opacity 1, offset .45}, {scale(1), blur(.25px)}]` 420 ms Respiro.
- Remoção: `[{opacity atual, blur(.25px), scale(1)} → {opacity 0, blur(3px), scale(1.5) translateX(3px)}]` 320 ms Respiro, forwards.

### Medidas
Caixa 36 · padding 0 4 0 14 · lock 16 · toggle 28 (ícone 16) · barras 3px alto, raio 2, gap 3 · gap caixa→força 6, barras→hint 8.

---

## 7. Campo desabilitado (Token da API)

### Anatomia
```
label (grupo)
├─ span rótulo  color:var(--tx4)
├─ div.caixa  (sem input; valor mascarado em mono)
│  ├─ span.valor "pk_live_•••••••• 4f2a"
│  └─ span 16×16 {{ ic.lock }}
└─ span ajuda  color:var(--tx4)
```

### Estilos
```css
.rotulo { font-size:12px; font-weight:500; color:var(--tx4); }
.caixa { height:36px; padding:0 16px; display:flex; align-items:center; gap:8px; border-radius:999px; background:var(--sf2); color:var(--tx4); opacity:.7; }   /* sem --deb: "sem relevo" */
.valor { flex:1; font:400 12px/1 'Geist Mono',monospace; }
.ajuda { font-size:11px; color:var(--tx4); }
```

### Medidas
Altura 36 · padding 0 16 · valor mono 12 · ícone 16 · opacity .7.

---

## 8. Stepper numérico com odômetro (Margem alvo)

### Anatomia
```
div (grupo)
├─ span rótulo "Margem alvo"
├─ div.caixa
│  ├─ button[data-press=sheet] 28×28 "Diminuir"  > span 14×14 {{ ic.minus }}
│  ├─ [se mView] button.valor (flex:1; cursor:text; hover acs)
│  │  ├─ span.odometro aria-hidden  (grupos por caractere)
│  │  │  └─ para cada g: [isNum] span.janela > span.coluna (transform/transition) > span×10 "0".."9"   |  [isSep] span {{ g.ch }}
│  │  ├─ span.unidade "%"
│  │  └─ span.sr-only aria-live=polite {{ margin }}
│  ├─ [se mEdit] span.edicao (animation:pfItemA .35s …) > input[inputmode=numeric] + span.unidade "%"
│  └─ button[data-press=sheet] 28×28 "Adicionar" > span 14×14 {{ ic.plus }}
└─ span ajuda "Clique no número para digitar · segure − / + para acelerar"
```

### Estilos
```css
.caixa { height:36px; padding:0 4px; display:flex; align-items:center; gap:4px; border-radius:999px; background:var(--sf2); box-shadow:var(--deb); }
.passo { width:28px; height:28px; border:0; border-radius:999px; background:var(--sf3); box-shadow:var(--sh1); color:var(--tx);
  display:flex; align-items:center; justify-content:center; cursor:pointer; }        /* data-press="sheet": hover e2 + translateY(-1px); active deb */
.passo > span { display:flex; width:14px; height:14px; }
.valor { flex:1; height:28px; border:0; border-radius:999px; background:transparent; color:var(--tx);
  display:flex; justify-content:center; align-items:baseline; gap:1px; padding:6px 0 0; cursor:text; }
.valor:hover { background-color:var(--acs); }
.odometro { display:inline-flex; align-items:flex-start; white-space:nowrap; font:500 15px/1 Geist,sans-serif; letter-spacing:-0.02em;
  font-variant-numeric:tabular-nums; height:1em; padding:.1em 0; box-sizing:content-box;
  -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 18%,#000 82%,transparent 100%);
  mask-image:linear-gradient(180deg,transparent 0,#000 18%,#000 82%,transparent 100%); }
.janela { display:inline-block; height:1em; overflow:hidden; }
.coluna { display:flex; flex-direction:column; transform:{{ g.ty }}; transition:transform .6s cubic-bezier(.22,1,.36,1) {{ g.d }}; }
.coluna > span { height:1em; }
.separador { display:inline-block; height:1em; }
.unidade { font:400 11px/1 Geist,sans-serif; color:var(--tx3); }
.sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); }
.edicao { flex:1; display:flex; justify-content:center; align-items:baseline; gap:1px; animation:pfItemA .35s cubic-bezier(.22,1,.36,1); }
.edicao input { width:3.2ch; border:0; background:transparent; outline:none; text-align:right; color:var(--tx);
  font:500 15px/1 Geist,sans-serif; letter-spacing:-0.02em; font-variant-numeric:tabular-nums; padding:0; }
```

### Lógica (`odo`, L176; stepper L256)
- `g.ty` = `translateY(-(dígito*10)%)` (coluna com 10 linhas de 1em); separadores `none`.
- `g.d` = `dígitoMudou ? posiçãoDesdeADireita*55 : 0` ms (unidade 0 ms, dezena 55 ms, centena 110 ms…).
- Clique no valor → modo edição (`mEdit`), `autoFocus`; `onChange` filtra `[^0-9]` e corta a 3 dígitos; `blur` confirma (`clamp 0..100`); `Enter` confirma (blur), `Escape` cancela, `ArrowUp/Down` ±1 (`Shift` ±10) aplicando ao vivo.
- Botões −/+: `clamp(0,100)`. Segurar (`pointerdown`, botão 0): primeiro tique após **380 ms**, depois intervalo `max(28, 220 − n*18)` ms (acelera); solta em `pointerup`/`pointercancel` na `window`.

### Movimento
Coluna do odômetro `.6s cubic-bezier(.22,1,.36,1)` com atraso em cascata de 55 ms por casa. Entrada do input `pfItemA .35s`. Botões: física `sheet` (§0.3).

### Medidas
Caixa 36 · padding 0 4 · gap 4 · botões 28 (ícone 14) · valor 15/500, ls −.02em · unidade 11 · input 3.2ch.

---

## 9. Período — presets + calendário de intervalo (date range)

### Anatomia
```
div (grupo; position:relative)
├─ span rótulo "Período"
├─ button[data-press=ghost].gatilho
│  ├─ span 16×16 color:var(--tx3) {{ ic.calendar }}
│  ├─ span flex:1 {{ date }}
│  └─ span 14×14 color:var(--tx3) {{ ic.chevronDown }}
├─ [se dateOpen] div[data-pop].folha
│  ├─ [se dc.off] div.presets (animation:pfItemA .45s …)
│  │  └─ button[data-press=ghost].preset × 6  > span flex:1 {{ o.d }} + span 14×14 opacity:{{ o.chk }} {{ ic.check }}
│  └─ [se dc.on]  div.calendario (onMouseLeave=dc.leave)
│     ├─ div[data-slide].modos > span[data-ind] + button[data-on] × 2 ("Intervalo", "Data única")
│     ├─ div.nav  > button.prev 32×32 + span.titulo + button.next 32×32
│     ├─ div.semana  (7 × span "S T Q Q S S D")
│     ├─ div.grade   > button.celula × 35..42
│     └─ div.rodape  > span.resumo + div(gap 4) > button[data-press=ghost] "Voltar" + button[data-press=ink] "Aplicar"
└─ span ajuda
```

### Estilos
```css
.gatilho { height:36px; padding:0 14px; display:flex; align-items:center; gap:8px; border:0; border-radius:999px;
  background:var(--sf2); box-shadow:var(--deb); color:var(--tx); font:400 13px/1 Geist,sans-serif; cursor:pointer; text-align:left; }
.folha { position:absolute; top:66px; left:0; z-index:6; min-width:100%; padding:6px; display:flex; flex-direction:column; gap:2px;
  background:var(--glass); backdrop-filter:blur(24px) saturate(1.3); -webkit-backdrop-filter:blur(24px) saturate(1.3);
  border:1px solid var(--gbd); box-shadow:var(--e2); border-radius:28px; corner-shape:squircle; animation:{{ popIn }}; }
.presets { display:flex; flex-direction:column; gap:2px; animation:pfItemA .45s cubic-bezier(.22,1,.36,1); }
.preset { height:34px; padding:0 10px 0 14px; display:flex; align-items:center; border:0; border-radius:999px;
  background:{{ o.bg }}; color:var(--tx); font:400 13px/1 Geist,sans-serif; cursor:pointer; text-align:left; }   /* o.bg: selecionado var(--acs) | transparent */
.preset:hover { background-color:var(--acs); }
.preset .check { display:flex; width:14px; height:14px; opacity:{{ o.chk }}; }                                    /* 1 | 0 */

.calendario { width:min(316px, calc(100vw - 64px)); padding:8px 8px 6px; display:flex; flex-direction:column; gap:10px;
  animation:pfRise .55s cubic-bezier(.22,1,.36,1); }
.modos { position:relative; display:flex; padding:3px; gap:2px; border-radius:999px; background:var(--sf2); box-shadow:var(--deb); }
.modos > [data-ind] { background:var(--sf3); box-shadow:var(--sh1); border-radius:999px; }        /* + regras §0.5 */
.modos > button { position:relative; z-index:1; flex:1; height:30px; border:0; border-radius:999px; background:transparent;
  color:{{ o.fg }}; font:500 12px/1 Geist,sans-serif; cursor:pointer; }                            /* o.fg: ativo var(--tx) | var(--tx3) */
.nav { display:flex; align-items:center; justify-content:space-between; }
.nav button { width:32px; height:32px; border:0; border-radius:999px; background:transparent; color:var(--tx2);
  display:flex; align-items:center; justify-content:center; cursor:pointer; }
.nav button:hover { background-color:var(--acs); }
.nav button > span { display:flex; width:14px; height:14px; }
.titulo { font-size:13px; font-weight:500; }
.semana { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); text-align:center; font-size:10px; color:var(--tx3); }
.grade { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:2px 0; }
.celula { height:34px; border:0; border-radius:{{ d.r }}; background:{{ d.bg }}; box-shadow:{{ d.sh }}; color:{{ d.fg }};
  font:400 12px/1 'Geist Mono',monospace; font-weight:{{ d.fw }}; cursor:pointer; }
.rodape { display:flex; align-items:center; justify-content:space-between; gap:8px; padding-top:10px; border-top:1px solid var(--bd); }
.resumo { font-size:11.5px; color:var(--tx2); min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.voltar  { height:30px; padding:0 12px; border:0; border-radius:999px; background:transparent; color:var(--tx2); font:500 12px/1 Geist,sans-serif; cursor:pointer; }
.aplicar { height:30px; padding:0 14px; border:0; border-radius:999px; background:var(--ac); color:var(--acf); box-shadow:var(--ink);
  font:500 12px/1 Geist,sans-serif; cursor:pointer; opacity:{{ dc.goOp }}; }                        /* pronto 1 | .4 */
```

### Estados das células (`dc.cells`, L365-367)
Mês base `2026-10 + dcOff`; `off = (getDay()+6)%7` células em branco (`bg/fg transparent; sh none; r 999px`). `today = 2026-10-01`.

| Condição | `d.r` | `d.bg` | `d.fg` | `d.sh` | `d.fw` |
|---|---|---|---|---|---|
| extremo (`isEnd`: A ou B; em "single" só A) | `999px` | `var(--tx)` | `var(--sf)` | `var(--ink)` | 600 |
| dentro do intervalo (`inR`, só modo range; usa hover `dcH` como fim provisório) | `8px` | `var(--acs)` | `var(--tx)` | `none` | 400 |
| hoje (não extremo) | `999px` | `transparent` | `var(--tx)` | `inset 0 0 0 1px var(--tx3)` | 400 |
| demais | `999px` | `transparent` | `var(--tx)` | `none` | 400 |

Hover de célula sem estilo próprio (só atualiza `dcH`). Presets: `['Hoje','Ontem','Últimos 7 dias','Últimos 30 dias','Este mês','Personalizado…']`; "Personalizado…" liga `dcOn` (troca presets → calendário dentro da mesma folha). `dc.sum`: "Escolha o início" / "Início {d mmm aaaa} · escolha o fim" / "{a} — {b}" / em single "Escolha uma data"/data. `Aplicar` só se `ready`; `Voltar` limpa seleção e volta aos presets. Trocar modo zera A/B.

### Movimento
Folha `{{ popIn }}` (pfPop .38s / pfPopOut .24s). Presets `pfItemA .45s`. Calendário `pfRise .55s`. Indicador de modo `.55s` (§0.5). Células: transição universal `.55s` em background/box-shadow/color (o raio não está na lista — muda seco). Botões: `ghost`/`ink` (§0.3).

### Medidas
Gatilho 36, padding 0 14, gap 8, ícones 16/14 · folha `top:66px`, padding 6, gap 2, raio 28 · preset 34 · calendário ≤316, padding 8 8 6, gap 10 · modos padding 3, gap 2, botão 30 · nav 32 (ícone 14) · semana 10px · célula 34, gap 2px vertical · rodapé padding-top 10, resumo 11.5, botões 30.

---

## 10. Textarea (Bio do perfil)

### Anatomia
```
label.cartao (raio 44, padding 28; gap 6)
├─ span rótulo "Bio do perfil"
├─ textarea[rows=4]
└─ div (space-between) > span ajuda + span.contador
```

### Estilos
```css
textarea { resize:none; padding:14px 18px; border:1px solid transparent; border-radius:24px; corner-shape:squircle;
  background:var(--sf2); box-shadow:var(--deb); color:var(--tx); font:400 13px/1.55 Geist,sans-serif; outline:none; }
textarea:focus { border-color:var(--tx3); box-shadow:var(--deb), 0 0 0 3px var(--ring); }
.contador { font-family:'Geist Mono',monospace; font-size:11px; color:var(--tx3); }    /* "{len}/160" */
```
Lógica: `onBio` corta a 160 caracteres. "Cresce com o conteúdo": **não especificado** no CSS (rows=4 fixo; sem auto-resize no código).

### Medidas
Padding 14 18 · raio 24 squircle · 13/1.55 · rows 4 · contador mono 11.

---

## 11. Upload / área de arrastar (Importar planilha)

### Anatomia
```
div.cartao (raio 44, padding 28; gap 6)
├─ span rótulo "Importar planilha"
├─ label[data-morph].area  (dragover/dragleave/drop)
│  ├─ input[type=file] display:none
│  ├─ [upIdle] span.disco 40 > span 18×18 {{ ic.upload }} · span.texto (strong "Arraste o arquivo" + span "ou clique para escolher") · span.hint "CSV ou XLSX · até 20 MB"
│  ├─ [upBusy] div.progresso (max 320)
│  │  ├─ div.linha > span.disco 32 > span 16×16 {{ ic.file }} · span.nome · span.pct
│  │  ├─ div.trilho > div.barra
│  │  └─ span.hint "Lendo pedidos…"
│  └─ [upDone] span.disco 40 (oks/ok) > span 18×18 {{ ic.check }} · span.nome 500 · span.hint "1.284 pedidos importados" · button[data-press=sheet] "Importar outro"
└─ div (space-between) > span.hint "Arraste, clique ou" + button.link "simular upload"
```

### Estilos
```css
.area { flex:1; min-height:150px; border-radius:28px; corner-shape:squircle; background:{{ dropBg }}; box-shadow:var(--deb);
  border:1.5px dashed {{ dropBd }}; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:20px; cursor:pointer;
  transition: background 0.3s cubic-bezier(.22,1,.36,1), border-color 0.3s cubic-bezier(.22,1,.36,1); }
/* idle */
.disco40 { width:40px; height:40px; border-radius:20px; corner-shape:squircle; background:var(--sf3) var(--grain); box-shadow:var(--sh1); display:flex; align-items:center; justify-content:center; }
.disco40 > span { display:flex; width:18px; height:18px; }
.texto { font-size:13px; }  .texto strong { font-weight:500; }  .texto span { color:var(--tx2); }
.hint { font-size:11px; color:var(--tx3); }
/* busy */
.progresso { width:100%; max-width:320px; display:flex; flex-direction:column; gap:10px; }
.linha { display:flex; align-items:center; gap:10px; }
.disco32 { width:32px; height:32px; border-radius:16px; corner-shape:squircle; background:var(--sf3); box-shadow:var(--sh1); display:flex; align-items:center; justify-content:center; }
.disco32 > span { display:flex; width:16px; height:16px; }
.nome { flex:1; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pct { font-family:'Geist Mono',monospace; font-size:11px; color:var(--tx2); }
.trilho { height:6px; border-radius:999px; background:var(--bd); overflow:hidden; }
.barra { height:100%; width:{{ upW }}; border-radius:999px; background:var(--ac); transition:width 0.31s cubic-bezier(.22,1,.36,1); }
/* done */
.disco40.ok { background:var(--oks); color:var(--ok); }     /* sem grain, sem sh1 */
.nome.ok { font-size:13px; font-weight:500; }
.outro { height:28px; padding:0 12px; border:1px solid var(--bd); border-radius:999px; background:var(--sf3); box-shadow:var(--sh1); color:var(--tx); font:500 12px/1 Geist,sans-serif; cursor:pointer; }
/* rodapé */
.link { border:0; background:transparent; min-height:28px; padding:0 2px; font-size:11px; color:var(--tx); text-decoration:underline; cursor:pointer; }
```

### Estados (L258, `startUpload` L172)
- Idle: `dropBd = var(--bd2)`, `dropBg = var(--sf2)`.
- Arrastando (`drag`): `dropBd = var(--tx)`, `dropBg = var(--acs)`.
- Busy: progresso a cada **180 ms**, `p += 4 + random*14`, `upW = p%`, `upPct = round(p)%`; chega a 100 → `done`.
- Done: ícone check em disco `--oks/--ok`; "Importar outro" volta a idle.
- Troca idle→busy→done faz o morph §0.7 (altura 620 ms, ghost 380 ms, filhos 620 ms com atraso 120+30i).

### Medidas
Área ≥150, padding 20, gap 10, raio 28, tracejado 1.5 · disco 40 (ícone 18) / 32 (ícone 16) · barra 6 pílula · botão 28.

---

## 12. Date picker (Data) — seção 18

### Anatomia
```
div (grupo; position:relative)
├─ span rótulo "Data"
├─ button[data-pop-trigger].gatilho (width:100%)
│  ├─ span 16×16 color:var(--tx3) {{ ic.calendar }}
│  ├─ span.valor mono {{ dpLabel }}         "15/10/2026"
│  └─ span 14×14 color:var(--tx3) {{ ic.chevronDown }}
├─ [se dpIsDate] div[data-pop].folha (top/bottom/transform-origin/animation = dpPos)
│  ├─ div.cabecalho > span "Outubro 2026" + span "clique para escolher"
│  ├─ div.semana (7 letras)
│  └─ div.grade > button.dia × 34 (3 vazios + 31)
└─ span ajuda "Seleção única · fecha ao escolher"
```

### Estilos
```css
.gatilho { height:40px; padding:0 14px; display:flex; align-items:center; gap:8px; border:0; border-radius:999px; background:var(--sf2);
  box-shadow:{{ dpRing.date }}; color:var(--tx); font:400 13px/1 Geist,sans-serif; cursor:pointer; text-align:left; width:100%; }
.valor { flex:1; font-family:'Geist Mono',monospace; font-size:12.5px; }
.folha { position:absolute; top:{{ dpPos.t }}; bottom:{{ dpPos.b }}; left:0; transform-origin:{{ dpPos.o }}; z-index:8;
  width:280px; max-width:calc(100vw - 48px); padding:14px; display:flex; flex-direction:column; gap:10px;
  background:var(--sf3) var(--grain); border:1px solid var(--bd); box-shadow:var(--e2); border-radius:32px; corner-shape:squircle;
  animation:{{ dpPos.a }}; }                                                  /* folha sólida, não vidro */
.cabecalho { display:flex; justify-content:space-between; align-items:center; padding:2px 6px; }
.cabecalho .mes { font-size:13px; font-weight:500; }  .cabecalho .dica { font-size:11px; color:var(--tx3); }
.semana { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); text-align:center; font-size:10px; color:var(--tx3); padding:0 2px 4px; }
.grade { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:2px; }
.dia { height:32px; border:0; border-radius:999px; background:{{ d.bg }}; box-shadow:{{ d.sh }}; color:{{ d.fg }};
  font:400 12px/1 'Geist Mono',monospace; cursor:{{ d.cur }}; }
.dia:hover { outline:1px solid var(--bd2); }
```

### Estados (L290-291)
- `dpRing.date` = aberto: `var(--deb), 0 0 0 3px var(--ring)` · fechado: `var(--deb)`.
- Dia: selecionado → `bg var(--tx); fg var(--sf); sh var(--ink)`; dia 1 (hoje) não selecionado → `sh inset 0 0 0 1px var(--tx3)`; demais → `bg transparent; fg var(--tx); sh none`. Vazios: `cursor:default`, `on:null`.
- Clique no dia: seta data e fecha **sem** animação de saída (`dpOpen:null`).

### Movimento
Abertura/flip/fechamento conforme §0.6 (`h=380`). Hover de dia: outline sem transição (outline-color está na lista universal, mas `outline` aparece/desaparece seco).

### Medidas
Gatilho 40, padding 0 14, gap 8, valor mono 12.5 · folha 280 larg., padding 14, gap 10, raio 32 · dia 32, grade gap 2 · anel aberto 3px.

---

## 13. Date-time picker (Data e hora)

### Anatomia
```
div (grupo; position:relative)
├─ span rótulo "Data e hora"
├─ button[data-pop-trigger].gatilho  (clock 16 · {{ dtLabel }} "21/10/2026 · 14:30" · chevron 14)
├─ [se dpIsDt] div[data-pop].folha  width:340px
│  ├─ div.grid  grid-template-columns:minmax(0,1fr) 72px; gap:12px
│  │  ├─ div.calendario (gap 4) > span.mes + div.semana + div.grade(button.dia × 34)
│  │  └─ div.horarios > button.hora × 31  ("07:00".."22:00", passo 30 min)
│  └─ div.rodape (flex-end) > button[data-press=ink] "Confirmar"
└─ span ajuda "Calendário + coluna de horários"
```

### Estilos
```css
.gatilho  /* idêntico ao §12, box-shadow:{{ dpRing.dt }} */
.folha    /* idêntico ao §12, width:340px */
.mes { font-size:13px; font-weight:500; padding:2px 4px 6px; }
.calendario { display:flex; flex-direction:column; gap:4px; }
.semana, .grade, .dia, .dia:hover   /* idênticos ao §12 */
.horarios { display:flex; flex-direction:column; gap:2px; max-height:250px; overflow:auto; padding-left:10px; border-left:1px solid var(--bd); }
.hora { flex:none; height:30px; border:0; border-radius:999px; background:{{ t.bg }}; box-shadow:{{ t.sh }}; color:{{ t.fg }}; font:400 12px/1 'Geist Mono',monospace; cursor:pointer; }
.rodape { display:flex; justify-content:flex-end; padding-top:8px; border-top:1px solid var(--bd); }
.confirmar { height:30px; padding:0 14px; border:0; border-radius:999px; background:var(--ac); color:var(--acf); box-shadow:var(--ink); font:500 12px/1 Geist,sans-serif; cursor:pointer; }
```

### Estados (L292-293)
Dia/hora selecionados: `bg var(--tx); fg var(--sf); sh var(--ink)`; não selecionados: `transparent / var(--tx) / none` (sem marcador de hoje nesta variante). Escolher dia **não fecha**; "Confirmar" fecha sem animação de saída.

### Medidas
Folha 340 · colunas `1fr | 72px`, gap 12 · horários máx 250, padding-left 10, borda esquerda 1 · hora 30 · rodapé padding-top 8.

---

## 14. Time picker (Hora)

### Anatomia
```
div (grupo; position:relative)
├─ span rótulo "Hora"
├─ button[data-pop-trigger].gatilho (clock 16 · {{ tLabel }} "09:00" · chevron 14)
├─ [se dpIsTime] div[data-pop].folha  width:220px
│  ├─ div.grid  grid-template-columns:1fr 1fr; gap:10px
│  │  ├─ div.col > span.titulo "Hora"   + div.lista > button × 24 ("00".."23")
│  │  └─ div.col > span.titulo "Minuto" + div.lista > button × 12 ("00","05",…,"55")
│  └─ div.rodape (space-between) > button "Agora" + button[data-press=ink] "OK"
└─ span ajuda "Colunas de hora e minuto (passo 5)"
```

### Estilos
```css
.folha   /* idêntico ao §12, width:220px */
.col { display:flex; flex-direction:column; gap:4px; }
.titulo { font-size:10.5px; color:var(--tx3); padding:0 6px; }
.lista { display:flex; flex-direction:column; gap:2px; max-height:200px; overflow:auto; }
.lista button { flex:none; height:30px; border:0; border-radius:999px; background:{{ bg }}; box-shadow:{{ sh }}; color:{{ fg }}; font:400 12px/1 'Geist Mono',monospace; cursor:pointer; }
.rodape { display:flex; justify-content:space-between; padding-top:8px; border-top:1px solid var(--bd); }
.agora { height:30px; padding:0 12px; border:0; border-radius:999px; background:transparent; color:var(--tx2); font:500 12px/1 Geist,sans-serif; cursor:pointer; }   /* sem data-press */
.ok    /* igual a .confirmar do §13 */
```

### Estados
Selecionado `var(--tx)/var(--sf)/var(--ink)`, demais `transparent/var(--tx)/none`. "Agora": hora atual, minuto arredondado para baixo ao múltiplo de 5, fecha.

### Medidas
Folha 220 · colunas 1fr 1fr gap 10 · título 10.5 · lista máx 200, gap 2 · item 30.

---

## 15. Máscaras — Valor, Margem, CPF, CNPJ, Telefone, CEP

Todos no grid da seção 18 (`minmax(250px,1fr)`), com grupo `label { display:flex; flex-direction:column; gap:6px; min-width:0 }`.

### Anatomia (padrão)
```
label (grupo)
├─ span rótulo
├─ div.caixa  height:40px
│  ├─ [prefixo] span
│  ├─ input[inputmode=numeric][placeholder]  mono
│  └─ [sufixo/ícone] span
└─ span ajuda (cor/texto dinâmicos em CPF e CEP)
```

### Estilos comuns
```css
.caixa { height:40px; padding:0 16px; display:flex; align-items:center; gap:8px; border-radius:999px; background:var(--sf2); box-shadow:var(--deb); }
.caixa input { flex:1; min-width:0; border:0; background:transparent; outline:none; color:var(--tx); font:400 13px/1 'Geist Mono',monospace; }
.prefixo-13 { font-size:13px; color:var(--tx3); }     /* "R$", "%" */
.prefixo-12 { font-size:12px; color:var(--tx3); }     /* "+55" */
.icone { display:flex; width:16px; height:16px; }
```
Foco: **não especificado** (nenhuma destas caixas declara `style-focus-within`; só o pulso global §0.8).

### Por campo

| Campo | Prefixo/sufixo | Placeholder | `box-shadow` | Ajuda |
|---|---|---|---|---|
| Valor | prefixo "R$" (13, tx3) | `0,00` | `var(--deb)` | `mk.moneyHint`: vazio → "Digite só números"; com valor → "Valor em centavos digitados da direita para a esquerda" |
| Margem | sufixo "%" (13, tx3) | `0,0` | `var(--deb)` | "Uma casa decimal · máx. 100%" |
| CPF | ícone 16 `color:{{ mk.cpfFg }}` `{{ mk.cpfIcon }}` | `000.000.000-00` | `{{ mk.cpfRing }}` | `{{ mk.cpfMsg }}` com `color:{{ mk.cpfFg }}` |
| CNPJ | — | `00.000.000/0000-00` | `var(--deb)` | "Pessoa jurídica" |
| Telefone | prefixo "+55" (12, tx3) | `(00) 00000-0000` | `var(--deb)` | "Celular com DDD" |
| CEP | ícone 16 `color:var(--tx3)` `{{ ic.target }}` | `00000-000` | `var(--deb)` | `{{ mk.cepHint }}` com `color:{{ mk.cepFg }}` |

### Lógica (L77-79, L297-301)
- Padrões (`MASKS`): cpf `000.000.000-00`, cnpj `00.000.000/0000-00`, tel `(00) 00000-0000`, cep `00000-000`, card `0000 0000 0000 0000`, exp `00/00`. `applyMask` só consome dígitos e insere os literais; entrada é truncada ao nº de zeros do padrão.
- Valor: dígitos, sem zeros à esquerda, máx 11 dígitos, `/100` → `pt-BR` 2 casas.
- Margem: máx 4 dígitos, `min(1000, n)/10` → 1 casa (teto 100,0).
- CPF: `<11` dígitos → `idle`; `cpfOk` (dígitos verificadores; rejeita repetidos) → `ok`/`er`.

| CPF | `cpfRing` | `cpfFg` | `cpfIcon` | `cpfMsg` |
|---|---|---|---|---|
| idle | `var(--deb)` | `var(--tx3)` | `ic.shield` | "Teste: 529.982.247-25" |
| ok | `var(--deb), 0 0 0 1px var(--ok)` | `var(--ok)` | `ic.checkCircle` | "CPF válido" |
| er | `var(--deb), 0 0 0 1px var(--er)` | `var(--er)` | `ic.alert` | "CPF inválido — confira os dígitos" |

- CEP: com 9 caracteres (`00000-000`) → `cepHint` "Av. Paulista, Bela Vista — São Paulo/SP", `cepFg var(--tx2)`; senão "Preenche o endereço ao completar", `var(--tx3)`.

### Movimento
Anéis de estado e cores de ajuda/ícone: transição universal `.55s`.

### Medidas
Caixa 40 (vs. 36 na seção 17) · padding 0 16 · gap 8 · ícone 16 · anel de estado 1px.

---

## 16. Cartão de crédito — número com bandeira, nome, validade e cartão visual

### Anatomia
```
div.bloco  grid-column:1/-1; gap:16px; padding-top:12px; border-top:1px solid var(--bd)
├─ div.cabecalho (space-between) > span "Pagamento com cartão" (12/500) + button[data-press=sheet] {{ cardBtn }} ("Mostrar cartão"/"Ocultar cartão")
└─ div.grid  grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:24px; align-items:center
   ├─ div.form  gap:14px; min-width:0
   │  ├─ label "Número do cartão" > div.numero (position:relative; height:44px; overflow:hidden)
   │  │   ├─ div.tinta  (camada absoluta com gradiente da bandeira, mascarada)
   │  │   ├─ span 16×16 {{ ic.wallet }}  (position:relative; color:var(--tx3))
   │  │   ├─ input mono placeholder "0000 0000 0000 0000"
   │  │   └─ span.chip-bandeira (largura/opacidade/transform dinâmicos)
   │  │       ├─ [brand.svg] span.logo 28.8×18 (mask SVG, fundo gradiente, pfPopI)
   │  │       └─ [brand.txt] span.nome 800 11px gradiente em texto (pfPopI)
   │  ├─ div.grid2  grid-template-columns:minmax(0,1fr) 110px; gap:10px
   │  │  ├─ label "Nome no cartão" > div.caixa44 > input (uppercase, placeholder "Como impresso")
   │  │  └─ label "Validade"       > div.caixa44 (box-shadow:{{ mk.expRing }}) > input mono placeholder "MM/AA" width:100%
   │  └─ span.hint "Teste 4111… Visa · 5500… Mastercard · 3782… Amex · 3530… JCB · 6362… Elo"
   └─ [se showCard] div.cartao (aspect-ratio 1.586)
      ├─ div.gradiente (absoluto; background:{{ brand.grad }}; opacity .9)
      ├─ div.brilho   (absoluto; radial + grain; mix-blend overlay)
      ├─ div.topo (relative) > span.chipDourado 38×28 + div.bandeira (h30: wallet 22 | logo 44.8×28 branca | nome 800 17 branco)
      ├─ span.numero mono 19 {{ card.num }}
      └─ div.base > (TITULAR + {{ card.name }}) · (VALIDADE + {{ card.exp }})
```

### Estilos
```css
.toggle { height:28px; padding:0 12px; border:1px solid var(--bd); border-radius:999px; background:var(--sf3); box-shadow:var(--sh1); color:var(--tx); font:500 11.5px/1 Geist,sans-serif; cursor:pointer; }

.numero { position:relative; height:44px; padding:0 6px 0 16px; display:flex; align-items:center; gap:10px; border-radius:999px; background:var(--sf2); box-shadow:var(--deb); overflow:hidden; }
.tinta { position:absolute; inset:0;
  background:linear-gradient(270deg, color-mix(in oklab,{{ brand.c }} 22%,transparent) 0%, color-mix(in oklab,{{ brand.c }} 6%,transparent) 45%, transparent 70%);
  -webkit-mask-image:linear-gradient(270deg,#000 0%,#000 35%,transparent 65%); mask-image:linear-gradient(270deg,#000 0%,#000 35%,transparent 65%);
  -webkit-mask-size:300% 100%; mask-size:300% 100%; -webkit-mask-position:{{ brand.mpos }}; mask-position:{{ brand.mpos }};
  opacity:{{ brand.top }};
  transition: -webkit-mask-position 1s cubic-bezier(.22,1,.36,1), mask-position 1s cubic-bezier(.22,1,.36,1), opacity .7s cubic-bezier(.22,1,.36,1);
  pointer-events:none; }
.numero input { position:relative; flex:1; min-width:0; border:0; background:transparent; outline:none; color:var(--tx); font:400 13px/1 'Geist Mono',monospace; }
.chip-bandeira { position:relative; flex:none; height:32px; width:{{ brand.bw }}; padding:0; border-radius:999px; background:var(--sf3); box-shadow:{{ brand.bsh }};
  display:flex; align-items:center; justify-content:center; overflow:hidden; opacity:{{ brand.bop }}; transform:{{ brand.btr }};
  transition: width .7s cubic-bezier(.22,1,.36,1), opacity .5s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1), box-shadow .6s cubic-bezier(.22,1,.36,1); }
.logo { display:block; width:28.8px; height:18px; background:{{ brand.grad }};
  -webkit-mask:{{ brand.mask }} center/contain no-repeat; mask:{{ brand.mask }} center/contain no-repeat; animation:pfPopI .4s cubic-bezier(.34,1.28,.64,1); }
.nome { font:800 11px/1 Geist,sans-serif; letter-spacing:-0.02em; background:{{ brand.grad }}; -webkit-background-clip:text; background-clip:text; color:transparent; animation:pfPopI .4s cubic-bezier(.34,1.28,.64,1); }

.caixa44 { height:44px; padding:0 16px; display:flex; align-items:center; border-radius:999px; background:var(--sf2); box-shadow:var(--deb); }   /* validade: padding:0 14px; box-shadow:{{ mk.expRing }} */
.caixa44 input { flex:1; min-width:0; border:0; background:transparent; outline:none; color:var(--tx); font:400 13px/1 Geist,sans-serif; text-transform:uppercase; }
.hint { font-size:11px; color:var(--tx3); }

.cartao { position:relative; aspect-ratio:1.586; max-width:380px; width:100%; justify-self:center; border-radius:28px; corner-shape:squircle; background:#24211c;
  box-shadow:0 1px 1px rgba(0,0,0,.2), 0 18px 30px -18px rgba(0,0,0,.5), inset 0 .5px 0 rgba(255,255,255,.14);
  color:#f6f1e4; padding:22px 24px; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden;
  animation:pfRise .45s cubic-bezier(.22,1,.36,1); }
.gradiente { position:absolute; inset:0; background:{{ brand.grad }}; opacity:.9; transition:opacity 0.75s cubic-bezier(.22,1,.36,1); }
.brilho { position:absolute; inset:0; background:radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,.18), transparent 55%), var(--grain); mix-blend-mode:overlay; pointer-events:none; }
.topo { position:relative; display:flex; justify-content:space-between; align-items:flex-start; }
.chipDourado { width:38px; height:28px; border-radius:7px; background:linear-gradient(135deg,#e9d6a0,#b99a52); box-shadow:inset 0 0 0 1px rgba(0,0,0,.15); }
.bandeira { height:30px; display:flex; align-items:center; }
.bandeira .wallet { display:flex; width:22px; height:22px; opacity:.6; }
.bandeira .logo { display:block; width:44.8px; height:28px; background:#fff; -webkit-mask:{{ brand.mask }} center/contain no-repeat; mask:…; animation:pfPopI .4s cubic-bezier(.34,1.28,.64,1); }
.bandeira .nome { font:800 17px/1 Geist,sans-serif; letter-spacing:-0.02em; background:#fff; -webkit-background-clip:text; background-clip:text; color:transparent; animation:pfPopI .4s cubic-bezier(.34,1.28,.64,1); }
.cartao .numero { position:relative; font:400 19px/1 'Geist Mono',monospace; letter-spacing:.06em; white-space:nowrap; }
.base { position:relative; display:flex; justify-content:space-between; align-items:flex-end; gap:12px; }
.base .col { display:flex; flex-direction:column; gap:4px; min-width:0; }   /* direita: align-items:flex-end */
.base .rotulo { font-size:9px; opacity:.65; letter-spacing:.08em; }
.base .titular { font:500 12px/1 Geist,sans-serif; letter-spacing:.06em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.base .validade { font:500 12px/1 'Geist Mono',monospace; }
```

### Estados (`brand`, L308; `card`, L309; `mk.expRing` L300)

| | sem bandeira | bandeira detectada |
|---|---|---|
| `brand.c` | última cor de bandeira vista, senão `var(--tx3)` | cor da bandeira |
| `brand.mpos` | `0% 0` | `100% 0` |
| `brand.top` | 0 | 1 |
| `brand.bw` | `0px` | `64px` (logo SVG) / `92px` (nome em texto) |
| `brand.bop` / `brand.btr` / `brand.bsh` | 0 / `translateX(10px) scale(.9)` / `none` | 1 / `none` / `var(--sh1)` |
| `brand.grad` | `transparent` | gradiente da bandeira |

Bandeiras (regex no número só-dígitos, ordem de teste): amex `^3[47]` `linear-gradient(135deg,#1f72cd,#2e9be0)` c `#1f72cd`; diners `^3(0[0-5]|[68])` `linear-gradient(135deg,#0079be,#1a9ad6)` `#0079be`; jcb `^35` `linear-gradient(135deg,#0b4ea2,#e21836)` `#0b4ea2`; elo `^(4011|4312|4389|5041|5067|6277|6362|6363|650|6516|6550)` `linear-gradient(135deg,#00a4e0,#ffcb05 55%,#ef4123)` `#00a4e0` (texto); hiper `^(606282|3841)` `linear-gradient(135deg,#b3131b,#e3242b)` `#b3131b` (texto); visa `^4` `linear-gradient(135deg,#1a1f71,#1434cb)` `#1434cb`; master `^(5[1-5]|2[2-7])` `linear-gradient(135deg,#eb001b,#f79e1b)` `#eb001b`; discover `^6(011|5)` `linear-gradient(135deg,#ff6000,#ffa040)` `#ff6000`. `brand.mask` = `url(data:image/svg+xml…)` de `BRANDURI[chave]` (amex/diners/jcb/visa/master/discover têm SVG; elo/hiper usam nome em texto).

- `card.num` = dígitos + `•` até 16, agrupados de 4 (`0000 0000 0000 0000`); `card.name` = nome em maiúsculas ou "NOME COMO NO CARTÃO"; `card.exp` = validade ou "MM/AA". Nome limitado a 26 caracteres.
- Validade: `<4` dígitos → `var(--deb)`; `MM 01–12` e (`AA>26` ou `AA==26 && MM>=10`) → `var(--deb), 0 0 0 1px var(--ok)`; senão `var(--deb), 0 0 0 1px var(--er)`.

### Movimento
Tinta de fundo: mask-position 1s + opacity .7s Respiro. Chip da bandeira: width/transform .7s, opacity .5s, box-shadow .6s. Logo/nome: `pfPopI .4s cubic-bezier(.34,1.28,.64,1)`. Cartão visual: `pfRise .45s`; gradiente `opacity .75s`.

### Medidas
Campos 44 · número: padding 0 6 0 16, gap 10, wallet 16, chip 32 alto (64/92 largo), logo 28.8×18 · grid nome/validade `1fr | 110px` gap 10 · cartão ≤380, 1.586, raio 28, padding 22 24, chip 38×28 raio 7, logo 44.8×28, número mono 19 ls .06em, rótulos 9px ls .08em.

---

## 17. Select (Fonte de tráfego) — seção 19

### Anatomia
```
div (grupo; position:relative)
├─ span rótulo "Fonte de tráfego"
├─ button[data-press=ghost].gatilho
│  ├─ span flex:1 {{ sel }}
│  └─ span.chevron 14×14 (transform:{{ selChevron }})
├─ [se selOpen] div.lista   (sem data-pop, sem animação declarada)
│  └─ button[data-press=ghost].opcao × 5 > span flex:1 {{ o.o }} + span 14×14 opacity:{{ o.chk }} {{ ic.check }}
└─ span ajuda "Select — clique para abrir"
```

### Estilos
```css
.gatilho { height:36px; padding:0 12px 0 16px; display:flex; align-items:center; gap:8px;
  border:1px solid {{ selBd }}; border-radius:999px; background:var(--sf2); box-shadow:{{ selRing }};
  color:var(--tx); font:400 13px/1 Geist,sans-serif; cursor:pointer; text-align:left; }
.chevron { display:flex; width:14px; height:14px; color:var(--tx3); transform:{{ selChevron }}; transition:transform 0.34s cubic-bezier(.22,1,.36,1); }
.lista { position:absolute; top:66px; left:0; right:0; z-index:5; padding:6px; display:flex; flex-direction:column; gap:2px;
  background:var(--glass); backdrop-filter:blur(24px) saturate(1.5); -webkit-backdrop-filter:blur(24px) saturate(1.5);
  border:1px solid var(--gbd); box-shadow:var(--e2); border-radius:24px; corner-shape:squircle; }
.opcao { height:34px; padding:0 10px 0 14px; display:flex; align-items:center; gap:8px; border:0; border-radius:999px;
  background:{{ o.bg }}; color:var(--tx); font:400 13px/1 Geist,sans-serif; cursor:pointer; text-align:left; }
.opcao:hover { background-color:var(--acs); }
```

### Estados (L231-232)
| | fechado | aberto |
|---|---|---|
| `selBd` | `var(--bd2)` | `var(--tx3)` |
| `selRing` | `none` | `0 0 0 3px var(--ring)` |
| `selChevron` | `none` | `rotate(180deg)` |

Nota: o gatilho do select **não** usa `--deb` (borda visível `--bd2` no lugar do cavado). Opção selecionada: `o.bg = var(--acs)`, `o.chk = 1`; demais `transparent` / `0`. Opções: `['Meta Ads','Google Ads','TikTok Ads','Kwai Ads','Orgânico']`. Escolher fecha via `closePops` (230 ms).

### Movimento
Chevron `.34s` Respiro. Borda/anel: transição universal `.55s`. Lista: **nenhuma animação de entrada declarada** (sem `animation`, sem `data-pop`; o fechamento por `closePops` só limpa o estado).

### Medidas
Gatilho 36, padding 0 12 0 16, gap 8, chevron 14 · lista `top:66px`, padding 6, gap 2, raio 24 · opção 34, padding 0 10 0 14, check 14.

---

## 18. Combobox (Produto — busca com resultado rico)

### Anatomia
```
div (grupo)                                    (sem position:relative)
├─ span rótulo "Produto"
├─ div.caixa  (renderizada já em estado de foco)
│  ├─ span 16×16 color:var(--tx3) {{ ic.search }}
│  └─ input placeholder "Buscar produto"
├─ [se comboOpen] div[data-pop].lista   ← em fluxo normal (não absoluta), empurra o conteúdo abaixo
│  └─ button.resultado × N
│     ├─ span.disco 28 > span 14×14 {{ ic.file }}
│     └─ span.texto > span.titulo ({{ r.a }} <strong>{{ r.b }}</strong> {{ r.c }}) + span.meta {{ r.meta }}
└─ span ajuda "Combobox — busca com resultado rico"
```

### Estilos
```css
.caixa { height:36px; padding:0 14px; display:flex; align-items:center; gap:8px; border:1px solid var(--tx3); border-radius:999px;
  background:var(--sf2); box-shadow:var(--deb), 0 0 0 3px var(--ring); }        /* estado de foco fixado no demo */
.caixa input { flex:1; min-width:0; border:0; background:transparent; outline:none; color:var(--tx); font:400 13px/1 Geist,sans-serif; }
.lista { padding:6px; display:flex; flex-direction:column; gap:2px; background:var(--glass); backdrop-filter:blur(24px) saturate(1.5);
  -webkit-backdrop-filter:blur(24px) saturate(1.5); border:1px solid var(--gbd); box-shadow:var(--e2); border-radius:24px; corner-shape:squircle; animation:{{ popIn }}; }
.resultado { height:46px; padding:0 10px; display:flex; align-items:center; gap:10px; border:0; border-radius:18px; corner-shape:squircle;
  background:transparent; color:var(--tx); cursor:pointer; text-align:left; font-family:Geist,sans-serif; }
.resultado:hover { background-color:var(--acs); }
.disco { width:28px; height:28px; border-radius:14px; corner-shape:squircle; background:var(--sf2); display:flex; align-items:center; justify-content:center; }
.disco > span { display:flex; width:14px; height:14px; }
.texto { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
.titulo { font-size:13px; }  .titulo strong { font-weight:600; }      /* trecho que casa com a busca */
.meta { font-size:11px; color:var(--tx3); }
```

### Estados (L255)
`comboOpen = comboOpen && combo.length>0`; digitar abre; escolher preenche o input e fecha. Filtro por `includes` em minúsculas; `r.a/r.b/r.c` = antes/trecho/depois do match. Meta: `R$ {preço} · {vendas} vendas`.

### Movimento
Lista `{{ popIn }}` (pfPop .38s / pfPopOut .24s forwards).

### Medidas
Caixa 36, padding 0 14, ícone 16 · lista padding 6, gap 2, raio 24 · resultado 46, padding 0 10, raio 18, disco 28/14, ícone 14.

---

## 19. Multi-select com chips (Canais)

### Anatomia
```
div (grupo)
├─ span rótulo "Canais"
├─ div.caixa (wrap)
│  ├─ span.chip × N  {{ c.c }} + button[data-press=ghost].remover > span 12×12 {{ ic.x }}
│  └─ span.placeholder "Adicionar…"
└─ button.ajuda-link "Multi-select · remova um chip · <u>restaurar</u>"
```

### Estilos
```css
.caixa { min-height:36px; padding:4px 12px 4px 4px; display:flex; align-items:center; gap:4px; flex-wrap:wrap;
  border-radius:22px; corner-shape:squircle; background:var(--sf2); box-shadow:var(--deb); }
.chip { height:28px; padding:0 5px 0 12px; display:inline-flex; align-items:center; gap:2px; border-radius:999px;
  background:var(--sf3) var(--grain); box-shadow:var(--sh1); font-size:12px; }
.remover { width:26px; height:26px; margin:-4px -4px -4px -2px; border:0; border-radius:999px; background:transparent; color:var(--tx3);
  display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0; }
.remover:hover { background-color:var(--acs); color:var(--tx); }
.remover > span { display:flex; width:12px; height:12px; }
.placeholder { font-size:13px; color:var(--tx3); padding-left:6px; }
.ajuda-link { align-self:flex-start; border:0; background:transparent; padding:0; font-size:11px; color:var(--tx3); cursor:pointer; }
```

### Estados
Chips iniciais `['Meta Ads','Google Ads','TikTok']`; remover filtra; "restaurar" repõe. Entrada de texto/adição: **não especificado** (o "Adicionar…" é só um span). Foco: **não especificado**. Animação de remoção: **não especificada** (sem data-morph aqui).

### Medidas
Caixa ≥36, padding 4 12 4 4, gap 4, raio 22 squircle · chip 28, padding 0 5 0 12, 12px · remover 26 (ícone 12), margens −4/−4/−4/−2.

---

## 20. Menu de ações (dropdown de botão)

### Anatomia
```
div (grupo)
├─ span rótulo "Menu de ações"
├─ div (position:relative; align-self:flex-start)
│  ├─ button[data-press=sheet].gatilho > span[data-lbl] > span "Black Friday" + span 16×16 color:var(--tx2) {{ ic.moreH }}
│  └─ [se menu] div[data-pop].menu
│     └─ button[data-press=ghost].item × 4 > span 16×16 (color:{{ m.ic }}) {{ m.icon }} + span flex:1 {{ m.l }} + span.atalho {{ m.k }}
└─ span ajuda "Item 34 · ícone 16 · gap 8 · atalho em mono"
```

### Estilos
```css
.gatilho { height:36px; padding:0 12px 0 16px; display:inline-flex; align-items:center; gap:8px; border:1px solid var(--bd); border-radius:999px;
  background:var(--sf3) var(--grain); box-shadow:var(--sh1); color:var(--tx); font:500 13px/1 Geist,sans-serif; cursor:pointer; }
.menu { position:absolute; top:42px; left:0; z-index:6; width:220px; padding:6px; display:flex; flex-direction:column; gap:2px;
  background:var(--glass); backdrop-filter:blur(24px) saturate(1.5); -webkit-backdrop-filter:blur(24px) saturate(1.5);
  border:1px solid var(--gbd); box-shadow:var(--e2); border-radius:24px; corner-shape:squircle; animation:{{ popIn }}; }
.item { height:34px; padding:0 10px 0 12px; display:flex; align-items:center; gap:8px; border:0; border-radius:999px; background:transparent;
  color:{{ m.c }}; font:400 13px/1 Geist,sans-serif; cursor:pointer; text-align:left; }
.item:hover { background-color:var(--acs); }      /* inclusive o destrutivo */
.item .icone { display:flex; width:16px; height:16px; color:{{ m.ic }}; }
.atalho { font-family:'Geist Mono',monospace; font-size:10.5px; color:var(--tx3); }
```

### Estados (L254)
Itens: Editar (pencil, "E"), Duplicar (copy, "⌘D"), Exportar CSV (download), Excluir (trash). `m.c`/`m.ic` = `var(--er)`/`var(--er)` para "Excluir"; demais `var(--tx)`/`var(--tx2)`. Clique fecha de imediato (`menu:false`, sem pfPopOut) e dispara toast.

### Movimento
Gatilho `sheet` (hover e2 + translateY(-1px)). Menu `{{ popIn }}`.

### Medidas
Gatilho 36, padding 0 12 0 16, gap 8, ícone 16 · menu `top:42px` (36 + 6), largura 220, padding 6, gap 2, raio 24 · item 34, padding 0 10 0 12, gap 8, ícone 16, atalho mono 10.5.

---

## 21. Variações de dropdown (só texto · com ícone · grupos e separador · com imagem · múltipla escolha)

Cartão "Variações de dropdown": eyebrow mono 10.5 tx3 "item 36 · ícone 16 · gap 10 · separador 1px com 8px de respiro"; grade `repeat(auto-fill,minmax(200px,1fr)); gap:24px 20px; align-items:start; min-height:84px`.

### Anatomia (comum)
```
div (grupo; position:relative; min-width:0)
├─ span rótulo
├─ div.wrap (position:relative; align-self:flex-start; max-width:100%)
│  ├─ button[data-pop-trigger].gatilho  [+ ícone 16 | avatar 24 | badge contagem]  span.valor  span.chevron 14
│  └─ [se open] div[data-pop].lista (top/bottom/animation = dd.pos)
│     └─ button.item × N
└─ span ajuda
```

### Estilos comuns
```css
.gatilho { max-width:100%; min-width:150px; height:40px; padding:0 12px 0 14px; display:flex; align-items:center; gap:8px;
  border:1px solid var(--bd); border-radius:999px; background:var(--sf3) var(--grain); box-shadow:var(--sh1);
  color:var(--tx); font:400 13px/1 Geist,sans-serif; cursor:pointer; text-align:left; transition:box-shadow 0.3s cubic-bezier(.22,1,.36,1); }
.gatilho:hover { box-shadow:var(--e2); }
.gatilho .valor { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }   /* "com ícone": só flex:1 */
.gatilho .chevron { display:flex; width:14px; height:14px; color:var(--tx3); }
.lista { position:absolute; left:0; min-width:max(100%,210px); top:{{ dd.pos.t }}; bottom:{{ dd.pos.b }}; animation:{{ dd.pos.a }}; z-index:9;
  padding:6px; display:flex; flex-direction:column; gap:2px; background:var(--glass); backdrop-filter:blur(24px) saturate(1.3);
  -webkit-backdrop-filter:blur(24px) saturate(1.3); border:1px solid var(--gbd); box-shadow:var(--e2); border-radius:24px; corner-shape:squircle; }
.item { min-height:36px; padding:0 10px 0 12px; display:flex; align-items:center; gap:10px; border:0; border-radius:999px; background:{{ x.bg }};
  color:var(--tx); font:400 13px/1 Geist,sans-serif; cursor:pointer; text-align:left; white-space:nowrap; transition:background 0.3s cubic-bezier(.22,1,.36,1); }
.item:hover { background-color:var(--acs); }
.item .check { display:flex; width:14px; height:14px; opacity:{{ x.chk }}; }
```
`x.bg` = selecionado `var(--acs)` | `transparent`; `x.chk` = 1 | 0. Escolher chama `closePops` (230 ms com pfPopOut).

### 21.1 Só texto (Ordenação)
Itens `['Mais recentes','Mais antigos','Maior valor','Menor valor']`: `span flex:1 {{ x.l }}` + check.

### 21.2 Com ícone (Troca de visualização)
Gatilho: `span 16×16 color:var(--tx2) {{ dd.icone.icon }}` antes do valor. Item: `span 16×16 color:var(--tx2) {{ x.icon }}` + label + check. Ícones: Tabela `bars`, Gráfico `chart`, Funil `funnel`, Calendário `calendar`.

### 21.3 Grupos e separador (Ações do relatório)
Gatilho com `ic.moreH` 16 (tx2) + "Ações do relatório". Lista `min-width:240px` (sobrescreve o `max(100%,210px)`).
```css
.grupo-titulo { font-size:10.5px; color:var(--tx3); padding:8px 12px 4px; }
.item-grupo { /* .item com */ background:transparent; }   /* ícone 16 tx2 + label flex:1 + atalho mono 10.5 tx3 */
.separador { height:1px; background:var(--bd); margin:4px 10px; }     /* 4px + gap 2 ≈ "8px de respiro" entre itens */
.destrutivo { min-height:36px; padding:0 12px; display:flex; align-items:center; gap:10px; border:0; border-radius:999px; background:transparent;
  color:var(--er); font:400 13px/1 Geist,sans-serif; cursor:pointer; text-align:left; }
.destrutivo:hover { background-color:var(--ers); }
.destrutivo > span { display:flex; width:16px; height:16px; }
```
Grupos: Exportar (CSV ⌘E, Planilha XLSX, PDF do relatório) · Compartilhar (Copiar link ⌘L, Enviar por e-mail) · separador após cada grupo · "Excluir relatório" (trash) no fim. Clique fecha direto (`dd:null`) e toasta.

### 21.4 Com imagem (Pessoas, lojas, produtos)
Gatilho: `span.avatar { width:24px; height:24px; border-radius:999px; background:{{ dd.imagem.col }}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:9.5px; font-weight:500; margin-left:-6px }` + valor com ellipsis + chevron. Lista `min-width:250px`.
```css
.item-imagem { min-height:50px; padding:6px 10px; display:flex; align-items:center; gap:10px; border:0; border-radius:22px; corner-shape:squircle;
  background:{{ x.bg }}; color:var(--tx); cursor:pointer; text-align:left; font-family:Geist,sans-serif; transition:background 0.3s cubic-bezier(.22,1,.36,1); }
.item-imagem:hover { background-color:var(--acs); }
.item-imagem .avatar { flex:none; width:34px; height:34px; border-radius:999px; background:{{ x.c }}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:500; }
.item-imagem .texto { flex:1; display:flex; flex-direction:column; gap:3px; min-width:0; }
.item-imagem .nome { font-size:13px; font-weight:500; }  .item-imagem .papel { font-size:11px; color:var(--tx3); }
```
Pessoas: Carla Prado/CP `var(--v2)`, Rafael Moura/RM `var(--v1)`, Júlia Lima/JL `var(--v4)`, Bruno Sá/BS `var(--v3)`.

### 21.5 Múltipla escolha (fica aberto ao marcar)
Gatilho: valor (lista separada por ", " ou "Nenhum") + `span.badge { height:20px; min-width:20px; padding:0 6px; border-radius:999px; background:var(--ac); color:var(--acf); font-size:10.5px; font-weight:600; display:flex; align-items:center; justify-content:center }` `{{ dd.multi.count }}` + chevron.
Item (`.item` com `background:transparent`):
```css
.checkbox { flex:none; width:18px; height:18px; border-radius:6px; corner-shape:squircle; background:{{ x.bg }}; box-shadow:{{ x.sh }};
  display:flex; align-items:center; justify-content:center; transition:background 0.31s cubic-bezier(.22,1,.36,1); }
.checkbox svg { width:11px; height:11px; viewBox:0 0 24 24; fill:none; stroke:var(--sf); stroke-width:3.2; stroke-linecap:round; stroke-linejoin:round; }
.checkbox path { d:"M4.5 12.5l5 5L19.5 7"; stroke-dasharray:24; stroke-dashoffset:{{ x.off }}; transition:stroke-dashoffset 0.48s cubic-bezier(.22,1,.36,1); }
```
| | desmarcado | marcado |
|---|---|---|
| `x.bg` | `var(--sf2)` | `var(--tx)` |
| `x.sh` | `var(--deb), inset 0 0 0 1px var(--bd2)` | `var(--ink)` |
| `x.off` | `24` | `0` |

Opções `['Pix','Cartão','Boleto','Carteira digital']`; marcar **não** fecha a lista.

### Movimento
Gatilho hover `box-shadow .3s`. Lista `dd.pos.a` (pfPop/pfPopUp .38s, pfPopOut .24s forwards; flip com limiar 300px). Item background `.3s`. Checkbox fundo `.31s`, traço `.48s`.

### Medidas
Gatilho ≥150 × 40, padding 0 12 0 14, gap 8, chevron 14, ícone 16, avatar 24 (ml −6), badge 20 · lista a 6px do gatilho (`calc(100% + 6px)`), ≥210 (240 grupos, 250 imagem), padding 6, gap 2, raio 24 · item ≥36, padding 0 10 0 12, gap 10 · item-imagem ≥50, padding 6 10, raio 22, avatar 34 · checkbox 18, raio 6, traço 11 · separador 1px, margem 4 10 · título de grupo 10.5, padding 8 12 4.

---

## 22. País, bandeira (telefone) e moeda — listas pesquisáveis

Cartão "País, bandeira & moeda": eyebrow "bandeira 22×16 · raio 5 · contorno .5px · busca sem acento"; grade `repeat(auto-fill,minmax(230px,1fr)); gap:24px 20px; align-items:start; min-height:84px; position:relative; z-index:3`.

### 22.1 País

#### Anatomia
```
div (grupo; min-width:0) > rótulo "País"
└─ div.wrap (position:relative; align-self:flex-start; max-width:100%)
   ├─ button[data-pop-trigger].gatilho > span.bandeira 22×16 + span.nome + span.chevron 14 (margin-left:auto)
   └─ [se open] div[data-pop].folha width:260px
      ├─ div.busca > span 14×14 {{ ic.search }} + input[autoFocus] placeholder "Buscar"
      └─ div[data-cslist].lista > button.item × N > span.bandeira 22×16 + span.nome flex:1 + span.check 14
```

#### Estilos
```css
.gatilho { min-width:200px; height:40px; padding:0 12px 0 12px; display:flex; align-items:center; gap:10px; border:1px solid var(--bd); border-radius:999px;
  background:var(--sf3) var(--grain); box-shadow:var(--sh1); color:var(--tx); font:400 13px/1 Geist,sans-serif; cursor:pointer; text-align:left; }
.bandeira { display:block; flex:none; width:22px; height:16px; object-fit:cover; border-radius:5px; box-shadow:0 0 0 .5px rgba(0,0,0,.18);
  background:{{ imgBg }} center/cover no-repeat; }                     /* imgBg = url(data:image/svg+xml…) de FLAGURI[ISO] (fallback EU) */
.gatilho .nome { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.gatilho .chevron { display:flex; width:14px; height:14px; color:var(--tx3); margin-left:auto; }
.folha { position:absolute; left:0; top:{{ cs.pos.t }}; bottom:{{ cs.pos.b }}; z-index:9; width:260px; max-width:calc(100vw - 48px); padding:6px;
  display:flex; flex-direction:column; gap:2px; background:var(--glass); backdrop-filter:blur(24px) saturate(1.3); -webkit-backdrop-filter:blur(24px) saturate(1.3);
  border:1px solid var(--gbd); box-shadow:var(--e2); border-radius:26px; corner-shape:squircle; animation:{{ cs.pos.a }}; }
.busca { height:36px; margin-bottom:4px; padding:0 12px; display:flex; align-items:center; gap:8px; border-radius:999px; background:var(--sf2); box-shadow:var(--deb); color:var(--tx3); }
.busca > span { display:flex; width:14px; height:14px; }
.busca input { flex:1; min-width:0; border:0; background:transparent; outline:none; color:var(--tx); font:400 12.5px/1 Geist,sans-serif; }
.lista { max-height:240px; overflow:auto; overscroll-behavior:contain; display:flex; flex-direction:column; gap:2px; }
.item { min-height:38px; padding:0 10px 0 12px; display:flex; align-items:center; gap:10px; border:0; border-radius:999px; background:{{ x.bg }};
  color:var(--tx); font:400 13px/1 Geist,sans-serif; cursor:pointer; text-align:left; white-space:nowrap; }
.item:hover { background-color:var(--acs); }
.item .nome { flex:1; overflow:hidden; text-overflow:ellipsis; }
.item .check { display:flex; width:14px; height:14px; opacity:{{ x.chk }}; }
```

#### Estados (L373-381)
`x.bg` selecionado `var(--acs)` | `transparent`; `x.chk` 1 | 0. Busca normaliza NFD e remove acentos, compara contra `ISO + nome + DDI`. Abrir zera `q`, foca o input (`autoFocus`) e rola `[data-cslist]` para o topo. Escolher fecha via `closePops`. Países: BR, PT, US, AR, MX, CO, CL, UY, ES, FR, DE, IT, GB, CA, JP, AO. Estado vazio da lista: campo `empty` existe na lógica mas **não há markup** para ele nesta seção.

### 22.2 Telefone com bandeira

#### Anatomia
```
div.wrap (position:relative)
├─ div.campo  (height:40px; sf2; deb)
│  ├─ button[data-pop-trigger].pais > span.bandeira 20×14 + span.chevron 12
│  ├─ span.ddi mono {{ cs.flag.dial }}
│  └─ input[inputmode=tel] placeholder "(11) 98765-4321" mono
└─ [se open] div[data-pop].folha width:280px  (busca + lista; item = bandeira 22×16 + nome flex:1 + ddi mono 11 + check)
```

#### Estilos
```css
.campo { display:flex; align-items:center; height:40px; border-radius:999px; background:var(--sf2); box-shadow:var(--deb); padding:0 14px 0 4px; gap:8px; min-width:240px; }
.pais { height:32px; padding:0 8px 0 8px; display:flex; align-items:center; gap:6px; border:0; border-radius:999px; background:var(--sf3); box-shadow:var(--sh1); cursor:pointer; }
.pais .bandeira { width:20px; height:14px; /* demais como .bandeira */ }
.pais .chevron { display:flex; width:12px; height:12px; color:var(--tx3); }
.ddi { font:400 13px/1 'Geist Mono',monospace; color:var(--tx2); }
.campo input { flex:1; min-width:0; border:0; background:transparent; outline:none; color:var(--tx); font:400 13px/1 'Geist Mono',monospace; }
.folha { /* como 22.1 */ width:280px; }
.item .ddi { font-family:'Geist Mono',monospace; font-size:11px; color:var(--tx3); }
```
Máscara do telefone: **não especificada** (input sem handler nesta seção). Foco do campo: **não especificado**.

### 22.3 Moeda

#### Anatomia
```
button[data-pop-trigger].gatilho min-width:230px > span.simbolo + span.codigo mono 12.5 + span.exemplo mono 12 tx3 + chevron (margin-left:auto)
[se open] div[data-pop].folha width:270px > busca + lista > button.item ≥38 > span.simbolo-lista + span.texto(codigo mono 12 · nome 11 tx3) + check
```

#### Estilos
```css
.gatilho { min-width:230px; /* demais como 22.1 */ }
.simbolo { flex:none; min-width:30px; height:24px; padding:0 6px; border-radius:9px; corner-shape:squircle; background:var(--sf2); box-shadow:var(--deb);
  display:flex; align-items:center; justify-content:center; font:600 11px/1 Geist,sans-serif; }
.codigo { font-family:'Geist Mono',monospace; font-size:12.5px; }
.exemplo { color:var(--tx3); font-family:'Geist Mono',monospace; font-size:12px; }       /* 1250 formatado em style:currency no locale da moeda */
.folha { width:270px; }
.simbolo-lista { flex:none; min-width:34px; height:26px; padding:0 6px; border-radius:9px; corner-shape:squircle; background:var(--sf2); box-shadow:var(--deb);
  display:flex; align-items:center; justify-content:center; font:600 11px/1 Geist,sans-serif; }
.item .texto { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
.item .codigo { font-family:'Geist Mono',monospace; font-size:12px; }
.item .nome { font-size:11px; color:var(--tx3); overflow:hidden; text-overflow:ellipsis; }
```
Moedas: BRL R$, USD US$, EUR €, GBP £, JPY ¥ (0 casas), ARS $, MXN MX$, CLP CLP$ (0 casas).

### Movimento (22.x)
Folha `cs.pos.a` (pfPop/pfPopUp .38s, pfPopOut .24s forwards; flip com limiar 340px; posição `calc(100% + 6px)`).

### Medidas
Gatilho 40, padding 0 12, gap 10, bandeira 22×16 raio 5 contorno .5px · folha 260/280/270, padding 6, gap 2, raio 26 · busca interna 36, mb 4, padding 0 12, ícone 14, input 12.5 · lista máx 240 · item ≥38, padding 0 10 0 12, gap 10 · telefone: campo 40 padding 0 14 0 4 gap 8 ≥240, botão-país 32 padding 0 8 gap 6, bandeira 20×14, chevron 12 · moeda: símbolo 30×24 raio 9 (lista 34×26).

---

## 23. Rodapé de navegação do manual (presente nas três seções)

```css
nav { display:flex; gap:12px; flex-wrap:wrap; padding:48px 0 0; margin-top:24px; border-top:1px solid var(--bd); }   /* nav>* { flex-shrink:0 } global */
nav a { flex:1; min-width:200px; padding:18px 22px; border-radius:32px; corner-shape:squircle; background:var(--sf) var(--grain); border:1px solid var(--bd);
  box-shadow:var(--sh1); display:flex; flex-direction:column; gap:6px; text-align:left; }   /* "Próximo": text-align:right */
nav a:hover { box-shadow:var(--e2); transform:translateY(-1px); }
nav a .eyebrow { font-size:11px; color:var(--tx3); }
nav a .titulo { font:500 17px/1.2 Geist,sans-serif; letter-spacing:-0.015em; }
```
Troca de página do manual: wrapper `div { display:flex; flex-direction:column; animation:pfItemA .6s cubic-bezier(.22,1,.36,1) both }`.

---

## 24. Resumo de medidas transversais

| Elemento | Valor |
|---|---|
| Campo compacto (seção 17) | 36 alto · padding 0 16 (ou 0 14 com ícone) |
| Campo padrão (seções 18/19) | 40 alto · padding 0 16 / 0 14 |
| Campo grande (cartão) | 44 alto |
| Rótulo / ajuda | 12/500 · 11 `--tx3` · gap 6 |
| Texto de campo | 400 13px/1 Geist; numérico 400 13px/1 Geist Mono; datas 12.5 mono |
| Anel de foco | `0 0 0 3px var(--ring)` + borda `var(--tx3)` |
| Anel de estado (ok/erro) | `0 0 0 1px var(--ok|--er)` somado ao `--deb` |
| Ícone no campo | 16 (esquerda), 14 (chevron/limpar/check), 12 (chip ×, bandeira-chevron) |
| Botão interno | 28 (ícone 14 ou 16), hover `--acs` |
| Folha de popover | padding 6 · gap 2 · raio 24 (listas), 26 (país/moeda), 28 (busca/período), 32 (pickers sólidos) |
| Item de lista | 34 (select/menu/presets), 36 (dropdown), 38 (país/moeda), 46 (rico), 50 (com imagem) |
| Distância gatilho→folha | 6px (`calc(100% + 6px)`, `top:42px` para gatilho 36) · pickers `top:70px` / `bottom:calc(100% - 14px)` · busca `top:70px` · select/período `top:66px` |
| Vidro | `var(--glass)` + `blur(24px) saturate(1.5)` (seção 17/19 básicos) ou `saturate(1.3)` (período, variações, país) + borda `var(--gbd)` + `--e2` |
| Folha sólida | `var(--sf3) var(--grain)` + borda `var(--bd)` + `--e2` (pickers de data/hora) |
| Entrada / saída de popover | `pfPop|pfPopUp .38s cubic-bezier(.22,1,.36,1)` / `pfPopOut .24s cubic-bezier(.4,0,.6,1) forwards` (230 ms até desmontar) |

## 25. Placeholders não resolvidos / lacunas

- `{{ ic.* }}`: só o nome do ícone é conhecido (search, x, clock, lock, eye, eyeOff, minus, plus, calendar, chevronDown/Left/Right, check, upload, file, target, wallet, checkCircle, alert, shield, moreH, trash, pencil, copy, download, bars, chart, funnel, link, mail, receipt, user); os paths SVG estão em `dc.src` (`P`) e não foram transcritos.
- `{{ brand.mask }}` / `{{ imgBg }}`: data-URIs SVG em `BRANDURI` / `FLAGURI` (não transcritos).
- Cor de `::placeholder` (exceto password), foco das caixas com prefixo/sufixo, das máscaras, das chips e do telefone: não especificados no DOM.
- Auto-resize do textarea e entrada de texto no multi-select: não existem no código.
- `data-pw-ov`, borrão/fio de digitação e morph do upload são gerados por JS (§0.7, §0.8, §6.1), não por CSS declarativo.
