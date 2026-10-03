# Identidade 墨 — Dados, Tabela, Padrões de tela e Responsivo

> Especificação extraída do DOM renderizado do manual Identidade (seções 22–27: KPIs, Gráficos, Progresso, Tabela, Telas compostas, Responsivo & mobile) e dos fundamentos 04–06 (Cores, Tipografia, Espaço). Fonte: `scratchpad/sumi/sections/28..33-*.html`, `04..06-*.html`, lógica em `dc.src`, CSS global em `style1.css`, tokens em `origem/base.css`.
>
> Regras de leitura:
> - Cada bloco "Estilos" reproduz as declarações **exatamente** como estão no atributo `style` do elemento, mantendo os nomes `var(--x)`.
> - `{{ placeholder }}` no HTML foi resolvido via `dc.src`; o valor calculado está anotado. Quando não foi possível resolver, está marcado **não especificado**.
> - `style-hover="..."` é um atributo do renderizador do manual: as declarações nele são aplicadas em `:hover` (equivale a uma regra `:hover`). Não há CSS em `dc.src` para isso.
> - `sc-camel-on-*` são handlers de evento (`onMouseEnter`, `onClick`, etc.). `sc-for`/`sc-if` são repetição/condicional do template; não geram elemento no DOM final.
> - `corner-shape: squircle` aparece em todo container com raio ≥ 18px. Deve ser preservado (com fallback silencioso onde não suportado).
> - Todas as curvas: `cubic-bezier(.22,1,.36,1)` = `--ease` ("Respiro"); `cubic-bezier(.65,0,.35,1)` = `--ease-move` ("Maré"); `cubic-bezier(.34,1.22,.64,1)` = `--ease-spring` ("Folha"); `cubic-bezier(.4,0,.6,1)` = `--ease-out`; `cubic-bezier(.34,1.28,.64,1)` é uma variante mais elástica usada em "pop" de ícone (não tem token).

---

## Física global (vale para tudo abaixo)

Do `style1.css` (manual) / `origem/base.css` (tokens). Os dois são equivalentes salvo onde anotado.

```css
*, *::before, *::after {
  transition-property: background-color, border-color, color, box-shadow, transform, opacity, filter, outline-color;
  transition-duration: .55s;                 /* origem/base.css: var(--t-default) = 550ms */
  transition-timing-function: cubic-bezier(.22,1,.36,1);
}
input, textarea { transition-property: background-color, border-color, color, box-shadow; }
[data-instant], [data-instant] * { transition: none !important; }
html, body { font-family: Geist, -apple-system, sans-serif; font-size: 13px; -webkit-font-smoothing: antialiased; background: var(--bg) var(--grain); color: var(--tx); }
a, button { -webkit-tap-highlight-color: transparent; }
@media (prefers-reduced-motion: reduce) { * { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
```

Toque (`data-press`):

```css
[data-press] { white-space: nowrap; max-width: 100%; transition: transform .45s var(--ease), box-shadow .5s var(--ease), filter .45s var(--ease), background .45s var(--ease); }
[data-press]:active { transition-duration: .1s; }
[data-press="ink"]:active   { transform: translateY(1px) scale(.97) !important; box-shadow: var(--inkp) !important; filter: brightness(.88); }
[data-press="sheet"]:hover  { box-shadow: var(--e2) !important; transform: translateY(-1px); }
[data-press="sheet"]:active { transform: translateY(1px) scale(.98) !important; box-shadow: var(--deb) !important; }
[data-press="ghost"]:active { transform: scale(.97); }
```

Indicador deslizante (`data-slide` / `data-ind` / `data-on`) — usado em segmentado, tab bar e navegação lateral. Lógica (`dc.src` `slideAll`): o `[data-ind]` recebe `width = ativo.offsetWidth`, `height = ativo.offsetHeight` (ou `2px` se `data-ind="line"`, posicionado em `offsetTop+offsetHeight-2`), `transform: translate(ativo.offsetLeft, ativo.offsetTop)`, `opacity: 1`; sem item ativo → `opacity: 0`. `data-ready` é setado após 2 `requestAnimationFrame` (primeira posição sem transição). Recalcula em resize, em mutação de `data-on` e no `document.fonts.ready`.

```css
[data-slide] { position: relative; }
[data-ind] { position: absolute; left: 0; top: 0; opacity: 0; pointer-events: none; will-change: transform, width; }
[data-slide][data-ready] > [data-ind] { transition: transform .55s var(--ease), width .55s var(--ease), opacity .3s; }   /* origem/base.css acrescenta height .55s var(--ease) */
[data-slide] > :not([data-ind]) { position: relative; z-index: 1; }
```

Colapso (`data-collapse`, usado nas mensagens de erro dos formulários):

```css
[data-collapse] { display: grid; grid-template-rows: 0fr; opacity: 0; margin-top: calc(var(--g,0px) * -1); filter: blur(2px);
  transition: grid-template-rows .6s var(--ease), opacity .45s var(--ease), margin-top .6s var(--ease), filter .5s var(--ease); }
[data-collapse][data-open="true"] { grid-template-rows: 1fr; opacity: 1; margin-top: 0; filter: none; }
[data-collapse] > * { overflow: hidden; min-height: 0; }
```

`--g` é o gap do container pai (para o item fechado não "ocupar" o gap): login usa `--g: 18px`, boas-vindas `--g: 16px`.

Morph de conteúdo (`data-morph`, lógica JS em `dc.src` L109–116) — containers cujo conteúdo troca por estado (login, boas-vindas, cards de erro/conexão):
- Ao detectar mudança de HTML interno (ignorando diffs < 6 caracteres com o mesmo número de tags): clona o conteúdo anterior num ghost `position:absolute` (mesmo padding/display/flex-direction/align-items/gap do container, `z-index:0`, `pointer-events:none`, `data-instant`).
- Container: `position: relative` se estático; `overflow: hidden` durante a troca; anima `height` de `prev → novo` em **620ms** `--ease` (só se diferença > 1px).
- Ghost sai: `{opacity:1; filter:blur(0); transform:none} → {opacity:0; filter:blur(4px); transform:translateY(-4px) scale(.99)}` em **380ms** `cubic-bezier(.4,0,.6,1)` `fill:forwards`.
- Filhos novos entram: `{opacity:0; filter:blur(4px); transform:translateY(6px) scale(.99)} → {opacity:1; filter:blur(0); transform:none}` em **620ms** `--ease`, `delay: 120ms + i·30ms`, `fill:backwards`. Animações inline dos filhos (`animation:`) são zeradas durante o morph.
- Ghost removido após **760ms**.

Pulso de digitação (JS, `dc.src` L118–119): ao digitar em `input`/`textarea` (exceto `range`, `file`, `opacity:0`), o container arredondado mais próximo (raio ≥ 18px, sem passar por `[data-morph]` ou `section`) anima `{transform:scale(1); outline:0 solid transparent; outline-offset:0} → 30%: {transform:scale(1.0015); outline:1px solid var(--ring); outline-offset:1px} → {transform:scale(1); outline:1px solid transparent; outline-offset:2px}` em **480ms** `--ease`, no máximo uma vez a cada 140ms.

Revelação ao rolar: seções abaixo da dobra recebem `data-reveal`; `IntersectionObserver` (`rootMargin: 0 0 -8% 0`, `threshold: .04`) seta `data-in`.

```css
[data-reveal] { opacity: 0; transform: translateY(18px); transition: opacity .75s var(--ease), transform .75s var(--ease); }  /* origem/base.css: .9s */
[data-reveal][data-in] { opacity: 1; transform: none; }
```

Ícones (`IC.*`): `<svg data-icon="1" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block">`, com `pathLength="100"` em todo `path/circle/rect`. O tamanho vem sempre do `<span style="display:flex;width:Npx;height:Npx">` que o envolve.

```css
[data-ai] svg { transform-box: fill-box; transform-origin: center; }
[data-ai]:hover svg * { stroke-dasharray: 100; animation: pfDraw .7s cubic-bezier(.65,0,.35,1) both; }
[data-draw] svg * { stroke-dasharray: 100; animation: pfDraw 1.1s cubic-bezier(.22,1,.36,1) .25s both; }
```

### Keyframes usados nestas seções

Nomes do manual (`pf*`) com o equivalente em `origem/base.css` (`sumi*`) quando existe.

| Manual | origem/base.css | Definição |
|---|---|---|
| `pfPing` | `sp-Ping` | `0% {transform:scale(1); opacity:.6} 100% {transform:scale(2.6); opacity:0}` |
| `pfSpin` | `sp-Spin` | `to {transform:rotate(360deg)}` |
| `pfRise` | `sp-Rise` | `from {opacity:0; transform:translateY(10px) scale(.975)} to {opacity:1; transform:none}` |
| `pfFade` | `sp-Fade` | `from {opacity:0} to {opacity:1}` |
| `pfBlurIn` | `sp-BlurIn` | `from {backdrop-filter:blur(0) saturate(1); -webkit-backdrop-filter:blur(0) saturate(1)}` |
| `pfItemA` / `pfItemB` | `sp-Item` | `from {opacity:0; transform:translateY(8px)}` (A/B idênticos; alternam para reiniciar a animação) |
| `pfDraw` | `sp-Draw` | `from {stroke-dashoffset:100} to {stroke-dashoffset:0}` |
| `pfIndet` | **ausente** | `from {transform:translateX(-100%)} to {transform:translateX(260%)}` |
| `pfSideIn` | **ausente** (só `sp-DrawerIn` da direita) | `from {transform:translateX(-104%)} to {transform:none}` |
| `pfMailIn` | **ausente** | `0% {opacity:0; transform:translateY(-16px) rotate(-8deg) scale(.9)} 60% {opacity:1; transform:translateY(2px) rotate(1deg)} 100% {transform:none}` |
| `pfBadgeIn` | **ausente** | `from {opacity:0; transform:scale(.4)}` |

---

## Fundamentos (compacto)

### Cores — papéis

Texto do manual: *"Quase monocromático. Cor só comunica estado e séries de dados. Ação é sempre tinta — escura no Papel, clara no Carvão."*

Confirmados idênticos a `origem/base.css` (Papel / Carvão): `--bg`, `--sf`, `--sf2` ("Afundado"), `--sf3` ("Elevado"), `--bd`, `--bd2` ("Borda forte"), `--tx`, `--tx2`, `--tx4`, `--ac`, `--ok/--oks`, `--er/--ers`, `--wa/--was`, `--in/--ins`, `--v0..--v5`.

**Divergência encontrada:** a tabela "Tinta" do manual lista `--tx3` (Terciário) como `#9a948a` no Papel; `origem/base.css` e `style1.css` definem `--tx3: #8f897f`. O CSS (`#8f897f`) é o valor efetivamente renderizado; o `#9a948a` é só o rótulo da amostra. Carvão bate (`#80786a`).

Observações sobre `origem/base.css`: `--v6`, `--veil`, `--vig`, `--shu` estão declarados duas vezes em cada tema (mesmo valor; inofensivo). `style1.css` serializa o `--grain` com atributos `sc-camel-base-frequency` etc. (quebrado); use o `--grain` de `origem/base.css`.

Papéis usados em dados:

| Papel | Token | Uso no manual |
|---|---|---|
| Identidade 墨 | `--v0` | tinta · série principal (= `--tx`) |
| Ai 藍 | `--v1` | índigo · 2ª categoria |
| Asagi 浅葱 | `--v2` | verde-água · 3ª |
| Kaki 柿 | `--v3` | caqui · 4ª |
| Fuji 藤 | `--v4` | glicínia · 5ª |
| Hai 灰 | `--v5` | cinza · "Outros" e comparação tracejada |
| Shu 朱 | `--er` / `--shu` | erro, atenção, **ao vivo**; "nunca é série: é o selo" |
| Estados | `--ok/--oks`, `--er/--ers`, `--wa/--was`, `--in/--ins` | sempre em par: tinta + fundo suave |

Regras de uso (texto literal do manual):
- "1 série → só Identidade (tinta). Comparação com período anterior → Identidade + Hai tracejado."
- "Categorias → ordem fixa: Identidade, Ai, Asagi, Kaki, Fuji. A partir da 6ª, agrupar em "Outros" (Hai). Shu nunca é série: é o selo."
- "Verde e vermelho de estado nunca viram série — só sinalizam variação (+/−)."

Lavagem de tinta (escala sequencial `sumi-100 → 700`, para heatmap/intensidade/ranking de uma métrica): `background: var(--v0)` com `opacity` em **0.06, 0.14, 0.26, 0.42, 0.6, 0.78, 1**. Texto: *"Como no sumi-e: a mesma tinta, mais ou menos diluída."*

Amostras do manual (medidas): swatch neutro `height:88px; border:1px solid var(--bd); border-radius:36px; corner-shape:squircle`; chip de estado `height:22px; padding:0 8px; border-radius:999px; background:var(--Xs); color:var(--X); font-size:11px; font-weight:500`; ícone de estado `28×28`, `border-radius:9px`, ponto interno `8×8` `border-radius:99px`.

### Tipografia — escala

Texto: *"Geist para tudo; Geist Mono para IDs, tokens e valores tabulares. Números grandes usam peso leve e tracking negativo — o dado é o herói, não o rótulo."*

| Nome | size / line-height | weight | letter-spacing | cor | obs |
|---|---|---|---|---|---|
| Número XL | 72px / 1.0 | 300 | −0.05em | `--tx` | |
| Número L | 44px / 1.0 | 400 | −0.04em | `--tx` | |
| Display | 40px / 1.05 | 500 | −0.035em | `--tx` | |
| H1 · página | 28px / 1.15 | 500 | −0.025em | `--tx` | |
| H2 · seção | 22px / 1.2 | 500 | −0.02em | `--tx` | |
| H3 · card | 17px / 1.3 | 500 | −0.015em | `--tx` | |
| H4 · grupo | 14px / 1.35 | 600 | −0.01em | `--tx` | |
| Corpo L | 14px / 1.6 | 400 | 0 | `--tx` | |
| Corpo | 13px / 1.5 | 400 | 0 | `--tx` | padrão (`html { font-size: 13px }`) |
| Pequeno | 12px / 1.45 | 400 | 0 | `--tx2` | |
| Legenda | 11px / 1.4 | 400 | 0 | `--tx2` | |
| Overline | 11px / 1.4 | 500 | +0.06em | `--tx2` | `text-transform: uppercase` |
| Mono | 12px / 1.5 | 400 | 0 | `--tx` | `'Geist Mono', monospace` · tabular |

Parágrafo: `font-size:14px; line-height:1.6; color:var(--tx2); text-wrap:pretty`, máx. 64ch. Hierarquia num card de dado: rótulo `12px --tx3` → número `400 44px/1 Geist, letter-spacing:-0.04em` → apoio `13px --tx2 line-height:1.5` ("Uma frase só").

Na prática das seções de dados os números usam peso **300** (não 400): KPI 32px/−0.04em, total do gráfico 40px/−0.045em, projeção 40px/−0.045em, ensō 30px/−0.035em, donut 26px/−0.03em, medidor 30px/−0.03em, KPI mobile 22px/−0.03em, anel 22px/−0.035em. Fonte do manual `fonts.googleapis.com` Geist 300–700 + Geist Mono 400/500.

### Espaço & grid

Texto: *"Base de 4px. Respiro é conteúdo: quanto mais importante o bloco, mais espaço ao redor."*

| Token | px | Uso |
|---|---|---|
| `--space-1` | 4 | Ícone ↔ texto (sm), dentro de badges |
| `--space-1-5` | 6 | Ícone ↔ texto (md) |
| `--space-2` | 8 | Ícone ↔ texto (lg), itens de lista |
| `--space-3` | 12 | Entre controles, padding de campo |
| `--space-4` | 16 | Gutter do grid, padding de card sm |
| `--space-5` | 20 | Padding de card |
| `--space-6` | 24 | Padding de card L, entre cards |
| `--space-8` | 32 | Padding da página |
| `--space-12` | 48 | Entre blocos |
| `--space-16` | 64 | Entre seções |

Confere com `origem/base.css`. Grid: **12 colunas · gutter 16 · margem 32 · máx 1280**; exemplo: 4× `KPI · 3`, `Gráfico · 8` + `Lista · 4`. Shell: sidebar flutuante **232 / 64 px · respiro 16**; topbar pill **h 52 · sticky top 16**; padding de conteúdo **32 desktop · 16 mobile**; breakpoints **640 · 1024 · 1440**.

Raios observados nas seções de dados (não há token para 40/48; `origem/base.css` define `--r-sm:18 --r-md:28 --r-lg:36 --r-xl:44 --r-2xl:56`): card KPI **40px**; card de gráfico/progresso **44px**; card de gráfico principal e tabela de tipografia **48px**; moldura de demonstração **56px**; card mobile KPI **28px**, card mobile de gráfico **32px**; card de estado de página **40px**; tooltip **18px**; barra de gráfico **10px**; célula do heatmap **5px**; barra da cascata **7px**.

### Chrome de seção do manual (para referência, não é componente de produto)

```css
section { padding: 40px 0 56px; display: flex; flex-direction: column; gap: 28px; scroll-margin-top: 90px; }
section > header { display: flex; flex-direction: column; gap: 8px; }
eyebrow { font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--tx3); }
h2 { margin: 0; font: 500 32px/1.1 Geist, sans-serif; letter-spacing: -0.03em; }
p { margin: 0; color: var(--tx2); max-width: 560px..620px; line-height: 1.55; }
strong { color: var(--tx); font-weight: 500; }
nav[aria-label="Paginação do manual"] { display: flex; gap: 12px; flex-wrap: wrap; padding: 48px 0 0; margin-top: 24px; border-top: 1px solid var(--bd); }
nav a { flex: 1; min-width: 200px; padding: 18px 22px; border-radius: 32px; corner-shape: squircle; background: var(--sf) var(--grain); border: 1px solid var(--bd); box-shadow: var(--sh1); display: flex; flex-direction: column; gap: 6px; }
nav a:hover { box-shadow: var(--e2); transform: translateY(-1px); }
nav a > small { font-size: 11px; color: var(--tx3); }
nav a > strong { font: 500 17px/1.2 Geist, sans-serif; letter-spacing: -0.015em; }
```

---

## Card (superfície base de dados)

Todos os cards desta família compartilham:

```css
.card { background: var(--sf) var(--grain); border: 1px solid var(--bd); box-shadow: var(--sh1); corner-shape: squircle; display: flex; flex-direction: column; }
```

Variações de raio/padding/gap por uso:

| Uso | border-radius | padding | gap |
|---|---|---|---|
| KPI | 40px | 22px 24px | 14px |
| Gráfico principal (linha) | 48px | 28px 32px | 20px (+ `min-width:0; overflow:hidden`) |
| Projeção / Cascata / Heatmap / Funil / Pigmento | 44px | 26px 28px | 14px |
| Barras / Donut / Empilhada | 44px | 26px 28px | 18px |
| Progresso (linear/segmentado) | 44px | 28px | 24px (+ `justify-content:center`) |
| Ensō / anéis | 44px | 28px | 18px (+ `align-items:center; text-align:center`) |
| Tabela | 44px | 8px | — (+ `overflow-x:auto`) |
| Login / Boas-vindas (dentro da moldura) | 44px | 32px 28px | 18px / 16px (+ `box-shadow: var(--e2)` sobrescrevendo `--sh1`, `width:min(360px,100%)`) |
| Configurações / Criar conta | 44px | 28px | 20px / 16px |
| Estados de página (404, offline, sem permissão, erro) | 40px | 28px | 12px (+ `align-items:flex-start`; os interativos têm `min-height:236px`) |

Cabeçalho de card de dados (padrão repetido):

```css
.card-head { display: flex; justify-content: space-between; align-items: baseline; }
.card-title { font: 500 15px/1 Geist, sans-serif; }
.card-meta  { font-family: 'Geist Mono', monospace; font-size: 10.5px; color: var(--tx3); }
```

Hover (só no KPI): `style-hover="box-shadow:var(--e2)"`.

---

## Odômetro

Componente de número: cada dígito rola para cima quando sobe e para baixo quando desce. Usado em KPI (32px), total do gráfico (40px), KPI mobile/tablet/desktop do shell responsivo (22px).

### Anatomia

```
span[aria-hidden="true"]  .odo              (inline-flex, máscara vertical)
  ├─ span .odo-digit  (por dígito numérico)  overflow:hidden; height:1em
  │    └─ span .odo-col  (coluna 0–9, translateY)
  │         ├─ span "0" (height:1em)
  │         ├─ … 
  │         └─ span "9" (height:1em)
  └─ span .odo-sep    (por separador: ".", ",", "R", "$", " ", "k", "x" …)  white-space:pre
```

O texto acessível não está no odômetro (`aria-hidden`); **não especificado** no HTML como o valor é exposto a leitores de tela.

### Estilos

```css
.odo {
  display: inline-flex; align-items: flex-start; white-space: nowrap;
  font: 300 32px/1 Geist, sans-serif;            /* KPI; variantes abaixo */
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  height: 1em; padding: .06em 0; box-sizing: content-box;
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 16%, #000 84%, transparent 100%);
  mask-image:         linear-gradient(180deg, transparent 0, #000 16%, #000 84%, transparent 100%);
}
.odo-digit { display: inline-block; height: 1em; overflow: hidden; }
.odo-col   { display: flex; flex-direction: column; transform: translateY(-(d*10)%); transition: transform .9s cubic-bezier(.22,1,.36,1) <delay>; }
.odo-col > span { height: 1em; }
.odo-sep   { display: inline-block; height: 1em; white-space: pre; }
```

Variantes de fonte observadas:

| Contexto | `font` | `letter-spacing` |
|---|---|---|
| KPI (desktop) | `300 32px/1 Geist, sans-serif` | −0.04em |
| Total do gráfico de linha | `300 40px/1 Geist, sans-serif` | −0.045em |
| KPI no shell responsivo (celular, tablet, desktop) | `300 22px/1 Geist, sans-serif` | −0.03em |

### Lógica (`dc.src` L176 `odo(key,val)`)

- `val` é a string formatada (ex.: `brl(184320)` = `R$ 184.320`). Cada caractere vira um grupo: `isNum = /\d/.test(ch)`; não-dígito → separador com `ch`.
- `ty = translateY(-(dígito × 10)%)` (coluna de 10 itens de 1em → 10% por dígito).
- Delay por dígito: `d = (dígitoAnteriorNaMesmaPosiçãoDoFim !== dígitoAtual ? fe × 55 : 0) + 'ms'` onde `fe` é a distância do fim da string (unidade = 0ms, dezena = 55ms, centena = 110ms …). Dígitos que não mudaram não têm delay. O estado anterior é guardado por `key`.
- Comparação é feita a partir do **final** da string, para que o crescimento de casas não desloque os dígitos.

### Movimento

- `transform .9s cubic-bezier(.22,1,.36,1)` + delay escalonado 55ms por casa, do menos ao mais significativo.
- Dados ao vivo: a cada **3000ms** (`setInterval`), se `live` e documento visível: `kpi += round(random × 1400)`, e a série do gráfico desloca 1 ponto (`nv = clamp(36000, 98000, último + (random − .46) × 7000)`).

### Medidas

Altura de linha = `1em` + `.06em` acima/abaixo (padding). A máscara esconde 16% no topo e no fundo.

---

## KPI

### Anatomia

```
div .kpi  (card, style-hover="box-shadow:var(--e2)")
  ├─ div .kpi-head  (flex, space-between, center)
  │    ├─ span .kpi-label           "Receita"
  │    └─ span .kpi-delta           (pílula)
  │         ├─ span .kpi-delta-icon  (12×12: IC.arrowUpRight | IC.arrowDown)
  │         └─ "+12,4%"
  ├─ span .odo                       (Odômetro 32px)
  └─ svg .sparkline  viewBox="0 0 120 36" preserveAspectRatio="none"
       └─ path d={{ k.line }} fill="none" stroke="var(--tx)" stroke-width="1.25" vector-effect="non-scaling-stroke"
```

### Estilos

```css
.kpi { background: var(--sf) var(--grain); border: 1px solid var(--bd); box-shadow: var(--sh1); border-radius: 40px; corner-shape: squircle; padding: 22px 24px; display: flex; flex-direction: column; gap: 14px; }
.kpi:hover { box-shadow: var(--e2); }
.kpi-head { display: flex; justify-content: space-between; align-items: center; }
.kpi-label { font-size: 12px; color: var(--tx2); }
.kpi-delta { height: 22px; padding: 0 8px 0 6px; border-radius: 999px; background: var(--oks) | var(--ers); color: var(--ok) | var(--er); font-size: 11px; font-weight: 500; display: inline-flex; align-items: center; gap: 2px; }
.kpi-delta-icon { display: flex; width: 12px; height: 12px; }
.sparkline { width: 100%; height: 36px; display: block; overflow: visible; }
.sparkline path { fill: none; stroke: var(--tx); stroke-width: 1.25; vector-effect: non-scaling-stroke; }
```

### Dados de exemplo (`dc.src` L190–191)

| label | value | delta | positivo? | série |
|---|---|---|---|---|
| Receita | `brl(s.kpi)` (inicial 184320 → "R$ 184.320"; cresce ao vivo) | +12,4% | sim | `walk(20,50,10,3)` |
| CAC | R$ 38,20 | −6,1% | **sim** (queda de CAC é boa → verde) | `walk(20,50,8,5,0.55)` |
| ROAS | 4,82x | +0,6x | sim | `walk(20,50,9,9)` |
| Reembolsos | R$ 2.140 | +3,2% | não (vermelho) | `walk(20,50,7,13)` |

`c = pos ? var(--ok) : var(--er)`; `bg = pos ? var(--oks) : var(--ers)`; `icon = pos ? IC.arrowUpRight : IC.arrowDown`. A cor segue a **semântica** (bom/ruim), não o sinal.

Sparkline: `spark(v,120,36)` → `pts(vals, W, H, pt=.14, pb=.06)` (14% de folga no topo, 6% embaixo) + `smooth()` (Catmull-Rom → cúbica com fator 1/6). `walk(n,start,vol,seed,drift=.45)`: random walk com piso `start×0.5`.

### Estados

- Padrão; hover (sombra `--e2`). Loading/skeleton, vazio e erro: **não especificado** nesta seção (ver "Estados de página" em Padrões para o card de erro de bloco).
- Ao vivo: o número rola via odômetro a cada 3s; o manual diz *"Valores marcados com {{ liveDot }} recebem dados ao vivo"* — mas nenhum KPI desta grade renderiza o `liveDot` (só o gráfico de linha).

### Movimento

Odômetro `.9s --ease` com stagger 55ms/casa. Hover: `box-shadow` pela transição global `.55s --ease`. Sparkline **não** anima (sem transição em `d`).

---

## Grid de KPIs

```css
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
```

4 itens. No shell responsivo o grid de KPIs é diferente (ver Responsivo): celular/tablet `repeat(2, minmax(0,1fr))` gap 10; desktop `repeat(4, minmax(0,1fr))` gap 10, card compacto (raio 28, padding 14px 16px, gap 8, rótulo 11px, número 22px, delta `font-size:10.5px; color: k.c` sem pílula).

Grid de cards de gráfico abaixo dos KPIs: `display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:16px` (projeção/cascata/heatmap); gráficos secundários `minmax(320px,1fr)` gap 16; progresso `minmax(280px,1fr)` gap 16.

---

## Ponto "ao vivo" (`liveDot`)

Elemento React (`dc.src` L205), inserido inline ao lado de títulos.

### Anatomia

```
span .live  (position:relative; 8×8; inline-flex)
  ├─ span .live-ping   (só quando s.live && liveData !== false)
  └─ span .live-dot
```

### Estilos

```css
.live { position: relative; width: 8px; height: 8px; display: inline-flex; }
.live-ping { position: absolute; inset: 0; border-radius: 99px; background: var(--ok); animation: pfPing 1.6s ease-out infinite; }
.live-dot  { position: relative; width: 8px; height: 8px; border-radius: 99px; background: var(--ok); }   /* s.live=false → background: var(--tx4) e sem ping */
```

Nota: a seção de cores diz que Shu (`--er`) é a cor de "ao vivo", mas o `liveDot` renderizado usa `--ok`. Documentado como está no DOM.

---

## Spinner (`spin14`, `spin20`)

```css
.spin { width: 14px | 20px; height: 14px | 20px; border-radius: 99px; border: 1.5px solid currentColor; border-right-color: transparent; display: inline-block; animation: pfSpin .7s linear infinite; }
```

Nos padrões de tela o `spin20` fica dentro de `<span style="display:flex;width:24px;height:24px">` (caixa 24 com anel 20). Cor = `currentColor` do contexto (normalmente `--tx`).

---

## Projeção do mês (linha + área + kasure + linha de meta)

### Anatomia

```
div .card (44px, 26px 28px, gap 14)
  ├─ div .card-head → span.title "Projeção do mês" · span.meta "dia 21 de 31"
  ├─ div .proj-value (flex; align-items:baseline; gap:10px)
  │    ├─ span .proj-end    "R$ 272k"  (font 300 40px/1, ls −0.045em)   ← {{ proj.end }}
  │    └─ span .proj-pct    "151% da meta" (pílula ok)                  ← {{ proj.pct }}
  ├─ div .proj-plot (position:relative; height:140px)
  │    ├─ svg viewBox="0 0 300 140" preserveAspectRatio="none" (absolute inset 0; overflow visible)
  │    │    ├─ path .area  d={{ proj.area }} fill="var(--tx)" opacity=".06"
  │    │    ├─ path .line  d={{ proj.line }} stroke="var(--tx)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"
  │    │    └─ path .kasure d={{ proj.proj }} stroke="var(--tx)" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round" vector-effect="non-scaling-stroke"
  │    ├─ div .target-line  (absolute; top:{{ proj.ty }})
  │    └─ span .target-label "meta R$ 180k"
  └─ div .legend (flex; gap:16px; font-size:11px; color:var(--tx2))
       ├─ span (gap 6) → span.swatch-solid + "Realizado R$ 142,3k"   ← {{ proj.now }}
       └─ span (gap 6) → span.swatch-dotted + "Projeção (kasure)"
```

### Estilos

```css
.proj-value { display: flex; align-items: baseline; gap: 10px; }
.proj-end   { font: 300 40px/1 Geist, sans-serif; letter-spacing: -0.045em; }
.proj-pct   { height: 22px; padding: 0 8px; border-radius: 999px; background: var(--oks); color: var(--ok); font-size: 11px; font-weight: 500; display: inline-flex; align-items: center; }
.proj-plot  { position: relative; height: 140px; }
.proj-plot svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.target-line  { position: absolute; left: 0; right: 0; top: <ty%>; border-top: 1px solid var(--er); opacity: .6; }
.target-label { position: absolute; right: 0; top: <ty%>; transform: translateY(-120%); font-family: 'Geist Mono', monospace; font-size: 10px; color: var(--er); }
.legend { display: flex; gap: 16px; font-size: 11px; color: var(--tx2); }
.legend > span { display: flex; align-items: center; gap: 6px; }
.swatch-solid  { width: 14px; height: 2px; background: var(--tx); }
.swatch-dotted { width: 14px; border-top: 2px dotted var(--tx); }
```

### Lógica (`dc.src` L267)

`W=300, H=140, days=31, today=21, target=180`. Acumulado diário `acc += 4.6 + r()×4.4` (seed 77) por 21 dias; `rate = acc/today`; `end = rate×days`; `mx = max(end,target)×1.08`; `X(d) = d/(days−1)×W`; `Y(v) = H − v/mx×H`. `line` = polilinha `M…L…` dos 21 pontos (sem suavização); `area` = line + `L X(20),H L0,H Z`; `proj` = segmento reto de `(X(20),Y(acc))` a `(W,Y(end))`; `ty = Y(target)/H×100 %`. Textos: `now = "R$ " + acc.toFixed(1)+"k"` (vírgula), `end = "R$ " + end.toFixed(0)+"k"`, `pct = round(end/target×100)+"%"`.

### Movimento

Nenhuma transição específica (estático; valores são determinísticos por seed).

---

## Cascata de lucro (waterfall horizontal)

### Anatomia

```
div .card (44px, 26px 28px, gap 14)
  ├─ div .card-head → "Cascata de lucro" · "setembro"
  ├─ div .wf (flex column; gap 8px)
  │    └─ div .wf-row × 6  (grid 110px / 1fr / 72px; gap 10; onMouseEnter/Leave)
  │         ├─ span .wf-name
  │         ├─ div .wf-track (relative; height 20px)
  │         │    └─ div .wf-bar (absolute; left:{{ w.l }}; width:{{ w.w }})
  │         └─ span .wf-val (mono, right)
  └─ span .wf-note "Tinta = entra e fica · papel cavado = sai"  (margin-top:auto)
```

### Estilos

```css
.wf-row  { display: grid; grid-template-columns: 110px minmax(0,1fr) 72px; gap: 10px; align-items: center; opacity: 1 | .45; transition: opacity 0.3s cubic-bezier(.22,1,.36,1); cursor: default; }
.wf-name { font-size: 12px; color: var(--tx) | var(--tx2); font-weight: 400 | 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wf-track{ position: relative; height: 20px; }
.wf-bar  { position: absolute; top: 0; bottom: 0; left: <l%>; width: <w%>; border-radius: 7px; background: var(--tx) | var(--sf2); box-shadow: none | inset 0 0 0 1px var(--bd2); }
.wf-val  { font-family: 'Geist Mono', monospace; font-size: 11px; text-align: right; color: var(--tx) | var(--tx2); font-weight: 400 | 600; }
.wf-note { font-size: 11px; color: var(--tx3); margin-top: auto; }
```

### Lógica (`dc.src` L268)

Itens: Receita bruta 184,3 (`in`) · Mídia −68,2 · Taxas do gateway −9,4 · Reembolsos −5,1 · Impostos −11,0 (`out`) · Lucro líquido 90,6 (`total`). `in`/`total`: `left=0; width=v`; `out`: `run += v; left=run; width=−v` (barra começa onde o saldo fica). Percentuais relativos a 184,3. Tipo `out` → "papel cavado": `bg var(--sf2)`, `box-shadow inset 0 0 0 1px var(--bd2)`, texto `--tx2`; `in`/`total` → tinta `var(--tx)`; `total` → `font-weight 600`. Valor negativo formatado com `−` (U+2212). Hover numa linha: as outras caem para `opacity .45`.

---

## Heatmap ("Quando vende")

### Anatomia

```
div .card (44px, 26px 28px, gap 14)
  ├─ div .card-head → "Quando vende" · "dia × hora"
  ├─ div .heat (flex column; gap 4px)
  │    ├─ div .heat-row × 7 (grid 30px + 12 colunas; gap 4)
  │    │    ├─ span .heat-day "Seg"…"Dom"
  │    │    └─ div .heat-cell × 12 (onMouseEnter)
  │    └─ div .heat-axis (grid igual; mono 9px) → "" "0h" "" "" "6h" "" "" "12h" "" "" "18h" "" ""
  └─ span .heat-label (font-size 12px; color tx2; margin-top:auto)
```

### Estilos

```css
.heat      { display: flex; flex-direction: column; gap: 4px; }
.heat-row  { display: grid; grid-template-columns: 30px repeat(12, minmax(0,1fr)); gap: 4px; align-items: center; }
.heat-day  { font-size: 10.5px; color: var(--tx3); }
.heat-cell { aspect-ratio: 1; border-radius: 5px; background: var(--v0); opacity: <0.06..1.00>; box-shadow: none; cursor: pointer; }
.heat-cell[selected] { box-shadow: 0 0 0 2px var(--sf), 0 0 0 3.5px var(--tx); }
.heat-axis { display: grid; grid-template-columns: 30px repeat(12, minmax(0,1fr)); gap: 4px; font-family: 'Geist Mono', monospace; font-size: 9px; color: var(--tx3); }
.heat-label{ font-size: 12px; color: var(--tx2); margin-top: auto; }
```

### Lógica (`dc.src` L269–270)

Intensidade = lavagem de tinta (`--v0` + opacity). `base = sin((ci−2)/11·π)×0.7 + 0.15 + (qui/sex ? 0.15 : 0) − (sáb/dom ? 0.2 : 0)`; `v = clamp(0.06, 1, base + (rng(ri×13+ci+5)() − 0.5)×0.3)`; `opacity = v.toFixed(2)`; vendas `n = round(v×58)`. Cada coluna = 2h. Rótulo: padrão `"Qui · 18h–20h é o pico da semana"`; ao passar o mouse `"<Dia> · HHh–HHh · N vendas"`. A seleção fica (não há `onMouseLeave`).

### Movimento

`box-shadow` e `opacity` seguem a transição global `.55s --ease`.

---

## Gráfico de linha / área (Receita diária)

### Anatomia

```
div .chart-card (48px; 28px 32px; gap 20; min-width:0; overflow:hidden)
  ├─ div .chart-head (flex; space-between; flex-start; gap 16; wrap)
  │    ├─ div (flex column; gap 8)
  │    │    ├─ div (flex; center; gap 8) → span.title "Receita diária" + {{ liveDot }}
  │    │    ├─ span .odo (40px)  ← chart.odo = odo('chartTotal', brl(total))
  │    │    └─ div .legend (gap 16; font-size 12px; tx2)
  │    │         ├─ span → span.swatch-solid (14×2 tx) + "Período atual"
  │    │         └─ span → span.swatch-dashed (14; border-top 1.5px dashed var(--v5)) + "Período anterior"
  │    └─ div .seg[data-slide] (seletor de período)
  │         ├─ span[data-ind]
  │         └─ button[data-on] × 4  "7d" "30d" "90d" "12m"
  ├─ div .plot (relative; height 240px; margin 56px 52px 0 6px)
  │    ├─ div .grid-line × N (absolute; top:{{ g.y }}) → span .grid-label "R$ 60k"
  │    ├─ svg viewBox="0 0 640 220" preserveAspectRatio="none" (absolute inset 0; overflow visible)
  │    │    ├─ defs > linearGradient#gLine (0,0→0,1): stop 0 var(--tx) .10 · stop 1 var(--tx) 0
  │    │    ├─ path .area  fill="url(#gLine)"                    style="d: path(...); transition: d 1s --ease"
  │    │    ├─ path .prev  stroke="var(--v5)" 1.5 dasharray "3 4"  style="d: path(...); transition: d 1s --ease"
  │    │    └─ path .line  stroke="var(--tx)" 2 linejoin round     style="d: path(...); transition: d 1s --ease"
  │    ├─ div .cursor   (absolute; top 0; bottom 0; left:{{ chart.x }}; border-left 1px solid var(--bd2))
  │    ├─ div .point    (absolute; left/top; 12×12; -6px margin; sf bg; 2px tx border)
  │    │    └─ span .point-ping  (só se chart.isLive)
  │    ├─ div .tooltip  (absolute; left/top; translate(tx, calc(-100% - 14px)))
  │    │    ├─ span .tip-date "01 out"
  │    │    └─ span .tip-val  "R$ 62,4k"
  │    └─ div .hit (absolute inset 0; cursor crosshair; onMouseMove/onMouseLeave)
  └─ div .x-axis (flex; space-between; gap 6; mono 10px; tx3; margin 0 52px 0 6px)
       └─ span × 7 "04 set" … (min-width 0; overflow hidden; text-overflow clip)
```

### Estilos

```css
.chart-card { background: var(--sf) var(--grain); border: 1px solid var(--bd); box-shadow: var(--sh1); border-radius: 48px; corner-shape: squircle; padding: 28px 32px; display: flex; flex-direction: column; gap: 20px; min-width: 0; overflow: hidden; }
.chart-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.chart-title { font: 500 15px/1 Geist, sans-serif; }
.chart-total { font: 300 40px/1 Geist, sans-serif; letter-spacing: -0.045em; /* + odômetro */ }
.legend { display: flex; gap: 16px; font-size: 12px; color: var(--tx2); }
.swatch-dashed { width: 14px; border-top: 1.5px dashed var(--v5); }

/* Seletor de período (segmentado) */
.seg { position: relative; display: flex; padding: 3px; gap: 2px; border-radius: 999px; background: var(--sf2); box-shadow: var(--deb); }
.seg [data-ind] { background: var(--sf3); box-shadow: var(--sh1); border-radius: 999px; }
.seg button { position: relative; z-index: 1; height: 30px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent; box-shadow: none; color: var(--tx3); font: 500 12px/1 Geist, sans-serif; cursor: pointer; transition: all 0.34s cubic-bezier(.22,1,.36,1); }
.seg button[data-on="true"] { color: var(--tx); }

/* Área de plot */
.plot { position: relative; height: 240px; margin: 56px 52px 0 6px; }
.grid-line  { position: absolute; left: 0; right: 0; top: <y%>; border-top: 1px dashed var(--grid); display: flex; justify-content: flex-end; transition: top 1s cubic-bezier(.22,1,.36,1); }
.grid-label { font-family: 'Geist Mono', monospace; font-size: 10px; color: var(--tx3); background: var(--sf); padding-left: 6px; transform: translateY(-50%); margin-right: -50px; }
.plot svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.plot .area { fill: url(#gLine); transition: d 1s cubic-bezier(.22,1,.36,1); }
.plot .prev { fill: none; stroke: var(--v5); stroke-width: 1.5; stroke-dasharray: 3 4; vector-effect: non-scaling-stroke; transition: d 1s cubic-bezier(.22,1,.36,1); }
.plot .line { fill: none; stroke: var(--tx); stroke-width: 2; stroke-linejoin: round; vector-effect: non-scaling-stroke; transition: d 1s cubic-bezier(.22,1,.36,1); }
.cursor  { position: absolute; top: 0; bottom: 0; left: <x%>; border-left: 1px solid var(--bd2); pointer-events: none; transition: left 0.3s cubic-bezier(.22,1,.36,1); }
.point   { position: absolute; left: <x%>; top: <y%>; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 99px; background: var(--sf); border: 2px solid var(--tx); pointer-events: none; transition: left .9s cubic-bezier(.22,1,.36,1), top .9s cubic-bezier(.22,1,.36,1); }
.point-ping { position: absolute; inset: -6px; border-radius: 99px; border: 1.5px solid var(--tx); animation: pfPing 1.8s ease-out infinite; }
.tooltip { position: absolute; left: <x%>; top: <y%>; transform: translate(<tx>, calc(-100% - 14px)); padding: 8px 12px; border-radius: 18px; corner-shape: squircle; background: var(--ac); color: var(--acf); box-shadow: var(--e2); display: flex; flex-direction: column; gap: 3px; white-space: nowrap; pointer-events: none; transition: left 0.3s cubic-bezier(.22,1,.36,1), top 0.3s cubic-bezier(.22,1,.36,1); }
.tip-date { font-size: 10.5px; opacity: .65; }
.tip-val  { font: 500 14px/1 'Geist Mono', monospace; }
.hit { position: absolute; inset: 0; cursor: crosshair; }
.x-axis { display: flex; justify-content: space-between; gap: 6px; overflow: hidden; font-family: 'Geist Mono', monospace; font-size: 10px; color: var(--tx3); white-space: nowrap; margin: 0 52px 0 6px; }
.x-axis span { min-width: 0; overflow: hidden; text-overflow: clip; }
```

### Lógica (`dc.src` L181–186, L397–400, L240)

- `W=640, H=220`; série `ser = s.series` (28 pontos, inicial `walk(28, 62000, 7000, 29)`); `mn = min×0.92`, `mx = max×1.04`; `pts(ser,W,H,mn,mx)` com folga 14% topo / 6% base; `line = smooth(p)`.
- Período anterior: `prev[i] = ser[i]×0.84 + sin(i/2.3)×2600`, mesma escala, `smooth`.
- `area = line + "L640,220 L0,220 Z"`. Os três `d` são escritos **também** como `style="d: path('…')"` para que a transição CSS em `d` funcione (Chrome).
- Grade: `step = [5000,10000,20000].find(v => (mx−mn)/v ≤ 4) || 25000`; para cada múltiplo de `step` entre `mn` e `mx`: `y = H×0.14 + (1 − (v−mn)/(mx−mn))×H×0.8` em `%`; rótulo `"R$ " + (v/1000).toLocaleString('pt-BR') + "k"`.
- Hover: `i = round((clientX − left)/width × 27)` clampado; sem hover `hi = 27` (último ponto). `x = p[hi][0]/W %`, `y = p[hi][1]/H %`. `tx = x/W > .82 ? '-94%' : x/W < .18 ? '-6%' : '-50%'` (tooltip vira nas bordas). `isLive = hover == null && live` (ping só no último ponto, sem hover). `val = brlk(ser[hi])` ("R$ 62,4k"), `date = DAYS[hi]` (28 dias terminando em 01/10/2026, formato `"dd mmm"` sem ponto).
- Eixo X: `DAYS.filter((d,i) => i%5===0 || i===27)` → 7 rótulos.
- Seletor de período: `['7d','30d','90d','12m']`; ao clicar: `series = walk(28, 62000, 7000, PERIOD_SEED[k])` com seeds `{7d:11, 30d:29, 90d:71, 12m:133}`, `hover = null`. Sempre 28 pontos (o período só troca a seed). Inicial `30d`.
- Ao vivo: ver Odômetro (3000ms). A linha redesenha com `transition: d 1s`.

### Estados

- Repouso ao vivo: ponto no último valor + anel `pfPing 1.8s`; tooltip mostra último dia.
- Hover: cursor vertical + ponto + tooltip seguem o índice (`left/top .3s`; ponto `.9s`).
- Troca de período: curvas interpolam `d` em 1s; grade reposiciona `top 1s`.
- Loading / vazio / erro: **não especificado** neste card (ver "Algo deu errado" nos Padrões para o estado de erro de bloco de gráfico).

### Medidas

Plot 240px de altura; margens internas 56 topo / 52 direita (espaço do rótulo da grade, `margin-right:-50px`) / 6 esquerda. Tooltip raio 18, padding 8×12, afastado 14px acima do ponto. Ponto 12px com borda 2; ping `inset:-6px` (anel de 24px).

---

## Gráfico de barras (Receita mensal)

### Anatomia

```
div .card (44px; 26px 28px; gap 18)
  ├─ div .card-head
  │    ├─ span.title "Receita mensal"
  │    └─ span (flex; gap 8; baseline) → span.bar-sel-m "Set" (12px tx3) + span.bar-sel-v "R$ 142k" (500 13px/1 mono)
  └─ div .bars (height 190px; flex; gap 6; min-width 0)
       └─ div .bar-col × 12 (flex:1; column; gap 8; onMouseEnter)
            ├─ div .bar-track (flex:1; align-items:flex-end)
            │    └─ div .bar (width 100%; height:{{ b.h }})
            └─ span .bar-m "Out"…"Set"
```

### Estilos

```css
.bars     { height: 190px; display: flex; gap: 6px; min-width: 0; }
.bar-col  { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; cursor: pointer; }
.bar-track{ flex: 1; min-height: 0; display: flex; align-items: flex-end; }
.bar      { width: 100%; height: <h%>; border-radius: 10px; corner-shape: squircle; background: var(--sf2); box-shadow: var(--deb); transition: background 0.34s cubic-bezier(.22,1,.36,1); }
.bar.active { background: var(--tx); box-shadow: var(--ink); }
.bar-m    { font-size: 10px; text-align: center; color: var(--tx3); overflow: hidden; white-space: nowrap; }
.bar-col.active .bar-m { color: var(--tx); }
.bar-sel-m { font-size: 12px; color: var(--tx3); }
.bar-sel-v { font: 500 13px/1 'Geist Mono', monospace; }
```

### Lógica (`dc.src` L185–186, L266, L401)

Meses `Out…Set`; valores `mv = walk(12, 120, 40, 7, 0.38)`; `h = v/max(mv)×100 %`; valor `"R$ " + round(v) + "k"`. Ativo padrão índice **11 (Set)**; `onMouseEnter` seleciona e **fica** (há `off` no modelo mas o HTML não liga `onMouseLeave`). Barra inativa = papel cavado (`--sf2` + `--deb`); ativa = tinta (`--tx` + `--ink`).

### Movimento

`background .34s --ease` na barra; `box-shadow` e `color` pela transição global.

---

## Donut / anel (Vendas por fonte)

### Anatomia

```
div .card (44px; 26px 28px; gap 18)
  ├─ div .card-head → "Vendas por fonte" · "rosca · passe o mouse"
  └─ div .donut-wrap (flex; center; gap 24; wrap)
       ├─ div .donut (relative; 170×170; flex:none)
       │    ├─ svg viewBox="0 0 100 100" (rotate −90°)
       │    │    ├─ circle.track  r=40 stroke="var(--sf2)" width 10
       │    │    └─ circle.seg × 4  r=40 stroke={{ d.c }} width {{ d.sw }} dasharray {{ d.dash }} dashoffset {{ d.off }} opacity {{ d.op }} (onMouseEnter)
       │    └─ div .donut-center (absolute inset 0; column; center; gap 4; pointer-events none)
       │         ├─ span .dc-name "Meta Ads"   (11px tx3)
       │         ├─ span .dc-pct  "48%"        (300 26px/1; ls −0.03em)
       │         └─ span .dc-val  "R$ 88.474"  (mono 10px tx2)
       └─ div .donut-legend (flex:1; min-width 140; column)
            └─ div .legend-row × 4 (gap 10; padding 8px 0; border-bottom 1px bd; onMouseEnter)
                 ├─ span .dot (8×8; radius 9; bg d.c)
                 ├─ span .name (flex:1; 13px)
                 └─ span .pct  (mono 11px tx2)
```

### Estilos

```css
.donut-wrap { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
.donut { position: relative; width: 170px; height: 170px; flex: none; }
.donut svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.donut .track { fill: none; stroke: var(--sf2); stroke-width: 10; }
.donut .seg   { fill: none; stroke: <d.c>; stroke-width: 10; opacity: 1; transition: stroke-width 0.34s cubic-bezier(.22,1,.36,1), opacity 0.34s cubic-bezier(.22,1,.36,1); cursor: pointer; }
.donut .seg.active { stroke-width: 14; }
.donut .seg.dim    { opacity: .35; }
.donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; pointer-events: none; }
.dc-name { font-size: 11px; color: var(--tx3); }
.dc-pct  { font: 300 26px/1 Geist, sans-serif; letter-spacing: -0.03em; }
.dc-val  { font-family: 'Geist Mono', monospace; font-size: 10px; color: var(--tx2); }
.donut-legend { flex: 1; min-width: 140px; display: flex; flex-direction: column; }
.legend-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--bd); cursor: pointer; opacity: 1 | .35; transition: opacity 0.34s cubic-bezier(.22,1,.36,1); }
.legend-row .dot  { width: 8px; height: 8px; border-radius: 9px; background: <d.c>; }
.legend-row .name { flex: 1; font-size: 13px; }
.legend-row .pct  { font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--tx2); }
```

### Lógica (`dc.src` L187–189, L402–403)

Fontes: Meta Ads 48% `--v0` · Google Ads 27% `--v1` · TikTok Ads 15% `--v2` · Orgânico 10% `--v5`. `C = 2π×40 = 251.327`; para cada fatia `len = C×v/100`; `dasharray = "${max(0, len−3)} ${C−len+3}"` (**gap de 3 unidades** entre fatias), `dashoffset = −acumulado`. Seleção padrão índice 0; ativa → `stroke-width 14`, demais `opacity .35`. Centro: `val = brl(184320 × v/100)`.

---

## Funil de checkout

```
div .card (44px; 26px 28px; gap 14)
  ├─ div .card-head → "Funil de checkout" · "conversão entre etapas"
  └─ div .funnel-step × 4 (column; gap 6)
       ├─ div (flex; space-between; 12px) → span.name + span (gap 10) → span.v (mono) + span.rate (mono; tx3; width 44; right)
       └─ div .f-track (height 22; pill; sf2; deb; overflow hidden)
            └─ div .f-bar (height 100%; width:{{ f.w }}; pill; tx; opacity:{{ f.op }})
```

```css
.funnel-step { display: flex; flex-direction: column; gap: 6px; }
.funnel-step > div:first-child { display: flex; justify-content: space-between; font-size: 12px; }
.f-v    { font-family: 'Geist Mono', monospace; }
.f-rate { font-family: 'Geist Mono', monospace; color: var(--tx3); width: 44px; text-align: right; }
.f-track{ height: 22px; border-radius: 999px; background: var(--sf2); box-shadow: var(--deb); overflow: hidden; }
.f-bar  { height: 100%; width: <w%>; border-radius: 999px; background: var(--tx); opacity: <1 − i×0.18>; transition: width 0.75s cubic-bezier(.22,1,.36,1); }
```

Lógica (L192): Visitas 48.210 · Checkout iniciado 6.932 · Pagamento 3.104 · Aprovado 2.487. `w = max(8, v/primeiro×100) %`; `rate = i ? (v/anterior×100).toFixed(1)+"%" : "100%"` (vírgula decimal); `op = 1 − i×0.18` (1, .82, .64, .46) — lavagem de tinta por etapa.

---

## Barra empilhada + legenda + medidor (Participação por fonte)

```
div .card (44px; 26px 28px; gap 18)
  ├─ div .card-head → "Participação por fonte" · "barra empilhada"
  ├─ div .stack (flex; height 40; gap 3; radius 20 squircle; overflow hidden)
  │    └─ div × 4 (width:{{ x.w }}; background:{{ x.c }})
  ├─ div .stack-legend (grid 2 col; gap 10px 16px)
  │    └─ div × 4 (flex; gap 8) → span.dot (8×8 r9) + span.name (flex:1; 12px) + span.v (mono 11; tx2)
  └─ div .gauge-row (flex; center; gap 20; padding-top 14; border-top 1px bd)
       ├─ svg viewBox="0 0 160 90" (width 150; flex none)
       │    ├─ path.track d="M10,80 A70,70 0 0 1 150,80" stroke sf2 width 12 linecap round
       │    └─ path.fill  d="M10,80 A70,70 0 0 1 150,80" stroke tx  width 12 linecap round dasharray {{ gauge.dash }}
       └─ div (column; gap 4) → span "ROAS vs. meta 6,7x" (12px tx3) · span "4,82x" (300 30px/1; ls −0.03em) · span "72% do caminho · medidor" (11px tx2)
```

```css
.stack { display: flex; height: 40px; gap: 3px; border-radius: 20px; corner-shape: squircle; overflow: hidden; }
.stack > div { width: <v%>; background: var(--vN); }
.stack-legend { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px 16px; }
.gauge-row { display: flex; align-items: center; gap: 20px; padding-top: 14px; border-top: 1px solid var(--bd); }
.gauge-row svg { width: 150px; flex: none; }
.gauge .track { fill: none; stroke: var(--sf2); stroke-width: 12; stroke-linecap: round; }
.gauge .fill  { fill: none; stroke: var(--tx); stroke-width: 12; stroke-linecap: round; stroke-dasharray: <π·70·0.72> <π·70>; }
.gauge-big { font: 300 30px/1 Geist, sans-serif; letter-spacing: -0.03em; }
```

Medidor: semicírculo r=70 (comprimento π·70 ≈ 219.9); `dash = "${π×70×0.72} ${π×70}"` → 72%. Sem transição declarada.

---

## Slider (controle de demonstração de progresso)

Usado no cabeçalho da seção Progresso para dirigir todos os indicadores (`s.slider`, inicial **62**).

```
div (width 260; flex; center; gap 12)
  ├─ div .slider (relative; flex:1; height 24; flex; center)
  │    ├─ div .sl-track (absolute; left 0; right 0; height 8; pill; sf2; deb)
  │    ├─ div .sl-fill  (absolute; left 0; width:{{ sliderPct }}; height 8; pill; tx)
  │    ├─ div .sl-thumb (absolute; left:{{ sliderPct }}; 20×20; margin-left −10; pill; sf3+grain; shadow 0 0 0 .5px bd2, e2)
  │    └─ input[type=range] min 0 max 100 (absolute inset 0; width 100%; opacity 0; cursor pointer; margin 0)
  └─ span .sl-label "62%" (mono 12px; width 36; right)
```

```css
.sl-track { position: absolute; left: 0; right: 0; height: 8px; border-radius: 999px; background: var(--sf2); box-shadow: var(--deb); }
.sl-fill  { position: absolute; left: 0; width: <pct%>; height: 8px; border-radius: 999px; background: var(--tx); }
.sl-thumb { position: absolute; left: <pct%>; width: 20px; height: 20px; margin-left: -10px; border-radius: 999px; background: var(--sf3) var(--grain); box-shadow: 0 0 0 .5px var(--bd2), var(--e2); }
.sl-input { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; margin: 0; }
```

Sem transição em `width`/`left` (segue o ponteiro).

---

## Barra de progresso (determinada)

```
div (column; gap 10)
  ├─ div (flex; space-between; 13px) → span "Meta de outubro" + span.mono "62%" (tx2)
  ├─ div .bar-track (height 8; pill; sf2; deb; overflow hidden)
  │    └─ div .bar-fill (height 100%; width:{{ sliderPct }}; pill; tx; transition width .51s --ease)
  └─ span "Linear · 8px" (11px tx3)
```

```css
.bar-track { height: 8px; border-radius: 999px; background: var(--sf2); box-shadow: var(--deb); overflow: hidden; }
.bar-fill  { height: 100%; width: <pct%>; border-radius: 999px; background: var(--tx); transition: width 0.51s cubic-bezier(.22,1,.36,1); }
```

Variante fina (tabela, coluna ROAS): `height: 5px`, fill sem transição explícita, largura 42px para o valor mono 11px.

## Barra de progresso (indeterminada)

Aparece nos cards "Reconectando…" e "Tentando de novo…" (Padrões).

```css
.indet       { width: 100%; height: 3px; margin-top: 6px; border-radius: 999px; background: var(--sf2); overflow: hidden; pointer-events: none; }
.indet-fill  { height: 100%; width: 40%; border-radius: 999px; background: linear-gradient(90deg, transparent, var(--tx)); animation: pfIndet 1.1s cubic-bezier(.65,0,.35,1) infinite; }
@keyframes pfIndet { from { transform: translateX(-100%); } to { transform: translateX(260%); } }
```

## Barra segmentada ("etapas discretas")

```
div (column; gap 10)
  ├─ div (flex; space-between; 13px) → "Onboarding" + span.mono "20 de 32 etapas"
  ├─ div .segs (flex; gap 3) → span × 12 (flex:1; height 8; radius 3; background tx | bd; transition background .34s --ease)
  └─ span "Segmentado · etapas discretas" (11px tx3)
```

Lógica: `preenchidos = round(pct/100 × 12)`; `sliderTasks = round(pct/100×32) + " de 32 etapas"`.

Este é o único "steps/etapas" presente nestas seções; um componente de passos com rótulos (stepper) **não está especificado** aqui.

---

## Ensō (anel de progresso SVG)

```
div .card (44px; 28px; gap 18; center)
  ├─ div .ring (relative; 148×148)
  │    ├─ svg viewBox="0 0 64 64" (rotate −90°)
  │    │    ├─ circle.track r=26 stroke sf2 width 5
  │    │    └─ circle.fill  r=26 stroke tx  width 5 linecap round dasharray {{ ringC.dash }} (transition stroke-dasharray .51s --ease)
  │    └─ span .ring-val "62%" (absolute inset 0; center; 300 30px/1; ls −0.035em)
  └─ div (column; gap 4; max-width 240) → span "Ensō" (13px 500) + span "Anel de um traço, ponta arredondada. Metas e capacidade." (12px tx2; lh 1.5)
```

```css
.ring { position: relative; width: 148px; height: 148px; }
.ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring .track { fill: none; stroke: var(--sf2); stroke-width: 5; }
.ring .fill  { fill: none; stroke: var(--tx); stroke-width: 5; stroke-linecap: round; stroke-dasharray: <C·pct> <C>; transition: stroke-dasharray 0.51s cubic-bezier(.22,1,.36,1); }
.ring-val { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font: 300 30px/1 Geist, sans-serif; letter-spacing: -0.035em; }
```

`C = 2π×26 = 163.36`; `dash = "${C×pct/100} ${C}"`.

## Anel de pontos (`dotRing`)

SVG gerado em JS (`dc.src` L198), `viewBox 0 0 200 200`, `width/height 100%`, dentro de `div 148×148`.

- Campo de pontos: grade com passo 9 em `[−92, 92]²`; só onde `d = hypot(x,y) ≤ 92` **e** (`d > 58` ou `d < 30`) — ou seja, fora da coroa do anel; `circle r=1 fill var(--tx3) opacity .55`.
- Anel: 28 pontos no raio 44, começando no topo (`−π/2`); `on = i/28 < pct`; `r = on ? 3.2 : 1.6`; `fill = on ? var(--tx) : var(--tx4)`; `style="transition: all .5s cubic-bezier(.22,1,.36,1)"`.
- Texto: "Anel de pontos" · "`{{ sliderTasks }}` concluídas. Para progresso de projeto."

## Anel em crescimento (`dotRing2`)

SVG gerado em JS (L199–204), `viewBox 0 0 180 180`, `overflow: visible`, dentro de `div 188×188` com overlay central.

- Centro `C=90`, `N=40` raios, três anéis `radii = [52, 63, 74]`, linha-guia `circle r=42 stroke var(--bd) stroke-width .75`.
- `fillN = round(pct×N)`, `tipI = fillN−1`. Para cada raio `i` e anel `k`: `on = i < fillN`; `g = on ? ((i+1)/max(fillN,1))^1.35 : 0`; `tip = on && i === tipI`.
- Raio do ponto: `tip ? 2.4 + k×.75 : on ? .75 + g×(.9 + k×.55) : .65`.
- `fill = on ? var(--tx) : var(--tx4)`; `opacity = on ? (tip ? 1 : .25 + g×.75) : .5`.
- `style="transition: r .7s cubic-bezier(.34,1.22,.64,1), opacity .6s cubic-bezier(.22,1,.36,1), fill .5s"`.
- Ponto extra da ponta: no raio 85, `r 1.9 fill var(--tx) opacity .75`, `transition: cx .6s --ease, cy .6s --ease`.
- Overlay: `position:absolute; inset:0; flex column center; gap:5px; pointer-events:none` → `span (flex; align-items:flex-start; gap:1px)` → número `font:300 22px/1 Geist; letter-spacing:-0.035em; font-variant-numeric:tabular-nums` + `%` `font:400 10px/1 Geist; color:var(--tx3); margin-top:2px`.
- Texto: "Anel em crescimento" · "Raios de três pontos que ganham corpo conforme o valor avança. A ponta é a pincelada final: mais grossa, com um ponto além do anel."

---

## Ponta de pigmento (barra "quanto falta")

Card 44px / 26px 28px / gap 18. Cabeçalho "Ponta de pigmento" · "só degradê · do transparente à cor · luz que escapa pela ponta". Grid `repeat(auto-fit, minmax(240px,1fr)); gap: 20px 32px`. Rodapé: `font-size:11px; color:var(--tx3); line-height:1.5` — "Use quando a barra mostra quanto falta, não o que já foi. A cor indica o estado sem pintar o caminho inteiro — arraste o controle acima."

```
div .tip-item × 4 (column; gap 10)
  ├─ div (flex; space-between; 13px) → span.l + span.v (mono; tx2)
  └─ div .tip-track (relative; height 8; pill; sf2; deb)
       └─ div .tip-fill (relative; height 100%; width:{{ t.w }}; transition width .75s --ease)
            ├─ div .tip-grad  (absolute inset 0; pill; gradient transparente → cor)
            ├─ div .tip-glow  (absolute; right −26; top 50%; 64×18; margin-top −9; radial; blur 6)
            └─ div .tip-under (absolute; left 30%; right −6; top 9; height 10; pill; gradient; blur 6; opacity .8)
```

```css
.tip-track { position: relative; height: 8px; border-radius: 999px; background: var(--sf2); box-shadow: var(--deb); }
.tip-fill  { position: relative; height: 100%; width: <w%>; transition: width 0.75s cubic-bezier(.22,1,.36,1); }
.tip-grad  { position: absolute; inset: 0; border-radius: 999px;
  background: linear-gradient(90deg, transparent 0%, color-mix(in oklab, <c> 10%, transparent) 35%, color-mix(in oklab, <c> 45%, transparent) 75%, <c> 100%); }
.tip-glow  { position: absolute; right: -26px; top: 50%; width: 64px; height: 18px; margin-top: -9px;
  background: radial-gradient(ellipse 50% 50% at 40% 50%, color-mix(in oklab, <c> 55%, transparent) 0%, transparent 100%); filter: blur(6px); pointer-events: none; }
.tip-under { position: absolute; left: 30%; right: -6px; top: 9px; height: 10px; border-radius: 999px;
  background: linear-gradient(90deg, transparent, color-mix(in oklab, <c> 30%, transparent)); filter: blur(6px); opacity: .8; pointer-events: none; }
```

Dados (L302): `var(--ok)` "Receita · meta" · `var(--in)` "Capacidade de mídia" · `var(--wa)` "Orçamento consumido" · `var(--er)` "Limite de reembolso"; `w = v = clamp(4, 100, slider − i×9) %`.

---

## Tabela

Texto do manual: *"Linhas de 52px, números em mono e alinhados à direita, gráfico inline por linha. O hover ergue a linha como uma tira de papel."*

### Anatomia

```
div .table-card (44px squircle; padding 8px; overflow-x auto)
  └─ div .table (width max-content; min-width 100%; column)
       ├─ div .thead (grid; height 44; padding 0 18; 11px tx3)
       │    └─ span × 7  "Campanha" "Fonte" "Investimento"(right) "Receita"(right) "ROAS" "Tendência" "Status"
       └─ div .tr × 5  (grid; height 52; padding 0 18; pill; border-top 1px bd; style-hover)
            ├─ span .td-name   (13px 500; ellipsis)
            ├─ span .td-src    (12px tx2)
            ├─ span .td-num    (mono 12; right)  Investimento
            ├─ span .td-num    (mono 12; right)  Receita
            ├─ span .td-roas   (flex; center; gap 8)
            │    ├─ span .mini-track (flex:1; height 5; pill; sf2; deb; overflow hidden)
            │    │    └─ span .mini-fill (block; height 100%; width:{{ r.rw }}; tx; pill)
            │    └─ span (mono 11; width 42; right) "5,22x"
            ├─ svg .td-spark viewBox="0 0 80 24" preserveAspectRatio="none" (80×24) → path stroke tx 1.25 non-scaling
            └─ span .td-status (pílula; justify-self start)
```

### Estilos

```css
.table-card { background: var(--sf) var(--grain); border: 1px solid var(--bd); box-shadow: var(--sh1); border-radius: 44px; corner-shape: squircle; padding: 8px; overflow-x: auto; }
.table { width: max-content; min-width: 100%; display: flex; flex-direction: column; }
.thead, .tr { display: grid; grid-template-columns: minmax(220px,2fr) 110px 110px 110px 150px 84px 100px; gap: 16px; align-items: center; padding: 0 18px; }
.thead { height: 44px; font-size: 11px; color: var(--tx3); }
.thead .right { text-align: right; }
.tr { height: 52px; border-radius: 999px; border-top: 1px solid var(--bd); background-color: transparent; transition: background-color .5s cubic-bezier(.22,1,.36,1), box-shadow .55s cubic-bezier(.22,1,.36,1); }
.tr:hover { background-color: var(--sf3); box-shadow: var(--sh1); }
.td-name { font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-src  { font-size: 12px; color: var(--tx2); }
.td-num  { font-family: 'Geist Mono', monospace; font-size: 12px; text-align: right; }
.td-roas { display: flex; align-items: center; gap: 8px; }
.mini-track { flex: 1; height: 5px; border-radius: 999px; background: var(--sf2); box-shadow: var(--deb); overflow: hidden; }
.mini-fill  { display: block; height: 100%; width: <rw%>; background: var(--tx); border-radius: 999px; }
.td-roas > span:last-child { font-family: 'Geist Mono', monospace; font-size: 11px; width: 42px; text-align: right; }
.td-spark { width: 80px; height: 24px; }
.td-spark path { fill: none; stroke: var(--tx); stroke-width: 1.25; vector-effect: non-scaling-stroke; }
.td-status { justify-self: start; height: 22px; padding: 0 9px; border-radius: 999px; background: <sbg>; color: <sfg>; font-size: 11px; font-weight: 500; display: inline-flex; align-items: center; }
```

Pílulas de status (L194): **Ativa** `var(--oks)` / `var(--ok)` · **Pausada** `var(--sf2)` / `var(--tx2)` · **Revisão** `var(--was)` / `var(--wa)`.

### Lógica (L193–195)

Linhas: Black Friday — Prospecção (Meta Ads, 18.400 / 96.120, Ativa) · Remarketing 7d (Meta, 6.200 / 41.870, Ativa) · Search — Marca (Google, 3.900 / 28.410, Ativa) · Spark Ads — UGC (TikTok, 7.100 / 19.880, Pausada) · PMax — Catálogo (Google, 9.800 / 22.540, Revisão). `roas = rec/inv` (2 casas, vírgula, sufixo `x`); `rw = min(100, roas/6×100) %` (escala até 6x); sparkline `spark(walk(14,50,10,20+i), 80, 24)`.

### Estados

- Hover: linha vira "tira de papel" (`--sf3` + `--sh1`) com `border-radius: 999px` (a borda superior `border-top` permanece; a linha pílula sobrepõe a borda da linha seguinte).
- Seleção, ordenação, busca (o requisito "busca a partir de 5 linhas"), paginação, carregando/skeleton, vazio, erro: **não especificados** — o HTML desta seção contém apenas cabeçalho + 5 linhas de dados. A paginação que existe no manual (`nav[aria-label="Paginação do manual"]`) é navegação entre capítulos, não paginação de tabela.
- Overflow horizontal: o card rola (`overflow-x:auto`), a grade mantém `width:max-content`.

### Medidas

Cabeçalho 44px; linha 52px; padding horizontal 18px; gap entre colunas 16px; colunas `minmax(220px,2fr) 110 110 110 150 84 100`; sparkline 80×24; barra ROAS 5px; pílula 22px.

---

## Padrões de tela (Telas compostas)

Texto: *"Telas reais montadas só com componentes do Identidade — e que funcionam. Servem de referência para qualquer produto: autenticação, configurações, estados de erro."*

Layout da seção: dois grids `repeat(auto-fit, minmax(340px,1fr)); gap 20px; align-items start` (Login + Configurações; Boas-vindas + Criar conta) e um grid `minmax(240px,1fr); gap 16px` com os 4 cards de estado de página.

### Primitivos compartilhados nos formulários

```css
/* Moldura de demonstração (papel cavado) */
.stage { padding: 32px 24px; border-radius: 56px; corner-shape: squircle; background: var(--sf2); box-shadow: var(--deb); display: flex; justify-content: center; }
/* Card de autenticação dentro da moldura */
.auth-card { width: min(360px, 100%); background: var(--sf) var(--grain); border: 1px solid var(--bd); box-shadow: var(--e2); border-radius: 44px; corner-shape: squircle; padding: 32px 28px; display: flex; flex-direction: column; gap: 18px; }  /* data-morph */

/* Campo */
label.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12px; font-weight: 500; }
.field-label.row { display: flex; justify-content: space-between; }    /* "Senha … Esqueci" */
.field-label a { font-weight: 400; color: var(--tx2); }
.field-box { height: 42px; padding: 0 16px; display: flex; align-items: center; gap: 8px; border-radius: 999px; background: var(--sf2); box-shadow: var(--deb); }   /* boas-vindas: height 44px */
.field-box.error { box-shadow: var(--deb), 0 0 0 1px var(--er); }
.field-box input { flex: 1; min-width: 0; border: 0; background: transparent; outline: none; color: var(--tx); font: 400 13px/1 Geist, sans-serif; }
.field-box input.mono { font: 400 13px/1 'Geist Mono', monospace; }       /* Meta mensal */
.field-prefix { font-size: 13px; color: var(--tx3); }                      /* "R$" */
.field-icon { display: flex; width: 16px; height: 16px; color: var(--tx3); }
input[type=password] { color: transparent !important; caret-color: var(--tx); letter-spacing: .34em; }   /* "senha a carvão": o runtime desenha os pontos num overlay data-pw-ov */
input[type=password]::placeholder { color: var(--tx3); letter-spacing: 0; }

/* Mensagem de erro (dentro de data-collapse) */
.field-error { font-size: 12px; color: var(--er); display: flex; align-items: center; gap: 6px; }
.field-error .icon { display: flex; width: 14px; height: 14px; }     /* IC.alert */

/* Botão primário (tinta) */
.btn-ink { height: 44px; border: 0; border-radius: 999px; background: var(--ac); color: var(--acf); box-shadow: var(--ink); font: 500 14px/1 Geist, sans-serif; cursor: pointer; }   /* data-press="ink" */
.btn-ink.sm { height: 34px; padding: 0 14px; font-size: 12px; }
.btn-ink[disabled-look] { opacity: .4; }   /* Criar conta: su.op */
/* Botão secundário (folha) */
.btn-sheet { height: 42px | 36px | 34px; padding: 0 14px; border: 1px solid var(--bd); border-radius: 999px; background: var(--sf3); box-shadow: var(--sh1); color: var(--tx); font: 500 13px|12px/1 Geist, sans-serif; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px|10px; }   /* data-press="sheet" */
.btn-sheet.with-icon { padding: 0 14px 0 12px; }
/* Botão texto */
.btn-text { border: 0; background: transparent; min-height: 28px; padding: 0 2px; font-size: 12px; color: var(--tx2); cursor: pointer; }
.btn-text.link { text-decoration: underline; }
/* Voltar */
.btn-back { align-self: flex-start; height: 30px; padding: 0 10px 0 6px; border: 0; border-radius: 999px; background: transparent; color: var(--tx2); font: 500 12px/1 Geist, sans-serif; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
.btn-back:hover { background-color: var(--acs); }
.btn-back .icon { display: flex; width: 14px; height: 14px; }   /* IC.chevronLeft */
/* Divisor "ou" */
.or { display: flex; align-items: center; gap: 10px; font-size: 11px; color: var(--tx3); }
.or > span { flex: 1; height: 1px; background: var(--bd); }
/* Títulos */
.h-screen { font: 500 22px/1.2 Geist, sans-serif; letter-spacing: -0.02em; }
.h-card   { font: 500 20px/1.2 Geist, sans-serif; letter-spacing: -0.02em; }   /* Configurações, Criar conta */
.h-state  { font: 500 16px/1.3 Geist, sans-serif; }                           /* cards de estado */
.h-done   { font: 500 17px/1.3 Geist, sans-serif; }                           /* "Bem-vinda de volta" (login ok) */
.sub      { font-size: 13px; color: var(--tx2); }       /* 12.5px nos cards de configurações/criar conta/estado, com line-height 1.55 nos de estado */
/* Ícone de estado (gota) */
.state-icon { width: 44px; height: 44px; border-radius: 22px; corner-shape: squircle; background: var(--sf2); box-shadow: var(--deb); display: flex; align-items: center; justify-content: center; color: var(--tx2); }
.state-icon.ok { background: var(--oks); color: var(--ok); }
.state-icon.er { background: var(--ers); color: var(--er); }
.state-icon.muted { color: var(--tx3); }       /* durante carregamento */
.state-icon > span { display: flex; width: 20px; height: 20px; }
```

### Login

Estados (`lg.st`): `idle` (padrão) · `err` · `load` · `ok`. Transições de conteúdo via `data-morph`.

**idle**
```
div (column; gap 18)
  ├─ div (column; gap 6)
  │    ├─ span .logo "墨" (40×40; radius 20 squircle; bg ac; color acf; shadow ink; 16px; margin-bottom 10)
  │    ├─ span .h-screen "Entrar"
  │    └─ span .sub "Acompanhe suas vendas em tempo real."
  ├─ button .btn-sheet[data-press=sheet] (height 42; gap 10; font 500 13px) → span.g-icon (16×16) + "Continuar com Google"
  ├─ div .or → "ou"
  ├─ label.field "E-mail" → .field-box (box-shadow: {{ lg.emRing }}) > input[type=email] placeholder "voce@empresa.com"
  ├─ label.field (.row "Senha" + a "Esqueci") → .field-box > input[type=password] placeholder "••••••"
  ├─ div[data-collapse][data-open={{ lg.err }}] style="--g:18px" > div > span.field-error (IC.alert + {{ lg.msg }})
  └─ button .btn-ink[data-press=ink] "Entrar"
```
Ícone Google: `display:block; width:16px; height:16px; background: conic-gradient(#ea4335 0 25%, #fbbc05 0 50%, #34a853 0 75%, #4285f4 0); mask: url(<svg "G" Arial 700 28px>) center/contain no-repeat` (único uso de cor literal de marca).

**err**: `emRing = 'var(--deb), 0 0 0 1px var(--er)'` se e-mail inválido (senão `var(--deb)`); mensagem `"Informe um e-mail válido"` ou `"Senha precisa de 6+ caracteres"`; `data-open="true"` abre o colapso.

**load** (1300ms): `div (column; center; gap 12; padding 40px 0)` → `span (flex; 24×24) {{ spin20 }}` + `span .sub "Entrando…"`.

**ok**: `div (column; center; gap 12; text-align center; padding 20px 0; animation: pfRise .4s --ease)` → `span (52×52; radius 26 squircle; bg oks; color ok)` > `span (22×22) IC.check` · `span .h-done "Bem-vinda de volta"` · `span (12px tx2) {{ lg.email }}` · `button .btn-text.link "Reiniciar exemplo"`.

### Configurações da loja (barra de alterações não salvas)

```
div .card (44px; 28px; gap 20; position relative; overflow hidden; padding-bottom 96px)
  ├─ div (column; gap 4) → span .h-card "Configurações da loja" + span (12.5px tx2) "Mude qualquer campo para ver a barra de alterações."
  ├─ label.field "Nome da loja" → .field-box > input (valor "Loja Aurora")
  ├─ div (column; gap 6) → span .field-label "Moeda" + div .seg[data-slide] (align-self flex-start; padding 4px; gap 2)
  │    └─ button × 3 (height 32; padding 0 14; 500 12px; transition all .34s --ease) "R$ Real" "US$ Dólar" "€ Euro"
  ├─ label.field "Meta mensal" → .field-box > span.field-prefix "R$" + input.mono (valor "180.000")
  └─ [cfg.dirty] div .dirty-bar
       ├─ span .dot (7×7; radius 9; bg wa)
       ├─ span (flex:1; 12.5px; ellipsis) "Alterações não salvas"
       ├─ button[data-press=ghost] "Descartar" (height 32; padding 0 12; transparent; color acf; opacity .75; 500 12px)
       └─ button "Salvar alterações" | "Salvando…" (height 32; padding 0 14; bg var(--bg); color tx; 500 12px; white-space nowrap)
```

```css
.dirty-bar { position: absolute; left: 16px; right: 16px; bottom: 16px; display: flex; align-items: center; gap: 10px; padding: 8px 8px 8px 18px; border-radius: 999px; background: var(--ac); color: var(--acf); box-shadow: var(--e3); animation: pfRise .35s cubic-bezier(.22,1,.36,1); }
```

Lógica: qualquer `onChange` → `cfgDirty=true`; "Salvar" → `cfgSaving` por 1000ms → toast "Configurações salvas"; "Descartar" restaura `{nome:'Loja Aurora', moeda:'BRL', meta:'180.000'}`. Segmentado de moeda: `bg transparent; sh none; fg ativo var(--tx) / inativo var(--tx3)` + indicador deslizante `--sf3`/`--sh1`.

### Boas-vindas de volta (`wb`)

Card `.auth-card` com `align-items:center; gap:16px; text-align:center`. Estados `wb.st`: `idle`/`err` · `login` · `magic` · `sending` · `sent` · `load` · `ok`.

**idle**
```
div (column; center; gap 16; width 100%)
  ├─ span .avatar-xl "AS" (72×72; pill; bg v1; color #fff; 24px 500; box-shadow 0 0 0 4px var(--sf), 0 0 0 5px var(--bd))
  ├─ div (column; gap 4) → .h-screen "Bem-vinda de volta" + .sub "ana@aurora.com.br"
  ├─ div .field-box (width 100%; height 44; padding 0 6px 0 16px; box-shadow {{ wb.ring }}; text-align left)
  │    ├─ span .field-icon IC.lock
  │    ├─ input[type=password] placeholder "Sua senha"
  │    └─ button[aria-label=Continuar][data-press=ink] (34×34; pill; bg ac; color acf; shadow ink) > span (16×16) IC.arrowRight
  ├─ div[data-collapse][data-open={{ wb.err }}] style="--g:16px" > div > span (12px er) "Senha incorreta. 6+ caracteres."
  └─ div (flex; gap 16; 12px) → .btn-text "Não é você?" · span (color bd2) "·" · .btn-text "Entrar com link mágico"
```
`ring = err ? 'var(--deb), 0 0 0 1px var(--er)' : 'var(--deb)'`. Senha < 6 → `err`; senão `load` 1100ms → `ok`.

**login** ("Entrar com outra conta"): `div (column; stretch; gap 14; width 100%; text-align left)` → `.btn-back "Voltar"` · título `.h-screen` + `.sub "Use o e-mail da sua loja."` · campos E-mail / Senha (`.field-box` height **44**, sem gap) · `.btn-ink (width 100%) > span[data-lbl] > span "Entrar"`. `doLogin` → `load` 1100ms → `ok`.

**magic** ("Link mágico"): `.btn-back` · `span (48×48; radius 24 squircle; bg sf2; shadow deb; color tx2) > span (20×20) IC.sparkle` · título + `.sub (line-height 1.5) "Enviamos um link de acesso. Sem senha."` · campo E-mail · `.btn-ink "Enviar link"`.

**sending** (1300ms): `div (column; center; gap 14; padding 36px 0)` → spin20 + `.sub "Enviando link para {{ wb.em }}…"`.

**sent**
```
div (column; center; gap 14; padding 12px 0 4px)
  ├─ span .mail-badge (relative; 76×76; radius 38 squircle; bg sf2; shadow deb; center; animation pfMailIn .9s --ease both)
  │    ├─ span[data-draw] (32×32; color tx) IC.mail        ← traço se desenha: pfDraw 1.1s --ease .25s both
  │    └─ span .check-badge (absolute; right −4; top −4; 26×26; pill; bg ok; color #fff; box-shadow 0 0 0 3px var(--sf3); animation pfBadgeIn .6s cubic-bezier(.34,1.28,.64,1) .75s both) > span (13×13) IC.check
  ├─ div (column; gap 6) → span (500 20px/1.25; ls −0.02em) "Verifique seu e-mail" + span (13px tx2; lh 1.5) "Enviamos o link para <strong (500, tx)>{{ wb.em }}</strong>. Ele vale por 15 minutos."
  └─ div (flex; gap 8)
       ├─ button .btn-sheet (height 36; padding 0 14; 500 12px; opacity {{ wb.cdOp }}) > span[data-lbl] > span "{{ wb.cdLbl }}"
       └─ button (height 36; padding 0 12; transparent; color tx2; 500 12px) "Usar senha"
```
Countdown: ao enviar, `wbCd=30`, decrementa a cada 1000ms; `cdLbl = cd>0 ? "Reenviar em Ns" : "Reenviar link"`; `cdOp = cd>0 ? .5 : 1`; clique durante o countdown é ignorado.

**load**: `div (column; center; gap 12; padding 40px 0)` → spin20 + `.sub "Abrindo seu painel…"`.

**ok**: `div (column; center; gap 10; padding 24px 0; animation pfRise .6s --ease)` → `span (300 32px/1; ls −0.03em) "Bom dia, Ana."` · `.sub "R$ 6.204 em vendas desde ontem."` · `button (margin-top 6; transparent; 12px tx2; underline) "Reiniciar exemplo"`.

### Criar conta (força de senha + regras + termos)

```
div .card (44px; 28px; gap 16)
  ├─ div (column; gap 4) → .h-card "Criar conta" + span (12.5px tx2) "14 dias grátis. Sem cartão."
  ├─ label.field "Nome" → .field-box > input placeholder "Ana Souza"
  ├─ label.field "E-mail de trabalho" → .field-box > input placeholder "voce@empresa.com"
  ├─ label.field (gap 8)
  │    ├─ span .field-label.row "Senha" + span (400; color {{ su.lc }}; animation {{ su.la }}) "{{ su.lbl }}"
  │    ├─ .field-box > input[type=password] placeholder "Crie uma senha"
  │    ├─ div .strength (flex; gap 4) → span.seg × 4 (flex:1; height 3; radius 2; bg bd; overflow hidden)
  │    │    └─ span.seg-fill (block; 100%×100%; radius 2; bg {{ b.fc }}; transform scaleX({{ b.sx }}); transform-origin left center; transition transform .7s --ease {{ b.d }}, background-color .6s --ease)
  │    └─ div .rules (grid 1fr 1fr; gap 6px 12px) → span × 4 (flex; center; gap 6; 11.5px; color {{ r.c }}; transition color .4s)
  │         └─ span (relative; 12×12) → span.minus (absolute inset 0; opacity {{ r.o1 }}; scale {{ r.s1 }}) + span.check (opacity {{ r.o2 }}; scale {{ r.s2 }})   transition: opacity .4s --ease, transform .55s cubic-bezier(.34,1.28,.64,1)
  ├─ button .terms (flex; center; gap 10; border 0; transparent; padding 0; color tx2; 400 12px/1.4; text-align left)
  │    ├─ span .checkbox (flex none; 18×18; radius 6 squircle; bg {{ su.tb }}; box-shadow {{ su.tsh }}; center; transition background .3s)
  │    │    └─ svg 11×11 viewBox 24 stroke var(--sf) width 3.2 round → path "M4.5 12.5l5 5L19.5 7" dasharray 24; dashoffset {{ su.toff }}; transition stroke-dashoffset .45s --ease
  │    └─ "Aceito os termos de uso e a política de privacidade"
  └─ button .btn-ink[data-press=ink] "Criar conta" (opacity {{ su.op }})
```

Lógica (L344): `sc` = quantas de `[/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/]` passam (0–4). Barras: `fc = sc≥3 ? var(--ok) : sc===2 ? var(--wa) : var(--er)`; `sx = i<sc ? 1 : 0`; `d = i×60ms`. Rótulo `['Muito fraca','Fraca','Média','Boa','Forte'][sc]`; `lc = sc≥3 ? ok : sc===2 ? wa : sc===1 ? er : tx3`; `la = (sc ímpar ? pfItemA : pfItemB) .5s --ease both` (alterna A/B para reanimar). Regras: "8+ caracteres" · "Uma maiúscula" · "Um número" · "Um símbolo"; cumprida → `c ok`, `minus {o1:0,s1:.4}`, `check {o2:1,s2:1}`; não → `c tx3`, `minus {1,1}`, `check {0,.4}`. Termos: marcado → `tb var(--tx)`, `tsh var(--ink)`, `toff 0`; não → `tb var(--sf2)`, `tsh 'var(--deb), inset 0 0 0 1px var(--bd2)'`, `toff 24`. Formulário válido (`nome>1`, e-mail, `sc≥3`, termos) → `op 1`, senão `.4`; clique válido → toast "Conta criada — bem-vinda, <primeiro nome>".

### Estados de página (grid de 4 cards, raio 40, padding 28, gap 12, `align-items:flex-start`)

**Página não encontrada** (estático): `.state-icon IC.search` · `.h-state "Página não encontrada"` · `span (12.5px tx2; lh 1.55) "O link pode ter mudado. Volte ao início ou use a busca."` · `.btn-sheet (height 34; padding 0 14; 500 12px) "Abrir busca ⌘K"`.

**Sem conexão** (`rt.net`, `data-morph`, `min-height 236px`), estados `idle` → `load` (1500ms) → `ok`:
- idle: `.state-icon IC.plug` · "Sem conexão" · "Mostrando dados de 14:32. Tentamos de novo a cada 30s." · `div (flex; gap 8; center; wrap)` → `span .chip-wa (inline-flex; center; gap 6; height 24; padding 0 10; pill; bg was; color wa; 11px 500) "Offline · cache"` + `.btn-sheet.with-icon (height 34; gap 8)` → `span (14×14) IC.refresh` + "Reconectar".
- load: `.state-icon.muted IC.plug` · "Reconectando…" · "Sincronizando o que ficou pendente." · botão com ícone girando `animation: pfSpin .9s linear infinite` + "Reconectando…" · barra indeterminada (ver Barra de progresso).
- ok: `div (column; flex-start; gap 12; animation pfRise .6s --ease)` → `.state-icon.ok IC.check` · "De volta online" · "12 vendas sincronizadas desde 14:32." · `.btn-text.link "Simular erro de novo"`.

**Sem permissão** (estático): `.state-icon IC.lock` · "Sem permissão" · "Só administradores veem relatórios de lucro. Peça acesso a quem gerencia a loja." · `.btn-ink.sm "Pedir acesso"` (abre modal).

**Algo deu errado** (`rt.err`, erro de bloco — "o resto do dashboard segue normal"), mesma máquina de estados:
- idle: `.state-icon.er IC.alert` · "Algo deu errado" · "Não conseguimos carregar este gráfico. O resto do dashboard segue normal." · `.btn-sheet.with-icon` IC.refresh + "Tentar de novo".
- load: `.state-icon.muted IC.alert` · "Tentando de novo…" · "Recarregando só este bloco." · botão com ícone girando + "Tentando…" · barra indeterminada.
- ok: `pfRise .6s` → `.state-icon.ok IC.check` · "Gráfico recarregado" · "Os dados voltaram. Nada foi perdido." · `.btn-text.link "Simular erro de novo"`.

Padrões listados no pedido mas **ausentes** no HTML desta seção: formulário em etapas (stepper), conexão de plataforma (OAuth de fonte de anúncios), detalhe de pedido, confirmação/diálogo destrutivo. Não especificados aqui.

---

## Responsivo & mobile

Texto: *"O mesmo shell em três larguras. Desktop: sidebar flutuante. Tablet: trilho de ícones. Celular: topbar + barra inferior em shoji, e o menu vira gaveta."*

### Breakpoints e regras (texto do manual)

| Faixa | Regra |
|---|---|
| `< 640` · celular | Topbar pílula + barra inferior com 4 destinos. Menu em gaveta. KPIs em 2 colunas, gráficos em largura total. |
| `640–1024` · tablet | Trilho de ícones 64px com tooltip. 2 colunas de conteúdo. |
| `> 1024` · desktop | Sidebar flutuante 232px, respiro 16. Grid de 12 colunas, máx. 1280. |
| Sobreposições | No celular, popovers viram folha inferior (bottom sheet) e modais ocupam a largura com 12px de margem. |

Terceiro breakpoint `1440` consta em Espaço & grid; comportamento acima de 1440: **não especificado**.

Nota: o manual demonstra tudo com **state JS** (`dev`), não com `@media`. Os `@media` reais ficam a cargo da implementação, usando os valores acima.

Blocos de regra: `display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:20px 28px` → cada `div (column; gap 6; padding-top 14; border-top 1px solid var(--tx))` → `span (12px 600)` + `span (12px tx2; lh 1.55)`.

### Seletor de dispositivo (segmentado com sufixo mono)

```css
.seg { position: relative; display: flex; padding: 3px; gap: 2px; border-radius: 999px; background: var(--sf2); box-shadow: var(--deb); }
.seg button { position: relative; z-index: 1; height: 32px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent; box-shadow: none; color: var(--tx3); font: 500 12px/1 Geist, sans-serif; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.42s cubic-bezier(.22,1,.36,1); }
.seg button[data-on="true"] { color: var(--tx); }
.seg button > span { font-family: 'Geist Mono', monospace; font-size: 10px; opacity: .6; }   /* "390" "768" "1180" */
```

### Moldura do dispositivo

```
div[data-devwrap] (relative; padding 28; radius 56 squircle; bg sf2; shadow deb; flex; center; overflow hidden)
  ├─ [devScaled] span "escala 78%" (absolute; top 16; right 24; mono 10.5; tx3)
  └─ div .dev-box (relative; flex none; width {{ devBoxW }}; height {{ devBoxH }}; transition width .75s --ease-move, height .75s --ease-move)
       └─ div .device (absolute; 0 0; width {{ devW }}; height {{ devH }}; transform scale(k); transform-origin top left; border-radius {{ devR }} squircle; bg var(--bg) var(--grain); border 1px solid bd2; shadow e3; overflow hidden; transition transform .75s --ease-move, border-radius .75s --ease)
```

Dimensões (L312): celular **390×720**, raio **52px**; tablet **768×640**, raio **36px**; desktop **1180×620**, raio **36px**. Escala `k = min(1, (wrap.clientWidth − 56)/W)` (ResizeObserver); `devBox = round(W×k) × round(H×k)`; rótulo quando `k < .999`.

### Celular (`isMob`)

```
div (absolute inset 0; column)
  ├─ div .statusbar (height 44; flex none; flex; center; space-between; padding 0 22px 0 26px; font 600 13px/1)
  │    ├─ "9:41" · span .island (96×26; pill; bg #0d0c0a) · span (mono 11px) "5G"
  ├─ div .topbar (flex none; margin 6px 12px 0; height 52; padding 0 6px; flex; center; gap 8; pill; glass)
  │    ├─ button[aria-label="Abrir menu"][data-press=ghost] (40×40; pill; transparent; color tx) > span (18×18) IC.filter
  │    ├─ span (flex:1; 14px 600) "Dashboard"
  │    └─ span .avatar (36×36; pill; bg v1; color #fff; 12px) "AS"
  ├─ div .content (flex:1; overflow auto; padding 16px 12px 96px; column; gap 10)
  │    ├─ div .kpi-grid-m (grid 2 col; gap 10) → .kpi-m × 4
  │    └─ div .chart-m (radius 32 squircle; padding 16px 18px; gap 10; flex:1; min-height 160)
  │         ├─ div (flex; space-between; center) → span (13px 500) "Receita diária" + {{ liveDot }}
  │         └─ svg viewBox 640×220 none (width 100%; flex:1; min-height 90) → path.area fill tx .06 + path.line stroke tx 2
  ├─ div .tabbar[data-slide] (absolute; left 12; right 12; bottom 14; height 64; padding 6; flex; space-around; center; pill; glass 24px)
  │    ├─ span[data-ind] (bg acs; box-shadow inset 0 0 0 1px var(--bd); pill)
  │    └─ button[data-on] × 4 "Início" "Funil" "Vendas" "Perfil"
  └─ [mSide] div .drawer-root (absolute inset 0; z-index 5; onClick fecha)
       ├─ div .veil (absolute inset 0; bg var(--veil); animation pfFade .3s ease)
       ├─ div .blur (absolute inset 0; backdrop-filter blur(10px) saturate(.85); animation pfBlurIn .45s --ease both)
       └─ div .drawer (absolute; top 10; left 10; bottom 10; width min(280px,82%); padding 16px 12px; column; gap 18; overflow auto; bg sf3+grain; border 1px bd; shadow e3; radius 44 squircle; animation pfSideIn .6s --ease; onClick stopPropagation)
            ├─ button[aria-label="Fechar menu"] (absolute; top 18; right 12; z 2; 32×32; pill; bg sf2; color tx2) > span (14×14) IC.x
            ├─ … mesmo conteúdo da sidebar desktop (marca, busca, nav, divisor, usuário)
```

```css
.topbar  { height: 52px; margin: 6px 12px 0; padding: 0 6px; display: flex; align-items: center; gap: 8px; border-radius: 999px; background: var(--glass); backdrop-filter: blur(20px) saturate(1.4); -webkit-backdrop-filter: blur(20px) saturate(1.4); border: 1px solid var(--gbd); box-shadow: var(--e2); }
.tabbar  { position: absolute; left: 12px; right: 12px; bottom: 14px; height: 64px; padding: 6px; display: flex; justify-content: space-around; align-items: center; border-radius: 999px; background: var(--glass); backdrop-filter: blur(24px) saturate(1.4); -webkit-backdrop-filter: blur(24px) saturate(1.4); border: 1px solid var(--gbd); box-shadow: var(--e2); }
.tabbar [data-ind] { background: var(--acs); box-shadow: inset 0 0 0 1px var(--bd); border-radius: 999px; }
.tabbar button { position: relative; z-index: 1; flex: 1; height: 52px; border: 0; border-radius: 999px; background: transparent; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--tx3); font: 400 10px/1 Geist, sans-serif; cursor: pointer; transition: background 0.42s cubic-bezier(.22,1,.36,1), color 0.42s cubic-bezier(.22,1,.36,1); }
.tabbar button[data-on="true"] { color: var(--tx); font-weight: 600; }
.tabbar button > span { display: flex; width: 20px; height: 20px; transform: none; transition: transform .6s cubic-bezier(.34,1.22,.64,1); }
.tabbar button[data-on="true"] > span { transform: translateY(-1px) scale(1.08); }
.kpi-m   { background: var(--sf) var(--grain); border: 1px solid var(--bd); box-shadow: var(--sh1); border-radius: 28px; corner-shape: squircle; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.kpi-m .label { font-size: 11px; color: var(--tx2); }
.kpi-m .odo-wrap { display: block; overflow: hidden; }       /* envolve o odômetro de 22px */
.kpi-m .delta { font-size: 10.5px; color: var(--ok) | var(--er); }
.chart-m { background: var(--sf) var(--grain); border: 1px solid var(--bd); box-shadow: var(--sh1); border-radius: 32px; corner-shape: squircle; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 160px; }
.chart-m svg { width: 100%; flex: 1; min-height: 90px; }
```

Tabs (L314): `Início/home · Funil/funnel · Vendas/cart · Perfil/user`; inicial `inicio`.

Gaveta: entra da esquerda `pfSideIn .6s --ease`; véu `pfFade .3s`; desfoque `pfBlurIn .45s --ease both` (de `blur(0) saturate(1)` ao valor final `blur(10px) saturate(.85)`). Saída: **não especificada** (o nó é removido ao fechar; não há animação de saída no HTML).

### Tablet (`isTab`) — trilho de ícones

```
div (absolute inset 0; flex; gap 12; padding 12)
  ├─ div .rail (width 64; flex none; padding 14px 10px; column; center; gap 6; bg sf+grain; border 1px bd; shadow e2 [sh1 sobrescrito]; radius 32 squircle)
  │    ├─ span .logo (40×40; radius 20 squircle; bg ac; color acf; margin-bottom 8) "墨"
  │    └─ div[data-slide] (relative; column; center; gap 6)
  │         ├─ span[data-ind] (bg sf3+grain; border 1px bd; shadow sh1; pill)
  │         └─ button[data-on][aria-label] × 5 (44×44; pill; transparent; color {{ n.fg }}) > span (18×18) ícone
  └─ div .content (flex:1; min-width 0; overflow auto; column; gap 12; padding 6px 4px)
       ├─ div (flex; space-between; center) → span (500 22px/1; ls −0.02em) "Dashboard" + .avatar 36
       ├─ div .kpi-grid (grid 2 col; gap 10) → .kpi-m × 4
       └─ .chart-m
```

Tooltip do trilho ("com tooltip" no texto): **não presente** no HTML; só `aria-label`.

### Desktop (`isDesk`) — sidebar flutuante

```
div (absolute inset 0; flex; gap 14; padding 14)
  ├─ div .sidebar (width 248; flex none; padding 16px 12px; column; gap 18; bg sf+grain; border 1px bd; shadow e2; radius 44 squircle)
  │    ├─ div .brand (flex; center; gap 10; padding 4px 6px)
  │    │    ├─ span (36×36; radius 18 squircle; bg ac; color acf; shadow ink; 15px) "墨"
  │    │    ├─ div (flex:1; column; gap 2) → span (13px 600) "Loja Aurora" + span (11px tx3) "Plano Pro"
  │    │    └─ span (14×14; tx3) IC.chevronUpDown
  │    ├─ button .search[data-pop-trigger] (height 34; padding 0 12; flex; center; gap 8; border 0; pill; bg sf2; shadow deb; color tx3; 400 12px; cursor text; width 100%)
  │    │    → span (14×14) IC.search · span (flex:1) "Buscar" · span (mono 10px) "⌘K"
  │    ├─ div .nav[data-slide] (relative; column; gap 2)
  │    │    ├─ span[data-ind] (bg sf3+grain; border 1px bd; shadow sh1; pill)
  │    │    └─ button[data-on] × 5 (height 36; padding 0 12; flex; center; gap 10; border 1px solid transparent; pill; bg transparent; shadow none; color {{ n.fg }}; font 400 13px/1; font-weight {{ n.fw }}; text-align left; transition background .3s --ease, box-shadow .3s --ease; style-hover="color:var(--tx)")
  │    │         → span (16×16) ícone · span (flex:1) rótulo · [badge] span (height 18; min-width 18; padding 0 5; pill; bg shu; color #fff; 10px 600) "3"
  │    ├─ div .divider (height 1; bg bd; margin 0 8px)
  │    └─ div .user (flex; center; gap 10; padding 2px 6px)
  │         → span .avatar (32×32; pill; bg v1; #fff; 12px 500) "AS" · div (flex:1; min-width 0; column; gap 2) → span (12px 500) "Ana Souza" + span (11px tx3; ellipsis) "ana@aurora.com.br" · span (16×16; tx3) IC.settings
  └─ div .content (flex:1; min-width 0; overflow auto; column; gap 14; padding 6)
       ├─ div (flex; space-between; center)
       │    ├─ span (500 26px/1; ls −0.025em) "Dashboard"
       │    └─ span .search-pill (height 34; padding 0 14; pill; bg sf2; shadow deb; flex; center; gap 8; 12px tx3) → IC.search 14 + "Buscar ⌘K"
       ├─ div .kpi-grid (grid 4 col; gap 10) → .kpi-m × 4
       └─ .chart-m
```

Nav (L264): Dashboard/home · Funil/funnel · Vendas/cart (badge **3**) · Fontes/plug · Relatórios/file; ativo `fg var(--tx)`, `fw 500`; inativo `fg var(--tx2)`, `fw 400`; `bg/bd transparent`, `sh none` — o destaque é só o indicador deslizante. **Divergência:** a sidebar da demo mede `width: 248px`, enquanto o texto da seção e Espaço & grid dizem **232px**. Os dois valores estão no manual; o DOM renderiza 248.

Shell desktop usa a mesma `.kpi-m` compacta (não o KPI de 40px) — KPI "cheio" só aparece na seção KPIs.

---

## Placeholders não resolvidos / lacunas

- `style-hover`: aplicado pelo renderizador do manual; sem CSS fonte. Tratado como `:hover`.
- Saída (exit) da gaveta mobile, do tooltip do gráfico e dos estados `data-morph`: só o morph tem saída definida (ghost 380ms); os demais não têm animação de saída especificada.
- Tabela: ordenação, seleção, busca, paginação, skeleton, vazio, erro — **não existem** no HTML da seção 25.
- Stepper com rótulos, conexão de plataforma, detalhe de pedido, diálogo de confirmação — **não existem** na seção 26.
- Tooltip do trilho (tablet) — citado no texto, ausente no DOM.
- Comportamento acima de 1440px — não especificado.
- Texto acessível do odômetro (`aria-hidden`) — não especificado.
- `charcoalArt` / `CHARCOAL` (tema Carvão) — não usado nestas seções.
- Keyframes `pfIndet`, `pfSideIn`, `pfMailIn`, `pfBadgeIn` não existem em `origem/base.css`; precisam ser adicionados ao reescrever (definições acima).
