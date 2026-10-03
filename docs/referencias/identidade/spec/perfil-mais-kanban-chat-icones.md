# Identidade — especificação CSS: Perfil, Mais, Kanban, Chat e Ícones

Extraído do DOM renderizado (`sections/24-perfil.html`, `25-mais.html`, `26-kanban.html`, `27-chat.html`, `10-icones.html`), do fim de `37-adocao.html` (overlays globais: fantasma do kanban, painel expandido, drawer), de `style1.css` (CSS global e keyframes), de `dc.src` (resolução dos placeholders `{{ }}`) e de `zip/sumi/origem/base.css` (nomes dos tokens).

Convenções deste documento:

- Os valores são copiados literalmente dos atributos `style="..."`. Nomes `var(--x)` são mantidos.
- `style-hover="..."` no DOM equivale a `:hover { ... }`.
- `corner-shape: squircle` acompanha todo `border-radius` de superfície (é a assinatura da forma Identidade).
- `{{ x }}` resolvido = valor obtido em `dc.src`. Onde há mais de um valor possível, os estados estão listados.
- "não especificado" = não há valor no DOM nem no código.

---

## 0. Física global (vale para todos os componentes)

Fonte: `style1.css` (equivalente a `origem/base.css`).

```css
html, body { margin:0; background:var(--bg); font-family:Geist,-apple-system,sans-serif; font-size:13px; -webkit-font-smoothing:antialiased; scroll-behavior:smooth }
* { box-sizing:border-box }
a { color:inherit; text-decoration:none }  a:hover { color:var(--tx) }
a, button { -webkit-tap-highlight-color:transparent }

/* Uma só física: tudo que muda, escoa */
*, *::before, *::after {
  transition-property: background-color, border-color, color, box-shadow, transform, opacity, filter, outline-color;
  transition-duration: .55s;
  transition-timing-function: cubic-bezier(.22,1,.36,1);
}
input, textarea { transition-property: background-color, border-color, color, box-shadow }
[data-instant], [data-instant] * { transition:none !important }

/* Toque (data-press) */
[data-press] { white-space:nowrap; max-width:100%;
  transition: transform .45s cubic-bezier(.22,1,.36,1), box-shadow .5s cubic-bezier(.22,1,.36,1), filter .45s cubic-bezier(.22,1,.36,1), background .45s cubic-bezier(.22,1,.36,1) }
[data-press]:active { transition-duration:.1s }
[data-press="ink"]:active   { transform:translateY(1px) scale(.97) !important; box-shadow:var(--inkp) !important; filter:brightness(.88) }
[data-press="sheet"]:hover  { box-shadow:var(--e2) !important; transform:translateY(-1px) }
[data-press="sheet"]:active { transform:translateY(1px) scale(.98) !important; box-shadow:var(--deb) !important }
[data-press="ghost"]:active { transform:scale(.97) }
[data-press] > span:not([data-lbl]) { flex:none }
[data-lbl] { display:inline-block; flex:0 1 auto; min-width:0; max-width:100%; vertical-align:top; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }

/* Colapso (nada surge do nada) */
[data-collapse] { display:grid; grid-template-rows:0fr; opacity:0; margin-top:calc(var(--g,0px) * -1); filter:blur(2px);
  transition: grid-template-rows .6s cubic-bezier(.22,1,.36,1), opacity .45s cubic-bezier(.22,1,.36,1), margin-top .6s cubic-bezier(.22,1,.36,1), filter .5s cubic-bezier(.22,1,.36,1) }
[data-collapse][data-open="true"] { grid-template-rows:1fr; opacity:1; margin-top:0; filter:none }
[data-collapse] > * { overflow:hidden; min-height:0 }

/* Indicador deslizante (tabs segmentadas) */
[data-ind] { position:absolute; left:0; top:0; opacity:0; pointer-events:none; will-change:transform,width }
[data-slide][data-ready] > [data-ind] { transition: transform .55s cubic-bezier(.22,1,.36,1), width .55s cubic-bezier(.22,1,.36,1), opacity .3s }
/* JS (slideAll): width = largura do botão [data-on="true"]; height = altura dele; transform = translate(offsetLeft, offsetTop); opacity 1. data-ready é setado após 2 rAF da primeira medição. */

/* Tooltip */
[data-tip] { opacity:0; transform:translate(-6px,-50%) scale(.96); filter:blur(2px) }
[data-tipwrap]:hover > [data-tip], [data-tipwrap]:focus-visible > [data-tip] { opacity:1; transform:translate(0,-50%); filter:none; transition-delay:.25s }

@media (prefers-reduced-motion:reduce) { * { animation-duration:.01ms !important; transition-duration:.01ms !important } }
```

Curvas nomeadas (de `origem/base.css`): `--ease: cubic-bezier(.22,1,.36,1)` (Respiro), `--ease-move: cubic-bezier(.65,0,.35,1)` (Maré), `--ease-spring: cubic-bezier(.34,1.22,.64,1)` (Folha), `--ease-out: cubic-bezier(.4,0,.6,1)` (Saída). Durações: `--t-instant 100ms`, `--t-fast 300ms`, `--t-base 450ms`, `--t-default 550ms`, `--t-slow 600ms`, `--t-deliberate 700ms`.

Keyframes usados nestas seções (todos em `style1.css`, prefixo `pf`; em `origem/base.css` o prefixo é `sumi`):

```css
@keyframes pfItemA  { from { opacity:0; transform:translateY(8px) } }
@keyframes pfItemB  { from { opacity:0; transform:translateY(8px) } }           /* idêntico a A; alternância força re-disparo */
@keyframes pfPop    { from { opacity:0; transform:translateY(-6px) scale(.985) } to { opacity:1; transform:none } }
@keyframes pfPopUp  { from { opacity:0; transform:translateY(4px) scale(.98) }  to { opacity:1; transform:none } }
@keyframes pfPopOut { to { opacity:0; transform:translateY(-4px) scale(.985); filter:blur(1px) } }
@keyframes pfRecIn  { from { opacity:0; transform:scaleX(.92); filter:blur(2px) } }
@keyframes pfPing   { 0% { transform:scale(1); opacity:.6 } 100% { transform:scale(2.6); opacity:0 } }
@keyframes pfSpin   { to { transform:rotate(360deg) } }
@keyframes pfGrow   { from { height:0; opacity:0 } }
@keyframes pfToastIn{ from { opacity:0; transform:translateY(18px) scale(.96) } }
@keyframes pfBubble { from { opacity:0; transform:translateY(10px) scale(.97); filter:blur(2px) } }
@keyframes pfLaunch { 0% { opacity:0; transform:translateY(46px) scale(.86); filter:blur(3px) } 55% { opacity:1; filter:blur(0) } 100% { transform:none } }
@keyframes pfDot    { 0%,80%,100% { transform:translateY(0); opacity:.35 } 40% { transform:translateY(-4px); opacity:1 } }
@keyframes pfCaret  { 50% { opacity:0 } }
@keyframes pfShimmer{ 0% { background-position:-200px 0 } 100% { background-position:200px 0 } }
@keyframes pfBadgeIn{ from { opacity:0; transform:scale(.4) } }
@keyframes pfFade   { from { opacity:0 } to { opacity:1 } }
@keyframes pfFadeOut{ from { opacity:1 } to { opacity:0 } }
@keyframes pfRise   { from { opacity:0; transform:translateY(10px) scale(.975) } to { opacity:1; transform:none } }
@keyframes pfSink   { from { opacity:1; transform:none } to { opacity:0; transform:translateY(8px) scale(.97) } }
@keyframes pfBlurIn { from { backdrop-filter:blur(0px) saturate(1); -webkit-backdrop-filter:blur(0px) saturate(1) } }
@keyframes pfBlurOut{ to   { backdrop-filter:blur(0px) saturate(1); -webkit-backdrop-filter:blur(0px) saturate(1) } }
@keyframes pfDrawerIn { from { transform:translateX(104%) } to { transform:none } }
@keyframes pfDrawerOut{ from { transform:none } to { transform:translateX(104%) } }
@keyframes pfToast  { from { opacity:0; transform:translate(-50%,16px) } to { opacity:1; transform:translate(-50%,0) } }
@keyframes pfSettle { 0% { transform:scale(1.04) rotate(1.2deg); box-shadow:var(--e3) } 60% { transform:scale(.995) rotate(0) } 100% { transform:none } }   /* definido; não usado pelo DOM atual (pouso é WAAPI, ver Kanban) */
@keyframes pfLiftUp { from { transform:rotate(0) scale(1) } to { transform:rotate(1.6deg) scale(1.035) } }                                                      /* definido; não usado pelo DOM atual */
/* Ícones */
@keyframes pfDraw  { from { stroke-dashoffset:100 } to { stroke-dashoffset:0 } }
@keyframes pfSwing { 0% { transform:rotate(0) } 20% { transform:rotate(14deg) } 40% { transform:rotate(-10deg) } 60% { transform:rotate(6deg) } 80% { transform:rotate(-3deg) } 100% { transform:rotate(0) } }
@keyframes pfFlip  { 0% { transform:none } 40% { transform:perspective(60px) rotateX(-40deg) } 100% { transform:none } }
@keyframes pfDrop  { 0%,100% { transform:none } 45% { transform:translateY(3px) } }
@keyframes pfLift  { 0%,100% { transform:none } 45% { transform:translateY(-3px) } }
@keyframes pfShake { 0%,100% { transform:none } 20% { transform:rotate(-9deg) } 40% { transform:rotate(8deg) } 60% { transform:rotate(-5deg) } 80% { transform:rotate(3deg) } }
@keyframes pfPopI  { 0% { transform:scale(1) } 40% { transform:scale(1.22) } 100% { transform:scale(1) } }
@keyframes pfSeek  { 0%,100% { transform:none } 35% { transform:translate(-2px,-2px) scale(1.1) } 70% { transform:translate(1px,1px) } }
@keyframes pfNudge { 0%,100% { transform:none } 45% { transform:translateX(3px) } }
@keyframes pfBlink { 0%,100% { transform:none } 45% { transform:scaleY(.15) } }
```

Popover padrão (`{{ popIn }}`), usado por todos os menus flutuantes destas seções:

- abrindo: `pfPop .38s cubic-bezier(.22,1,.36,1)`
- fechando (`popOut=true`): `pfPopOut .24s cubic-bezier(.4,0,.6,1) forwards`; o nó é removido do DOM 230 ms depois (`closePops`).

Cabeçalho de seção (padrão repetido nas 5 seções):

```css
section[id] { padding:40px 0 56px; display:flex; flex-direction:column; gap:28px; scroll-margin-top:90px }
section > .cabecalho { display:flex; flex-direction:column; gap:8px }
.cabecalho > .eyebrow { font-family:'Geist Mono',monospace; font-size:11px; color:var(--tx3) }
.cabecalho > h2 { margin:0; font:500 32px/1.1 Geist,sans-serif; letter-spacing:-0.03em }
.cabecalho > p { margin:0; color:var(--tx2); max-width:580px /* 600px, 620px conforme seção */; line-height:1.55 }
```

Cartão de demonstração ("folha"), base de quase todo bloco:

```css
.folha { background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:44px; corner-shape:squircle }
.folha--alta { background:var(--sf3) var(--grain); border:1px solid var(--bd); box-shadow:var(--e2) }   /* variante elevada */
```

Paginação do manual (rodapé de cada seção, idêntico em todas):

```css
nav[aria-label="Paginação do manual"] { display:flex; gap:12px; flex-wrap:wrap; padding:48px 0 0; margin-top:24px; border-top:1px solid var(--bd) }
nav > a { flex:1; min-width:200px; padding:18px 22px; border-radius:32px; corner-shape:squircle; background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); display:flex; flex-direction:column; gap:6px; text-align:left /* right no "Próximo" */ }
nav > a:hover { box-shadow:var(--e2); transform:translateY(-1px) }
nav > a > span:first-child { font-size:11px; color:var(--tx3) }
nav > a > span:last-child  { font:500 17px/1.2 Geist,sans-serif; letter-spacing:-0.015em }
```

---

## 1. Avatar

### Anatomia

```
span.avatar            (círculo com iniciais)
└─ [span.status]       (ponto de presença, absoluto no canto inferior direito)
span.avatar-marca      (squircle, para marca/loja)
div.avatar-grupo       (stack sobreposto) > span.avatar × n + span.avatar.mais
```

### Estilos

```css
/* base de todos os tamanhos (pessoa = círculo) */
.avatar { border-radius:999px; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:500 }
.avatar--24 { width:24px; height:24px; font-size:9px;  background:var(--v1) }
.avatar--32 { width:32px; height:32px; font-size:11px; background:var(--v2) }
.avatar--40 { width:40px; height:40px; font-size:13px; background:var(--v4) }
.avatar--44 { width:44px; height:44px; font-size:14px; background:var(--v2) }   /* usado no cartão de perfil */
.avatar--56 { width:56px; height:56px; font-size:17px; background:var(--v3); position:relative }

/* status (56) */
.avatar--56 > .status { position:absolute; right:1px; bottom:1px; width:12px; height:12px; border-radius:9px; background:var(--ok); box-shadow:0 0 0 2.5px var(--sf) }
/* status (40, no cabeçalho do chat) */
.avatar--40 > .status { position:absolute; right:0; bottom:0; width:11px; height:11px; border-radius:9px; background:var(--ok); box-shadow:0 0 0 2.5px var(--sf) }

/* marca / loja = squircle (raio = metade do lado) */
.avatar-marca--56 { width:56px; height:56px; border-radius:28px; corner-shape:squircle; background:var(--ac); color:var(--acf); box-shadow:var(--ink); display:flex; align-items:center; justify-content:center; font-size:18px }
.avatar-marca--44 { width:44px; height:44px; border-radius:22px; corner-shape:squircle; background:var(--sf2); box-shadow:var(--deb) }   /* "tile 44" dos ícones */
.avatar-marca--40 { width:40px; height:40px; border-radius:20px; corner-shape:squircle; background:var(--ac); color:var(--acf); box-shadow:var(--ink) }  /* Identidade IA, chat */
.avatar-marca--36 { width:36px; height:36px; border-radius:18px; corner-shape:squircle; color:#fff; font-size:13px; font-weight:500 }  /* lojas; background = var(--v4) | var(--v1) | var(--v3) */
.avatar-marca--28 { width:28px; height:28px; border-radius:14px; corner-shape:squircle; background:var(--ac); color:var(--acf) }      /* IA inline, chat */

/* grupo / stack */
.avatar-grupo { display:flex }
.avatar-grupo > .avatar { width:32px; height:32px; font-size:11px; box-shadow:0 0 0 2px var(--sf) }   /* sem font-weight explícito aqui */
.avatar-grupo > .avatar + .avatar { margin-left:-8px }
.avatar-grupo > .avatar.mais { background:var(--sf2); color:var(--tx2) }   /* "+4" */
/* legenda ao lado do grupo */
.avatar-grupo-wrap { display:flex; align-items:center; gap:10px }
.avatar-grupo-wrap > span { font-size:12px; color:var(--tx2) }
```

Linha de demonstração dos tamanhos: `display:flex; align-items:flex-end; gap:14px; flex-wrap:wrap`. Legenda em mono: `font-family:'Geist Mono',monospace; font-size:10.5px; color:var(--tx3)`.

### Estados

- Online: ponto `var(--ok)`. Outros estados de presença: não especificado.

### Movimento

- Nenhuma animação própria. Herda a transição global (.55s Respiro) para `background-color`, `color`, `box-shadow`.

### Medidas

| Tamanho | Fonte iniciais | Status |
|---|---|---|
| 24 | 9px / 500 | — |
| 32 | 11px / 500 | — |
| 40 | 13px / 500 | 11px, offset 0 |
| 44 | 14px / 500 | — |
| 56 | 17px / 500 | 12px, offset 1px |
| marca 56 | 18px (glifo) | — |

Sobreposição no stack: −8px; anel de separação: 2px `var(--sf)`.

---

## 2. Cartão de perfil (nota com composer e áudio)

### Anatomia

```
div.cartao (folha alta)
├─ div.cabecalho  > span.avatar--44 + div.identidade (nome, handle)
├─ textarea.nota
└─ div[data-morph] (barra de ações, 3 estados mutuamente exclusivos)
   ├─ [rec.idle]  div.toolbar
   │   ├─ button[data-ai=mic]   (Gravar áudio)
   │   ├─ div.rel > button[data-ai=clip] (Anexar) + [attach] div[data-pop].menu
   │   ├─ div.rel > button[data-ai=moreH] (Mais opções) + [noteMore] div[data-pop].menu
   │   ├─ span.espaco (flex:1)
   │   └─ button[data-press=ink] Publicar
   ├─ [rec.rec]   div.gravando (trash · ping · tempo · barras · stop)
   └─ [rec.post]  div.gravado  (play/pause · barras · tempo · trash · enviar)
```

### Estilos

```css
.cartao { background:var(--sf3) var(--grain); border:1px solid var(--bd); box-shadow:var(--e2); border-radius:48px; corner-shape:squircle; padding:26px 28px; display:flex; flex-direction:column; gap:18px }

.cabecalho { display:flex; align-items:center; gap:12px }
.cabecalho > .avatar--44 { width:44px; height:44px; border-radius:999px; background:var(--v2); color:#fff; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:500 }
.identidade { flex:1; display:flex; flex-direction:column; gap:2px }
.identidade > .nome   { font-size:14px; font-weight:600 }
.identidade > .handle { font-size:12px; color:var(--tx3) }

textarea.nota { resize:none; border:0; border-bottom:1px solid var(--bd); background:transparent; padding:0 0 12px; outline:none; color:var(--tx); font:400 13px/1.5 Geist,sans-serif }   /* rows=2 */

[data-morph] { position:relative; min-height:40px; display:flex; align-items:center }

/* --- estado idle --- */
.toolbar { flex:1; display:flex; align-items:center; gap:2px; animation:pfItemA .5s cubic-bezier(.22,1,.36,1) }
.toolbar > button.icone, .rel > button.icone { width:34px; height:34px; border:0; border-radius:999px; background:transparent; color:var(--tx2); display:flex; align-items:center; justify-content:center; cursor:pointer }
button.icone:hover { background-color:var(--acs); color:var(--tx) }
button.icone > span { display:flex; width:16px; height:16px }
.rel { position:relative }
.espaco { flex:1 }
button.publicar { height:34px; padding:0 16px; border:0; border-radius:999px; background:var(--ac); color:var(--acf); box-shadow:var(--ink); font:600 12px/1 Geist,sans-serif; cursor:pointer }   /* data-press="ink" */

/* menu flutuante (anexar / mais) */
[data-pop].menu { position:absolute; left:0; bottom:calc(100% + 8px); z-index:9; min-width:220px; padding:6px; display:flex; flex-direction:column; gap:2px;
  background:var(--glass); backdrop-filter:blur(24px) saturate(1.3); -webkit-backdrop-filter:blur(24px) saturate(1.3);
  border:1px solid var(--gbd); box-shadow:var(--e2); border-radius:24px; corner-shape:squircle; transform-origin:bottom left; animation:{{ popIn }} }
[data-pop].menu > button { min-height:36px; padding:0 12px; display:flex; align-items:center; gap:10px; border:0; border-radius:999px; background:transparent; color:var(--tx); font:400 13px/1 Geist,sans-serif; cursor:pointer; text-align:left; white-space:nowrap }
[data-pop].menu > button:hover { background-color:var(--acs) }
[data-pop].menu > button > span { display:flex; width:16px; height:16px; color:var(--tx2) }

/* --- estado gravando --- */
.gravando { flex:1; height:44px; display:flex; align-items:center; gap:10px; padding:0 5px 0 8px; border-radius:999px; background:var(--sf2); box-shadow:var(--deb); animation:pfRecIn .55s cubic-bezier(.22,1,.36,1) }
.gravando > button.cancelar { /* = button.icone, data-ai="trash" */ }
.ping { position:relative; flex:none; width:10px; height:10px }
.ping > .onda  { position:absolute; inset:0; border-radius:99px; background:var(--shu); animation:pfPing 1.4s ease-out infinite }
.ping > .ponto { position:absolute; inset:0; border-radius:99px; background:var(--shu) }
.tempo { font:500 12px/1 'Geist Mono',monospace; width:34px }                      /* formato m:ss */
.barras { flex:1; min-width:0; height:28px; display:flex; align-items:center; justify-content:flex-end; gap:2px; overflow:hidden }
.barras > span { flex:none; width:3px; height:{{ b.h }}; border-radius:2px; background:{{ b.c }}; transition:height .22s cubic-bezier(.22,1,.36,1) }
button.parar { flex:none; width:34px; height:34px; border:0; border-radius:999px; background:var(--shu); color:#fff; box-shadow:var(--ink); display:flex; align-items:center; justify-content:center; cursor:pointer }
button.parar > span { display:flex; width:14px; height:14px }   /* ic.stop */

/* --- estado pós-gravação --- */
.gravado { flex:1; height:44px; display:flex; align-items:center; gap:10px; padding:0 5px; border-radius:999px; background:var(--sf2); box-shadow:var(--deb); animation:pfRecIn .55s cubic-bezier(.22,1,.36,1) }
button.ouvir { flex:none; width:34px; height:34px; border:0; border-radius:999px; background:var(--sf3); box-shadow:var(--sh1); color:var(--tx); display:flex; align-items:center; justify-content:center; cursor:pointer }
button.ouvir > span { display:flex; width:14px; height:14px }           /* pause */
button.ouvir > span.play { margin-left:2px }                             /* play: compensação óptica */
.gravado > .barras { justify-content:flex-start /* sem justify-content explícito */; }
.gravado > .barras > span { transition:background .3s cubic-bezier(.22,1,.36,1) }   /* na reprodução anima a cor, não a altura */
.gravado > .tempo { font:500 12px/1 'Geist Mono',monospace; color:var(--tx2) }      /* sem width fixo */
button.descartar { /* = button.icone, data-ai="trash" */ }
button.enviar-audio { flex:none; width:34px; height:34px; border:0; border-radius:999px; background:var(--ac); color:var(--acf); box-shadow:var(--ink); display:flex; align-items:center; justify-content:center; cursor:pointer }   /* data-press="ink" */
button.enviar-audio > span { display:flex; width:14px; height:14px }   /* ic.send */
```

### Estados (resolvidos de `rec` em dc.src)

- `rec.idle`: `st==='idle'` → toolbar.
- `rec.rec`: `st==='rec'` → gravando. Enquanto grava, a cada **110 ms** entra uma barra nova com valor `0.15 + random*0.85*(0.5+0.5*sin(t/240))`; mantém as últimas 36.
- `rec.post`: `st==='done' || st==='play'`. `rec.playing` = `'play'`, `rec.paused` = `'done'`. Ao parar com menos de 12 barras, gera 36 barras aleatórias (`.2 + random*.8`).
- Barras (36 posições, `n=36`): `h = round(4 + v*22) px` → faixa **4–26px**; posição vazia usa `v=0.08` → 6px.
  - Gravando: `c = i > n-4 ? var(--tx) : var(--tx2)` (as 3 últimas em `--tx`, restante `--tx2`).
  - Pós-gravação: `c = (i/n <= prog && prog > 0) ? var(--tx) : var(--bd2)` (progresso pintado em `--tx`).
- Reprodução: tick de 60 ms; duração = `max(2, t)` s; ao final, `prog` volta a 0 depois de 400 ms.
- Enviar: cancela e exibe toast "Áudio enviado · m:ss".
- Menus: `attach` e `noteMore` são exclusivos; itens anexar = Foto ou vídeo (eye), Arquivo (file), Planilha de vendas (bars), Link de campanha (link); itens mais = Agendar publicação (calendar), Marcar como importante (star), Mencionar alguém (users).

### Movimento

- Toolbar entra: `pfItemA .5s cubic-bezier(.22,1,.36,1)`.
- Barra de gravação / pós-gravação entra: `pfRecIn .55s cubic-bezier(.22,1,.36,1)` (de `scaleX(.92)` + blur 2px).
- Ponto vermelho: `pfPing 1.4s ease-out infinite` (escala 1→2.6, opacidade .6→0).
- Barra individual: `height .22s` (gravando) / `background .3s` (reprodução), ambas Respiro.
- Menus: `pfPop .38s` entrada / `pfPopOut .24s cubic-bezier(.4,0,.6,1) forwards` saída, `transform-origin:bottom left`.
- Botões de ícone: hover por transição global (.55s).
- `data-morph`: o contêiner observa mutações (MutationObserver) e faz morph de altura entre estados — a lógica mede `getBoundingClientRect().height` antes/depois; parâmetros de duração do morph: não especificado no trecho lido.

### Medidas

Altura das barras de estado 44px; botões 34px; ícones 16px (14px em stop/play/pause/send); gap 10px; padding `0 5px 0 8px` (gravando) e `0 5px` (gravado); popover `min-width:220px`, offset 8px acima do gatilho.

---

## 3. Menu de usuário / Trocar de loja (lista de itens)

### Anatomia

```
div.menu-lojas (folha alta, padding 8)
├─ span.titulo "Trocar de loja"
├─ button.item × 3 > span.avatar-marca--36 + span.textos(nome, meta) + span.check
├─ div.divisor
├─ div.acao "Adicionar loja" (ic.plus)
└─ div.acao "Sair" (ic.logout)
```

### Estilos

```css
.menu-lojas { padding:8px; display:flex; flex-direction:column; gap:2px; background:var(--sf3) var(--grain); border:1px solid var(--bd); box-shadow:var(--e2); border-radius:36px; corner-shape:squircle }
.menu-lojas > .titulo { font-size:11px; color:var(--tx3); padding:10px 14px 4px }

button.item { height:52px; padding:0 12px; display:flex; align-items:center; gap:10px; border:0; border-radius:24px; corner-shape:squircle; background:{{ st.bg }}; color:var(--tx); cursor:pointer; text-align:left; font-family:Geist,sans-serif }
button.item:hover { background-color:var(--acs) }
button.item > .avatar-marca--36 { width:36px; height:36px; border-radius:18px; corner-shape:squircle; background:{{ st.c }}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:500 }
button.item > .textos { flex:1; display:flex; flex-direction:column; gap:2px }
button.item > .textos > .nome { font-size:13px; font-weight:500 }
button.item > .textos > .meta { font-size:11px; color:var(--tx3) }
button.item > .check { display:flex; width:14px; height:14px; opacity:{{ st.chk }} }   /* ic.check */

.divisor { height:1px; background:var(--bd); margin:4px 10px }
.acao { height:36px; padding:0 14px; display:flex; align-items:center; gap:10px; border-radius:999px; font-size:13px; color:var(--tx2) }
.acao:hover { background-color:var(--acs) }
.acao > span { display:flex; width:16px; height:16px }
```

### Estados

- Selecionada (`store === k`, padrão `'aurora'`): `st.bg = var(--acs)`, `st.chk = 1`. Demais: `transparent`, `0`.
- Cores de loja: Aurora `var(--v4)` (A), Nimbus `var(--v1)` (N), Kaze `var(--v3)` (K).

### Movimento

- Troca de seleção via transição global (`background-color`, `opacity` .55s Respiro).

### Medidas

Item 52px; avatar 36 (raio 18 squircle); raio do item 24 squircle; ações 36px pílula; divisor 1px com margem 4/10.

---

## 4. Notificações

### Anatomia

```
div.notificacoes (folha alta, padding 8)
├─ div.topo > span.titulo "Notificações" + button.ler-todas
├─ div[data-slide].tabs > span[data-ind] + button[data-press=ghost][data-on] × 3
└─ div.item × n (animação escalonada)
   ├─ span.icone-tile (36 squircle) > span.icone(16) + span.dot
   ├─ div.textos > span.titulo + span.sub
   └─ span.hora (mono)
```

### Estilos

```css
.notificacoes { background:var(--sf3) var(--grain); border:1px solid var(--bd); box-shadow:var(--e2); border-radius:44px; corner-shape:squircle; padding:8px; display:flex; flex-direction:column }
.topo { display:flex; align-items:center; justify-content:space-between; padding:12px 14px 10px }
.topo > .titulo { font:500 15px/1 Geist,sans-serif }
.topo > button.ler-todas { border:0; background:transparent; min-height:28px; padding:0 2px; font-size:12px; color:var(--tx2); cursor:pointer }

/* tabs segmentadas com indicador deslizante */
[data-slide].tabs { position:relative; display:flex; gap:2px; padding:3px; margin:0 8px 6px; border-radius:999px; background:var(--sf2); box-shadow:var(--deb) }
[data-slide].tabs > [data-ind] { background:var(--sf3); box-shadow:var(--sh1); border-radius:999px }
[data-slide].tabs > button { position:relative; z-index:1; flex:1; height:30px; border:0; border-radius:999px; background:{{ t.bg }}; color:{{ t.fg }}; box-shadow:{{ t.sh }}; font:500 12px/1 Geist,sans-serif; cursor:pointer; transition:all 0.34s cubic-bezier(.22,1,.36,1) }
/* resolvido: t.bg = transparent; t.sh = none; t.fg = var(--tx) se ativa, var(--tx3) se não */

.item { animation:{{ n.anim }}; display:flex; gap:12px; align-items:flex-start; padding:12px 14px; border-radius:24px; corner-shape:squircle }
.item:hover { background-color:var(--acs) }
.icone-tile { position:relative; flex:none; width:36px; height:36px; border-radius:18px; corner-shape:squircle; background:var(--sf2); display:flex; align-items:center; justify-content:center; color:var(--tx2) }
.icone-tile > .icone { display:flex; width:16px; height:16px }
.icone-tile > .dot { position:absolute; top:-1px; right:-1px; width:8px; height:8px; border-radius:9px; background:{{ n.dot }} }
.item > .textos { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px }
.textos > .titulo { font-size:13px; font-weight:500 }
.textos > .sub    { font-size:12px; color:var(--tx3) }
.item > .hora { font-family:'Geist Mono',monospace; font-size:10.5px; color:var(--tx3) }
```

### Estados

- Tabs: `todas | vendas | sistema`. `data-on="true"` na ativa dirige o indicador.
- `n.dot`: `var(--er)` apenas no primeiro item da lista filtrada (`i===0`); `transparent` nos outros. Após "Marcar como lidas" (`read=true`): todos `transparent`.
- Dados: Venda aprovada (cart), Token do Meta expira em 3 dias (plug), Meta de outubro atingida (target), Relatório semanal pronto (file).

### Movimento

- Entrada dos itens (re-dispara ao trocar de aba): `n.anim = (pfItemA|pfItemB) .6s cubic-bezier(.22,1,.36,1) {i*55}ms both` — alterna A/B conforme índice da aba (`indexOf(ntab)%2`), stagger **55 ms** por item.
- Indicador: `transform .55s / width .55s` Respiro, `opacity .3s`.
- Botão de aba: `transition:all 0.34s cubic-bezier(.22,1,.36,1)` (cor do texto).

### Medidas

Tile 36 (raio 18 squircle); ícone 16; dot 8px em (−1,−1); item padding 12/14, raio 24; tabs altura 30 dentro de trilho com padding 3 (36 total), gap 2, margem `0 8px 6px`.

---

## 5. Atividade / Linha do tempo

### Anatomia

```
div.timeline (folha)
├─ span.titulo "Linha do tempo"
└─ div.grupo × 2
   ├─ div.grupo-cab > span.ponto-cab + span.h
   └─ div.grupo-corpo (borda esquerda) > div.evento × n > span.ponto + texto
```

### Estilos

```css
.timeline { background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:44px; corner-shape:squircle; padding:24px 28px; display:flex; flex-direction:column }
.timeline > .titulo { font:500 15px/1 Geist,sans-serif; margin-bottom:14px }
.grupo { display:flex; flex-direction:column }
.grupo-cab { display:flex; align-items:center; gap:12px; height:32px }
.grupo-cab > .ponto-cab { width:7px; height:7px; border-radius:9px; background:var(--tx3); margin-left:3px }
.grupo-cab > .h { font-size:13px; font-weight:500 }
.grupo-corpo { margin-left:6px; border-left:1px solid var(--bd2); padding-left:14px; display:flex; flex-direction:column; gap:2px; padding-bottom:6px }
.evento { position:relative; height:36px; padding:0 12px; display:flex; align-items:center; border-radius:999px; background:{{ i.bg }}; color:{{ i.c }}; font-size:13px }
.evento:hover { background-color:var(--acs); color:var(--tx) }
.evento > .ponto { position:absolute; left:-18px; width:7px; height:7px; border-radius:9px; background:{{ i.dot }}; box-shadow:0 0 0 3px var(--sf) }
```

### Estados (resolvidos)

- Evento destacado (grupo 0, item 1 — "Campanha 'Remarketing 7d' escalada +20%"): `bg=var(--acs)`, `c=var(--tx)`, `dot=var(--v6)`.
- Demais: `bg=transparent`, `c=var(--tx2)`, `dot=var(--tx4)`.
- Grupos: "Hoje" (3 itens), "Ontem" (2 itens).

### Movimento

- Só transição global no hover (background/color .55s).

### Medidas

Linha vertical 1px `--bd2` a 6px da margem; pontos 7px com anel 3px `--sf`, deslocados −18px (centralizados na linha: 14 + 1/2 + 3,5); evento 36px pílula.

---

## 6. Banner de novidade (colapsável)

### Anatomia

```
div[data-collapse][data-open={{ banner }}] (--g:28px) > div > div.banner
  ├─ span.icone (sparkle, cor --v4)
  ├─ span.texto
  ├─ button[data-press=ghost] "Ver novidade"
  └─ button.fechar (ic.x)
div[data-collapse][data-open={{ noBanner }}] (--g:28px) > div > button.link "Mostrar banner de novidade"
```

### Estilos

```css
.banner { display:flex; align-items:center; gap:14px; padding:12px 12px 12px 20px; border-radius:999px; background:var(--ac); color:var(--acf); box-shadow:var(--ink) }
.banner > .icone { display:flex; width:16px; height:16px; color:var(--v4) }
.banner > .texto { flex:1; font-size:13px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.banner > button.ver { height:30px; padding:0 14px; border:0; border-radius:999px; background:rgba(127,127,127,.18); color:var(--acf); font:500 12px/1 Geist,sans-serif; cursor:pointer }
.banner > button.fechar { width:30px; height:30px; border:0; border-radius:999px; background:transparent; color:var(--acf); opacity:.6; display:flex; align-items:center; justify-content:center; cursor:pointer }
.banner > button.fechar > span { display:flex; width:14px; height:14px }
button.link { align-self:flex-start; border:0; background:transparent; font-size:12px; color:var(--tx2); cursor:pointer; text-decoration:underline }
```

### Movimento

- Abre/fecha pelo `[data-collapse]` global: `grid-template-rows .6s`, `opacity .45s`, `margin-top .6s` (compensa o gap de 28px via `--g`), `filter .5s` (blur 2px→0), tudo Respiro.

---

## 7. Calendário (seleção de intervalo)

### Anatomia

```
div.calendario (folha, padding 24/26)
├─ div.topo > span.mes "Outubro 2026" + div.nav > button(chevronLeft) + button(chevronRight)
├─ div.dias-semana (grid 7) > span × 7  (S T Q Q S S D)
├─ div.grade (grid 7) > button.dia × 34  (3 vazios + 31)
└─ div.rodape > span.label + div.presets > button[data-press=sheet] × 3
```

### Estilos

```css
.calendario { background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:44px; corner-shape:squircle; padding:24px 26px; display:flex; flex-direction:column; gap:14px }
.topo { display:flex; justify-content:space-between; align-items:center }
.topo > .mes { font:500 15px/1 Geist,sans-serif }
.topo > .nav { display:flex; gap:2px }
.nav > button { width:32px; height:32px; border:0; border-radius:999px; background:transparent; color:var(--tx2); display:flex; align-items:center; justify-content:center }   /* data-press="ghost" */
.nav > button > span { display:flex; width:14px; height:14px }

.dias-semana { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:2px 0; text-align:center; font-size:10.5px; color:var(--tx3) }
.grade { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:2px 0 }
button.dia { height:36px; border:0; border-radius:{{ d.r }}; background:{{ d.bg }}; box-shadow:{{ d.bd }}; color:{{ d.fg }}; font:400 13px/1 'Geist Mono',monospace; font-weight:{{ d.fw }}; cursor:pointer; transition:background 0.3s cubic-bezier(.22,1,.36,1) }
/* vazios: disabled, aria-hidden, bg transparent, fg transparent, bd none, r 0 */

.rodape { display:flex; justify-content:space-between; align-items:center; gap:8px; padding-top:12px; border-top:1px solid var(--bd); flex-wrap:wrap }
.rodape > .label { font-size:12px; color:var(--tx2) }
.presets { display:flex; gap:4px }
.presets > button { height:30px; padding:0 12px; border:1px solid var(--bd); border-radius:999px; background:var(--sf3); box-shadow:var(--sh1); color:var(--tx); font:500 11px/1 Geist,sans-serif; cursor:pointer }   /* data-press="sheet" */
```

### Estados (resolvidos de `calDays`)

| Estado do dia | `d.bg` | `d.fg` | `d.bd` (box-shadow) | `d.r` | `d.fw` |
|---|---|---|---|---|---|
| Extremo (a ou b) | `var(--tx)` | `var(--sf)` | `var(--ink)` | `999px` | 600 |
| Dentro do intervalo (`lo<d<hi`) | `var(--acs)` | `var(--tx)` | `none` | `8px` | 400 |
| Dia 1 sem ser extremo ("hoje") | `transparent` | `var(--tx)` | `inset 0 0 0 1px var(--tx3)` | `999px` | 400 |
| Normal | `transparent` | `var(--tx)` | `none` | `999px` | 400 |

- Offset do mês: 3 células vazias; 31 dias.
- Interação: clique define `a`; segundo clique define `b` (ordena); terceiro recomeça. `mouseenter` grava `calH` (hover) e o intervalo é pré-visualizado usando `b ?? calH`.
- Rótulo: `"dd — dd out 2026 · N dias"` ou `"Início dd out · escolha o fim"`.
- Presets: 7 dias (1–7), Quinzena (1–15), Mês (1–31).

### Movimento

- Célula: `transition:background 0.3s cubic-bezier(.22,1,.36,1)`; demais propriedades (color, box-shadow, border-radius não listado) seguem a transição global para color/box-shadow; `border-radius` não é animado (não está na lista global).

### Medidas

Célula 36px alta; grade com gap vertical 2px, horizontal 0 (intervalo contínuo); raio interno do intervalo 8px; dias da semana 10.5px.

---

## 8. OTP (código de verificação)

### Anatomia

```
div.otp (folha)
├─ span.titulo "Código de verificação"
├─ label.caixas (relative, cursor:text) > span.caixa × 6 + input (invisível por cima)
└─ div.rodape > span.msg + button.limpar
```

### Estilos

```css
.otp { background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:44px; corner-shape:squircle; padding:24px 26px; display:flex; flex-direction:column; gap:14px }
.otp > .titulo { font:500 15px/1 Geist,sans-serif }
label.caixas { position:relative; display:flex; gap:8px; cursor:text }
span.caixa { flex:1; max-width:52px; height:52px; border-radius:20px; corner-shape:squircle; background:var(--sf2); box-shadow:var(--deb),{{ b.ring }}; border:1px solid {{ b.bd }}; display:flex; align-items:center; justify-content:center; font:400 22px/1 'Geist Mono',monospace; transition:border-color 0.3s cubic-bezier(.22,1,.36,1),box-shadow 0.3s cubic-bezier(.22,1,.36,1) }
label.caixas > input { position:absolute; inset:0; opacity:0; width:100%; cursor:text }   /* inputmode=numeric */
.rodape { display:flex; justify-content:space-between; align-items:center; gap:8px }
.rodape > .msg { font-size:12px; color:{{ otpFg }} }
.rodape > button.limpar { border:0; background:transparent; min-height:28px; padding:0 2px; font-size:12px; color:var(--tx2); cursor:pointer; text-decoration:underline }
```

### Estados (resolvidos)

| `otpSt` | `b.bd` | `b.ring` | `otpFg` | mensagem |
|---|---|---|---|---|
| idle, caixa atual (`i === min(len,5)`) | `var(--tx)` | `0 0 0 3px var(--ring)` | `var(--tx3)` | "Digite o código enviado para …" |
| idle, outras | `transparent` | `none` | `var(--tx3)` | — |
| checking (6 dígitos) | `transparent` | `none` | `var(--tx2)` | "Verificando…" |
| ok (após 900 ms) | `var(--ok)` (todas) | `none` | `var(--ok)` | "Código confirmado" |
| error (`000000`) | `var(--er)` (todas) | `none` | `var(--er)` | "Código inválido — …" |

### Movimento

- `border-color .3s` e `box-shadow .3s` Respiro na caixa; cor da mensagem pela transição global.

### Medidas

Caixa 52×52 (max-width 52, raio 20 squircle), gap 8, dígito 22px mono; anel de foco 3px `--ring`.

---

## 9. Link de indicação + teclas (kbd)

### Estilos

```css
.link-card { background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:44px; corner-shape:squircle; padding:24px 26px; display:flex; flex-direction:column; gap:12px }
.link-card > .titulo { font:500 15px/1 Geist,sans-serif }
.campo-link { height:40px; padding:0 4px 0 16px; display:flex; align-items:center; gap:8px; border-radius:999px; background:var(--sf2); box-shadow:var(--deb) }
.campo-link > .url { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font:400 12px/1 'Geist Mono',monospace; color:var(--tx2) }
.campo-link > button.copiar { height:32px; padding:0 14px 0 12px; display:inline-flex; align-items:center; gap:6px; border:0; border-radius:999px; background:var(--ac); color:var(--acf); box-shadow:var(--ink); font:500 12px/1 Geist,sans-serif; cursor:pointer }   /* data-press="ink" */
.campo-link > button.copiar > span:first-child { display:flex; width:14px; height:14px }   /* copyIcon = ic.copy | ic.check (copiado) */

.atalhos { display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-size:12px; color:var(--tx2) }
kbd { height:22px; min-width:22px; padding:0 6px; border-radius:7px; background:var(--sf3); box-shadow:var(--sh1),inset 0 -1px 0 var(--bd); font-family:'Geist Mono',monospace; font-size:11px; display:inline-flex; align-items:center; justify-content:center }
```

### Estados

- `copied`: rótulo "Copiado" + `ic.check`; volta a "Copiar" + `ic.copy` após **1600 ms**.

### Medidas

Campo 40px, botão interno 32px (padding `0 14px 0 12px` — lado do ícone perde 2px), kbd 22px com raio 7.

---

## 10. Acordeão (Perguntas frequentes)

### Anatomia

```
div.faq (folha, padding 12)
├─ span.titulo
└─ div.item × 3
   ├─ button.pergunta > span.q + span.icone(plus, rotaciona)
   └─ div.grid-rows > div(overflow:hidden) > p.resposta
```

### Estilos

```css
.faq { background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:44px; corner-shape:squircle; padding:12px; display:flex; flex-direction:column; gap:4px }
.faq > .titulo { font:500 15px/1 Geist,sans-serif; padding:14px 16px 8px }
.item { border:1px solid {{ a.bd }}; border-radius:28px; corner-shape:squircle; background:{{ a.bg }}; box-shadow:{{ a.sh }}; transition:background 0.34s cubic-bezier(.22,1,.36,1),box-shadow 0.34s cubic-bezier(.22,1,.36,1) }
button.pergunta { width:100%; min-height:48px; padding:12px 16px; display:flex; align-items:center; gap:12px; border:0; background:transparent; color:var(--tx); font:500 13px/1.4 Geist,sans-serif; cursor:pointer; text-align:left }
button.pergunta > .q { flex:1 }
button.pergunta > .icone { display:flex; width:16px; height:16px; color:var(--tx2); transform:{{ a.rot }}; transition:transform 0.51s cubic-bezier(.34,1.22,.64,1) }
.grid-rows { display:grid; grid-template-rows:{{ a.rows }}; transition:grid-template-rows 0.54s cubic-bezier(.22,1,.36,1) }
.grid-rows > div { overflow:hidden }
p.resposta { margin:0; padding:0 16px 16px; font-size:13px; line-height:1.6; color:var(--tx2) }
```

### Estados (resolvidos)

| | aberto | fechado |
|---|---|---|
| `a.rows` | `1fr` | `0fr` |
| `a.rot` | `rotate(45deg)` | `none` |
| `a.bg` | `var(--sf3) var(--grain)` | `transparent` |
| `a.sh` | `var(--sh1)` | `none` |
| `a.bd` | `var(--bd)` | `transparent` |

Um item aberto por vez (`acc` = índice; clicar no aberto fecha).

### Movimento

- Altura: `grid-template-rows .54s` Respiro. Ícone "+"→"×": `transform .51s cubic-bezier(.34,1.22,.64,1)` (Folha). Superfície: `background .34s`, `box-shadow .34s` Respiro; `border-color` pela transição global.

---

## 11. Drawer lateral + Linha de detalhe rótulo/valor

Gatilho (seção Mais):

```css
.drawer-card { background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:44px; corner-shape:squircle; padding:28px; display:flex; flex-direction:column; gap:12px; justify-content:center }
.drawer-card > .titulo { font:500 15px/1 Geist,sans-serif }
.drawer-card > .desc { font-size:13px; color:var(--tx2); line-height:1.55 }
.drawer-card > button.abrir { align-self:flex-start; height:36px; padding:0 16px 0 14px; display:inline-flex; align-items:center; gap:6px; border:0; border-radius:999px; background:var(--ac); color:var(--acf); box-shadow:var(--ink); font:500 13px/1 Geist,sans-serif; cursor:pointer }   /* data-press="ink"; ícone receipt 16 */
```

### Anatomia (overlay, em 37-adocao.html)

```
div.scrim-wrap (fixed, inset 0, z 100, onClick fecha)
├─ div.veu (gradiente + veil, animação dScrim)
├─ div.blur × 4 (dBlur: camadas de backdrop-filter mascaradas)
└─ div.drawer (stopPropagation)
   ├─ div.cab > div(eyebrow mono + título) + button.fechar
   ├─ div.corpo > div.valor (R$ + badge) + div.detalhes > div.linha × 4
   └─ div.rodape > button[sheet] Reembolsar + button[ink] Concluir
```

### Estilos

```css
.scrim-wrap { position:fixed; inset:0; z-index:100 }
.veu { position:absolute; inset:0; background:linear-gradient(270deg,var(--veil) 0,transparent 100%),var(--veil); animation:{{ dScrim }} }
.blur { position:absolute; inset:0; backdrop-filter:{{ l.f }}; -webkit-backdrop-filter:{{ l.f }}; mask-image:{{ l.m }}; -webkit-mask-image:{{ l.m }}; pointer-events:none; animation:{{ l.a }} }
/* dBlur resolvido (4 camadas, o desfoque cresce em direção ao drawer):
   f: blur(2px) saturate(.85)  m: linear-gradient(270deg,#000 0,#000 30%,transparent 60%)
   f: blur(6px) saturate(.85)  m: linear-gradient(270deg,#000 0,#000 30%,transparent 72%)
   f: blur(14px) saturate(.85) m: linear-gradient(270deg,#000 0,#000 30%,transparent 84%)
   f: blur(26px) saturate(.85) m: linear-gradient(270deg,#000 0,#000 30%,transparent 100%)
   a: pfBlurIn .5s cubic-bezier(.22,1,.36,1) both | fechando: pfBlurOut .22s ease forwards */

.drawer { position:absolute; top:12px; right:12px; bottom:12px; width:min(420px,calc(100% - 24px)); display:flex; flex-direction:column; background:var(--sf3) var(--grain); border:1px solid var(--bd); box-shadow:var(--e3); border-radius:44px; corner-shape:squircle; color:var(--tx); overflow:hidden; animation:{{ drawerAnim }} }
.drawer > .cab { display:flex; align-items:center; justify-content:space-between; padding:22px 22px 16px 26px; border-bottom:1px solid var(--bd) }
.cab > div { display:flex; flex-direction:column; gap:4px }
.cab .eyebrow { font-family:'Geist Mono',monospace; font-size:11px; color:var(--tx3) }
.cab .titulo  { font:500 20px/1.2 Geist,sans-serif; letter-spacing:-0.02em }
.cab > button.fechar { width:32px; height:32px; border:0; border-radius:999px; background:transparent; color:var(--tx2); display:flex; align-items:center; justify-content:center; cursor:pointer }   /* ic.x 16 */
.drawer > .corpo { flex:1; overflow:auto; padding:22px 26px; display:flex; flex-direction:column; gap:18px }
.valor { display:flex; align-items:baseline; gap:10px }
.valor > .numero { font:300 40px/1 Geist,sans-serif; letter-spacing:-0.04em }
.valor > .badge  { height:22px; padding:0 9px; border-radius:999px; background:var(--oks); color:var(--ok); font-size:11px; font-weight:500; display:inline-flex; align-items:center }

/* Linha de detalhe rótulo/valor */
.detalhes { display:flex; flex-direction:column }
.linha { display:flex; justify-content:space-between; padding:11px 0; border-top:1px solid var(--bd); font-size:13px }
.linha > .rotulo { color:var(--tx2) }
.linha > .valor-txt { /* cor herdada --tx */ }
.linha > .valor-txt.mono { font-family:'Geist Mono',monospace }   /* valores monetários */

.drawer > .rodape { display:flex; gap:8px; padding:16px 22px; border-top:1px solid var(--bd) }
.rodape > button.reembolsar { flex:1; height:40px; border:1px solid var(--bd); border-radius:999px; background:var(--sf3); box-shadow:var(--sh1); color:var(--tx); font:500 13px/1 Geist,sans-serif; cursor:pointer }   /* data-press="sheet" */
.rodape > button.concluir   { flex:1; height:40px; border:0; border-radius:999px; background:var(--ac); color:var(--acf); box-shadow:var(--ink); font:500 13px/1 Geist,sans-serif; cursor:pointer }   /* data-press="ink" */
```

### Movimento (resolvido)

- Abrir: `drawerAnim = pfDrawerIn .45s cubic-bezier(.22,1,.36,1)`; `dScrim = pfFade .3s ease`; blur `pfBlurIn .5s` Respiro `both`.
- Fechar (`dClosing`): `pfDrawerOut .22s ease forwards`; `pfFadeOut .22s ease forwards`; `pfBlurOut .22s ease forwards`; DOM removido após **220 ms**.

### Medidas

Drawer 420px (ou 100% − 24), margem 12px nas 3 bordas, raio 44; linha de detalhe 13px com padding vertical 11 e separador 1px no topo.

---

## 12. Faixa de ticket (slider de intervalo)

### Estilos

```css
.faixa { background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:44px; corner-shape:squircle; padding:26px 28px; display:flex; flex-direction:column; gap:18px }
.faixa > .topo { display:flex; justify-content:space-between; align-items:baseline; gap:10px }
.topo > .titulo { font:500 15px/1 Geist,sans-serif }
.topo > .valor  { font-family:'Geist Mono',monospace; font-size:11.5px }   /* "R$ 150 — R$ 1.200" */
.trilho-wrap { position:relative; height:28px; cursor:pointer; touch-action:none }   /* role=group; pointerdown inicia arrasto */
.trilho { position:absolute; left:0; right:0; top:50%; height:8px; margin-top:-4px; border-radius:999px; background:var(--sf2); box-shadow:var(--deb) }
.preenchido { position:absolute; top:50%; height:8px; margin-top:-4px; left:{{ rng.la }}; width:{{ rng.w }}; border-radius:999px; background:var(--tx); transition:left .25s cubic-bezier(.22,1,.36,1),width .25s cubic-bezier(.22,1,.36,1) }
.pino { position:absolute; top:50%; width:20px; height:20px; margin:-10px 0 0 -10px; border-radius:999px; background:var(--sf3) var(--grain); box-shadow:0 0 0 .5px var(--bd2),var(--e2); pointer-events:none; transition:left .25s cubic-bezier(.22,1,.36,1); left:{{ rng.la }} /* ou rng.lb */ }
.escala { display:flex; justify-content:space-between; font-family:'Geist Mono',monospace; font-size:10.5px; color:var(--tx3) }
```

### Estados (resolvidos)

- Máximo `M = 2000`; `la = a/M*100%`, `lb = b/M*100%`, `w = (b−a)/M*100%`. Inicial `a=150`, `b=1200`.
- Passo 10; distância mínima entre pinos 50; o pino mais próximo do clique é o arrastado.

### Movimento

- `left`/`width` `.25s` Respiro.

---

## 13. Avaliação (estrelas)

```css
.avaliacao { background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:44px; corner-shape:squircle; padding:26px 28px; display:flex; flex-direction:column; gap:16px }
.estrelas { display:flex; gap:4px }   /* mouseleave zera hover */
button.estrela { width:40px; height:40px; border:0; border-radius:999px; background:transparent; display:flex; align-items:center; justify-content:center; cursor:pointer; transform:{{ x.tf }}; transition:transform .5s cubic-bezier(.34,1.28,.64,1) {{ x.d }} }
button.estrela > svg { width:26px; height:26px; viewBox:0 0 24 24; fill:{{ x.fill }}; stroke:{{ x.stroke }}; stroke-width:1.5; stroke-linejoin:round; transition:fill .4s cubic-bezier(.22,1,.36,1) {{ x.d }},stroke .4s cubic-bezier(.22,1,.36,1) {{ x.d }} }
/* path: m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z */
.estrelas-label { font-size:12px; color:var(--tx2) }   /* '', Ruim, Fraco, Ok, Bom, Excelente */
```

Estados: acesa (`n <= starH || star`): `fill=var(--v4)`, `stroke=var(--v4)`, `tf=scale(1)`; apagada: `fill=transparent`, `stroke=var(--tx4)`, `tf=scale(.88)`. Delay escalonado `x.d = (n−1)*45ms`. Padrão `star=4`.

---

## 14. Odômetro (ticker "Visitas hoje") + ponto ao vivo

```css
.visitas { background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:44px; corner-shape:squircle; padding:26px 28px; display:flex; flex-direction:column; gap:12px }
.visitas > .topo { display:flex; justify-content:space-between; align-items:center }
/* liveDot (React, resolvido) */
.live { position:relative; width:8px; height:8px; display:inline-flex }
.live > .onda  { position:absolute; inset:0; border-radius:99px; background:var(--ok); animation:pfPing 1.6s ease-out infinite }   /* só quando live */
.live > .ponto { position:relative; width:8px; height:8px; border-radius:99px; background:var(--ok) /* var(--tx4) pausado */ }

.odometro { display:inline-flex; align-items:flex-start; white-space:nowrap; font:300 44px/1 Geist,sans-serif; letter-spacing:-0.045em; font-variant-numeric:tabular-nums; height:1em;
  -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 16%,#000 84%,transparent 100%); mask-image:linear-gradient(180deg,transparent 0,#000 16%,#000 84%,transparent 100%); padding:.06em 0; box-sizing:content-box }
.digito { display:inline-block; height:1em; overflow:hidden }
.digito > .fita { display:flex; flex-direction:column; transform:{{ g.ty }}; transition:transform .9s cubic-bezier(.22,1,.36,1) {{ g.d }} }
.fita > span { height:1em }      /* 0…9 */
.separador { display:inline-block; height:1em; white-space:pre }

.visitas .acoes { display:flex; gap:6px; align-items:center }
button.simular-chegada { height:34px; padding:0 14px; border:1px solid var(--bd); border-radius:999px; background:var(--sf3); box-shadow:var(--sh1); color:var(--tx); font:500 12px/1 Geist,sans-serif; cursor:pointer }   /* data-press="sheet" */
button.simular-saida   { height:34px; padding:0 12px; border:0; border-radius:999px; background:transparent; color:var(--tx2); font:500 12px/1 Geist,sans-serif; cursor:pointer }                 /* data-press="ghost" */
.visitas > .nota { font-size:11px; color:var(--tx3) }
```

Resolvido (`odo`): `g.ty = translateY(−dígito*10%)`; `g.d = (dígito mudou ? posiçãoDesdeOFim*55 : 0) ms` — stagger de **55 ms** da unidade para a esquerda. Valor inicial 48.210; bump/drop ±(40…940).

---

## 15. Kanban

### Anatomia

```
div.quadro (flex, overflow-x)
└─ div[data-kcol].coluna × 4
   ├─ div.cab > span.titulo + span.contador
   ├─ div.realce (absoluto, bg da coluna de destino)   ← ver nota
   ├─ [k.isPh]   div.fantasma-destino (espaço tracejado)
   ├─ [k.isCard] div[data-kcard].cartao (pointerdown inicia arrasto)
   │   ├─ div.linha1 > span.nome + span.grip(14)
   │   └─ div.linha2 > span.chip-origem + span.orcamento(mono) + span.roas(mono, cor por faixa)
   └─ button[data-press=ghost].adicionar
div[data-kghost] (fixed, body; só enquanto kb.dragging)     ← em 37-adocao.html
```

### Estilos

```css
.quadro { display:flex; gap:12px; overflow-x:auto; padding:4px 2px 12px; user-select:none }
.coluna { flex:1 0 240px; min-width:240px; display:flex; flex-direction:column; gap:8px; padding:12px; border-radius:36px; corner-shape:squircle; background:var(--sf2); box-shadow:var(--deb); transition:background .45s cubic-bezier(.22,1,.36,1) }
.coluna > .cab { display:flex; align-items:center; gap:8px; padding:6px 8px 4px }
.cab > .titulo { font-size:13px; font-weight:500; flex:1 }
.cab > .contador { height:20px; min-width:20px; padding:0 6px; border-radius:999px; background:var(--sf3); box-shadow:var(--sh1); font-family:'Geist Mono',monospace; font-size:10.5px; display:flex; align-items:center; justify-content:center }
.coluna > .realce { position:absolute; inset:0; border-radius:36px; background:{{ c.bg }}; pointer-events:none; transition:background .45s }
/* NOTA: a coluna NÃO tem position:relative no DOM; este .realce absoluto se posiciona pelo ancestral posicionado mais próximo. c.bg = var(--acs) quando a coluna é o destino do arrasto, transparent caso contrário. */

/* espaço tracejado de destino (kasure) */
.fantasma-destino { height:{{ k.h }}; border-radius:24px; corner-shape:squircle; border:1.5px dashed var(--bd2); background:var(--acs); animation:pfGrow .45s cubic-bezier(.22,1,.36,1) }
/* k.h = altura medida do cartão arrastado (px) */

/* cartão */
.cartao { position:relative; padding:14px 14px 12px; display:flex; flex-direction:column; gap:10px; background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:24px; corner-shape:squircle; cursor:grab; touch-action:none; opacity:{{ k.op }}; animation:{{ k.anim }}; transition:box-shadow .45s cubic-bezier(.22,1,.36,1),transform .45s cubic-bezier(.22,1,.36,1) }
.cartao:hover { box-shadow:var(--e2); transform:translateY(-1px) }
.cartao > .linha1 { display:flex; justify-content:space-between; align-items:flex-start; gap:8px }
.linha1 > .nome { font-size:13px; font-weight:500; line-height:1.35 }
.linha1 > .grip { flex:none; display:flex; width:14px; height:14px; color:var(--tx4) }
.cartao > .linha2 { display:flex; align-items:center; gap:6px; flex-wrap:wrap }
.linha2 > .chip-origem { height:20px; padding:0 8px; border-radius:999px; background:var(--sf2); font-size:10.5px; color:var(--tx2); display:inline-flex; align-items:center }
.linha2 > .orcamento { font-family:'Geist Mono',monospace; font-size:10.5px; color:var(--tx3) }
.linha2 > .roas { margin-left:auto; font-family:'Geist Mono',monospace; font-size:11px; color:{{ k.rc }} }

button.adicionar { height:36px; border:0; border-radius:999px; background:transparent; color:var(--tx3); font:500 12px/1 Geist,sans-serif; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px }
button.adicionar:hover { background-color:var(--acs); color:var(--tx) }
button.adicionar > span:first-child { display:flex; width:14px; height:14px }   /* ic.plus */

/* fantasma arrastado (segue o ponteiro) */
[data-kghost] { position:fixed; left:0; top:0; will-change:transform; width:{{ kb.ghost.w }}; z-index:120; pointer-events:none; padding:14px 14px 12px; display:flex; flex-direction:column; gap:10px; background:var(--sf3) var(--grain); border:1px solid var(--bd); box-shadow:var(--e3); border-radius:24px; corner-shape:squircle; color:var(--tx); transform:{{ kb.ghost.tf }}; cursor:grabbing }   /* data-instant: sem transições */
/* conteúdo interno idêntico ao .cartao (linha1/linha2); .roas no fantasma usa color:var(--tx2) fixo */
```

### Estados (resolvidos)

- `k.rc` (cor do ROAS): `null → var(--tx3)`; `>=4 → var(--ok)`; `>=3 → var(--wa)`; senão `var(--er)`. Texto: `"5,22x"` ou `"—"`.
- `k.op`: `0` enquanto `settled === id` (o cartão real fica invisível no instante do pouso; o WAAPI assume), senão `1`.
- `k.anim`: `pfToastIn .6s cubic-bezier(.22,1,.36,1)` quando `settled === id` (cartão recém-criado por "Adicionar"; `settled` limpa após 700 ms), senão `none`.
- Colunas: Prospecção, Em campanha, Escalando, Pausado. `c.count` = nº de cartões (excluindo o arrastado).
- `kb.ghost`: `w = largura medida do cartão`; `tf = translate3d(x−ox, y−oy, 0) rotate(1.6deg) scale(1.035)` (ox/oy = offset do ponteiro dentro do cartão no pointerdown).

### Movimento (sequência completa de arrastar)

1. **Pegar** (`kbDown`): só botão 0; `preventDefault`. O arrasto começa após **4 px** de deslocamento (`Math.hypot < 4` ignora — o texto do manual diz "3px"; o código usa 4). Nesse momento o cartão original some da coluna (filtrado) e nasce o `[data-kghost]`, já com `rotate(1.6deg) scale(1.035)` e sombra `--e3` (sem transição: `data-instant`).
2. **Mover**: `pointermove` passivo → rAF → `transform` do fantasma atualizado; `elementsFromPoint` encontra `[data-kcol]`; índice de inserção = primeiro cartão cujo centro vertical está abaixo do ponteiro. Estado `over={col,idx}` insere o `.fantasma-destino` (`pfGrow .45s` de `height:0;opacity:0`) e pinta a coluna com `var(--acs)` (`transition:background .45s`).
3. **Soltar com destino**: o cartão é reinserido na coluna/índice; `settled=id` (opacidade 0 do cartão real); `kbLand` roda no rAF seguinte via WAAPI no `[data-kcard]` real, partindo da posição do fantasma:
   ```
   keyframes (todas com opacity:1):
     0%   transform: translate(dx,dy) rotate(1.6deg) scale(1.035)      box-shadow: --e3
     30%  transform: translate(dx*.35, dy*.35−6px) rotate(1deg) scale(1.025)   box-shadow: --e3
     60%  transform: translate(0,−3px) rotate(.35deg) scale(1.01)     box-shadow: --e2
     82%  transform: translate(0,1px) rotate(−.12deg) scale(.997)     box-shadow: --sh1
     100% transform: none                                             box-shadow: --sh1
   duration 1050 ms · easing cubic-bezier(.25,.8,.3,1) · fill forwards · z-index 6 durante
   ```
   Ao terminar: z-index limpo, `settled=null`, animação cancelada após 50 ms. (O texto do manual cita "700ms na curva Respiro"; o código usa 1050 ms e `cubic-bezier(.25,.8,.3,1)`. `pfSettle`/`pfLiftUp` existem no CSS mas não são referenciados.)
4. **Soltar sem mover** (clique): abre o painel expandido (`openKb`) a partir do retângulo do cartão.
5. Hover do cartão em repouso: `box-shadow → --e2`, `translateY(−1px)`, ambos `.45s` Respiro.

### Medidas

Coluna min 240 (flex-basis 240), padding 12, gap 8, raio 36; cartão padding `14 14 12`, gap 10, raio 24; chip 20px; grip 14; contador 20px; fantasma de destino borda 1.5px tracejada `--bd2`.

Acessibilidade declarada no manual: toda ação de arrastar tem alternativa por menu ("Mover para…") e teclado — implementada no painel (segmentado "Mover para").

---

## 16. Painel expandido a partir do cartão (kbd)

### Anatomia (37-adocao.html; `kbd.open`)

```
div.overlay (fixed, inset 0, z 104, flex center, padding 24, onClick fecha)
├─ div.veu (var(--veil), pfFade .5s)
├─ div.blur × 4 (blurLayers radiais)
└─ div[data-kpanel][data-instant] (stopPropagation)
   └─ div[data-kpanel-body]
      ├─ div.cab > div(chips origem + coluna; título 24px) + button.fechar(36, bg --sf2)
      ├─ div.kpis (grid 3, bordas 1px via gap+bg) > div.kpi × 3 (ROAS, Orçamento, Investido no mês)
      ├─ svg.sparkline (280×56, height 64)
      ├─ div.mover > span.rotulo + div[data-slide].segmentado > span[data-ind] + button × 4
      ├─ div.atividade > span.rotulo + div.linha-ativ × 4
      └─ div.acoes > button[ghost] Duplicar + button[sheet] Pausar + button[ink] Abrir campanha
```

### Estilos

```css
.overlay { position:fixed; inset:0; z-index:104; display:flex; align-items:center; justify-content:center; padding:24px }
.veu { position:absolute; inset:0; background:var(--veil); animation:pfFade .5s cubic-bezier(.22,1,.36,1) }
.blur { position:absolute; inset:0; backdrop-filter:{{ l.f }}; -webkit-backdrop-filter:{{ l.f }}; mask-image:{{ l.m }}; -webkit-mask-image:{{ l.m }}; pointer-events:none; animation:{{ l.a }} }
/* blurLayers resolvido (desfoque cresce do centro para fora):
   blur(2px)  saturate(.85)  radial-gradient(ellipse 70% 65% at 50% 50%, transparent 0%,  #000 35%)
   blur(6px)  saturate(.85)  radial-gradient(ellipse 70% 65% at 50% 50%, transparent 10%, #000 55%)
   blur(14px) saturate(.85)  radial-gradient(ellipse 70% 65% at 50% 50%, transparent 25%, #000 75%)
   blur(28px) saturate(.85)  radial-gradient(ellipse 70% 65% at 50% 50%, transparent 40%, #000 100%)
   a: pfBlurIn .7s cubic-bezier(.22,1,.36,1) both | fechando (closing): pfBlurOut .28s cubic-bezier(.4,0,.6,1) forwards */

[data-kpanel] { position:relative; width:min(640px,100%); max-height:calc(100vh - 48px); overflow:auto; transform-origin:top left; background:var(--sf3) var(--grain); border:1px solid var(--bd); box-shadow:var(--e3); border-radius:44px; corner-shape:squircle; color:var(--tx) }
[data-kpanel-body] { padding:26px 28px 24px; display:flex; flex-direction:column; gap:22px }

.cab { display:flex; align-items:flex-start; gap:14px }
.cab > div { flex:1; min-width:0; display:flex; flex-direction:column; gap:8px }
.cab .chips { display:flex; gap:6px; align-items:center; flex-wrap:wrap }
.cab .chip-origem { height:22px; padding:0 9px; border-radius:999px; background:var(--sf2); font-size:11px; color:var(--tx2); display:inline-flex; align-items:center }
.cab .coluna-nome { font-size:11px; color:var(--tx3) }     /* "· Em campanha" */
.cab .titulo { font:500 24px/1.2 Geist,sans-serif; letter-spacing:-0.025em }
.cab > button.fechar { flex:none; width:36px; height:36px; border:0; border-radius:999px; background:var(--sf2); color:var(--tx2); display:flex; align-items:center; justify-content:center; cursor:pointer }   /* ic.x 16 */

.kpis { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1px; background:var(--bd); border-radius:28px; corner-shape:squircle; overflow:hidden; border:1px solid var(--bd) }
.kpi { background:var(--sf); padding:16px 18px; display:flex; flex-direction:column; gap:6px }
.kpi > .rotulo { font-size:11px; color:var(--tx3) }
.kpi > .valor  { font:300 26px/1 Geist,sans-serif; letter-spacing:-0.03em }
.kpi.roas > .valor { color:{{ kbd.rc }} }   /* mesma faixa de cor do cartão */

svg.sparkline { viewBox:0 0 280 56; preserveAspectRatio:none; width:100%; height:64px; display:block }
svg.sparkline > path.area { fill:var(--tx); opacity:.06 }
svg.sparkline > path.line { fill:none; stroke:var(--tx); stroke-width:1.75; vector-effect:non-scaling-stroke }
/* paths: spark(walk(16,50,10,seed),280,56) → curva Catmull-Rom suavizada; area = line + L280,56 L0,56 Z */

.mover { display:flex; flex-direction:column; gap:8px }
.mover > .rotulo { font-size:12px; font-weight:500 }
[data-slide].segmentado { position:relative; display:flex; align-self:flex-start; flex-wrap:wrap; padding:4px; gap:2px; border-radius:999px; background:var(--sf2); box-shadow:var(--deb) }
.segmentado > [data-ind] { background:var(--sf3); box-shadow:var(--sh1); border-radius:999px }
.segmentado > button { position:relative; z-index:1; height:32px; padding:0 14px; border:0; border-radius:999px; background:transparent; color:{{ o.fg }}; font:500 12px/1 Geist,sans-serif; cursor:pointer }
/* o.fg = var(--tx) na coluna atual, var(--tx3) nas demais; clicar move o cartão para a coluna */

.atividade { display:flex; flex-direction:column }
.atividade > .rotulo { font-size:12px; font-weight:500; margin-bottom:6px }
.linha-ativ { display:flex; align-items:center; gap:12px; padding:10px 0; border-top:1px solid var(--bd) }
.linha-ativ > .tile { flex:none; width:28px; height:28px; border-radius:14px; corner-shape:squircle; background:var(--sf2); color:var(--tx2); display:flex; align-items:center; justify-content:center }
.linha-ativ > .tile > span { display:flex; width:14px; height:14px }
.linha-ativ > .texto { flex:1; font-size:13px }
.linha-ativ > .quando { font-size:11px; color:var(--tx3) }

.acoes { display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap; padding-top:4px }
button.duplicar { height:38px; padding:0 14px; border:0; border-radius:999px; background:transparent; color:var(--tx2); font:500 13px/1 Geist,sans-serif; cursor:pointer; display:inline-flex; align-items:center; gap:6px }   /* ghost; ic.copy 14 */
button.pausar   { height:38px; padding:0 16px; border:1px solid var(--bd); border-radius:999px; background:var(--sf3); box-shadow:var(--sh1); color:var(--tx); font:500 13px/1 Geist,sans-serif; cursor:pointer }   /* sheet */
button.abrir    { height:38px; padding:0 18px; border:0; border-radius:999px; background:var(--ac); color:var(--acf); box-shadow:var(--ink); font:500 13px/1 Geist,sans-serif; cursor:pointer; display:inline-flex; align-items:center; gap:6px }   /* ink; ic.arrowUpRight 14 */
```

### Estados

- Atividade (fixa): "Orçamento ajustado para {b}" (pencil, há 2 h), "ROAS passou de 4x" (activity, ontem), "Criativo novo publicado" (sparkle, 2 dias), "Campanha criada por Ana" (user, 5 dias).
- Investido no mês = `roas*1000*3.1` formatado em R$ (ou "—").

### Movimento (WAAPI, resolvido de `openKb` / `closeKb`)

- **Abrir** (do retângulo do cartão `o` para o painel `r`):
  - painel: `[{transform: translate(o.x−r.left, o.y−r.top) scale(o.w/r.width, o.h/r.height), borderRadius:'24px', opacity:.6}, {transform:'none', borderRadius:'44px', opacity:1}]` — **620 ms**, `cubic-bezier(.22,1,.36,1)`, `fill:both`, `transform-origin:top left`.
  - corpo: `[{opacity:0, transform:translateY(8px)}, {opacity:1, transform:none}]` — **520 ms**, delay **200 ms**, Respiro, `fill:both`.
  - véu `pfFade .5s`; blur `pfBlurIn .7s both`.
- **Fechar** (de volta ao cartão; se o cartão não existir, alvo = 30%/30% com 40% do tamanho):
  - corpo: opacity 1→0 em **200 ms** `forwards`.
  - painel: `[{transform:'none', borderRadius:'44px', opacity:1}, {transform: translate(...) scale(...), borderRadius:'24px', opacity:.4}]` — **460 ms**, `cubic-bezier(.4,0,.2,1)`, `forwards`.
  - blur `pfBlurOut .28s cubic-bezier(.4,0,.6,1) forwards`; estado `kbClosing=true`; DOM removido após **440 ms**.

### Medidas

Painel 640px máx, raio 44 → 24 no estado "cartão"; corpo padding `26 28 24`, gap 22; KPIs raio 28 com divisórias de 1px (gap + background `--bd`); sparkline 64px; segmentado 32px em trilho de padding 4; tiles 28 (raio 14).

---

## 17. Chat — atendimento (suporte)

### Anatomia

```
div.janela (folha, 560px, overflow hidden)
├─ div.cab > span.avatar--40(+status) + div.identidade(nome 14/600, meta 11.5) + span.ticket(mono)
├─ div[data-chat=sup].conversa (scroll)
│  ├─ span.separador-data "Hoje"
│  ├─ [m.them] div.msg-outro > div.balao + span.hora
│  ├─ [m.me]   div.msg-eu > div.balao + span.hora(+ svg.recibo)
│  └─ div[data-collapse].digitando (--g:10px) > div > div.balao-dots > span × 3
└─ div.rodape
   ├─ div.rapidas (scroll-x) > button[sheet] × 3
   └─ div.composer > button[data-ai=clip] + input + button[data-press=ink][data-send=sup]
```

### Estilos

```css
.janela { background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:44px; corner-shape:squircle; display:flex; flex-direction:column; height:560px; overflow:hidden }
.janela > .cab { flex:none; display:flex; align-items:center; gap:12px; padding:18px 22px; border-bottom:1px solid var(--bd) }
.cab > .avatar--40 { position:relative; width:40px; height:40px; border-radius:999px; background:var(--v1); color:#fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:500 }
.cab .status { position:absolute; right:0; bottom:0; width:11px; height:11px; border-radius:9px; background:var(--ok); box-shadow:0 0 0 2.5px var(--sf) }
.cab > .identidade { flex:1; display:flex; flex-direction:column; gap:3px }
.identidade > .nome { font-size:14px; font-weight:600 }
.identidade > .meta { font-size:11.5px; color:var(--tx3) }
.cab > .ticket { font-family:'Geist Mono',monospace; font-size:10.5px; color:var(--tx3) }

.conversa { flex:1; overflow:auto; padding:18px 18px 8px; display:flex; flex-direction:column; gap:10px }
.separador-data { align-self:center; font-size:10.5px; color:var(--tx3); padding:2px 10px; border-radius:999px; background:var(--sf2) }

/* bolha do outro (folha pousada) */
.msg-outro { align-self:flex-start; max-width:78%; display:flex; flex-direction:column; gap:4px; animation:{{ m.anim }} }
.msg-outro > .balao { padding:11px 14px; border-radius:22px 22px 22px 8px; background:var(--sf3) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); font-size:13px; line-height:1.5 }
.msg-outro > .hora { font-size:10px; color:var(--tx3); padding-left:6px }

/* bolha minha (carvão) */
.msg-eu { align-self:flex-end; max-width:78%; display:flex; flex-direction:column; align-items:flex-end; gap:4px; transform-origin:bottom right; animation:{{ m.anim2 }} }
.msg-eu > .balao { padding:11px 14px; border-radius:22px 22px 8px 22px; background:var(--ac); color:var(--acf); box-shadow:var(--ink); font-size:13px; line-height:1.5 }
.msg-eu > .hora { display:flex; align-items:center; gap:4px; font-size:10px; color:var(--tx3); padding-right:6px }
.recibo { display:inline-flex; color:{{ m.rc }}; transition:color .6s cubic-bezier(.22,1,.36,1) }   /* role=img, aria-label/title = m.rl */
.recibo > svg { width:18px; height:12px; viewBox:0 0 22 14; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round }
.recibo path:nth-child(1) { d:"M1.5 7.5l3.6 3.6L12.5 3.2"; stroke-dasharray:24; stroke-dashoffset:0 }
.recibo path:nth-child(2) { d:"M9.2 10.6l.5.5L20.5 3.2"; stroke-dasharray:24; stroke-dashoffset:{{ m.rd }}; transition:stroke-dashoffset .7s cubic-bezier(.22,1,.36,1) .1s }

/* digitando */
[data-collapse].digitando { --g:10px }
.balao-dots { display:inline-flex; gap:4px; padding:13px 16px; border-radius:22px 22px 22px 8px; background:var(--sf3); border:1px solid var(--bd) }
.balao-dots > span { width:6px; height:6px; border-radius:9px; background:var(--tx2); animation:pfDot 1.2s ease-in-out infinite }
.balao-dots > span:nth-child(2) { animation-delay:.15s }
.balao-dots > span:nth-child(3) { animation-delay:.3s }

/* rodapé */
.rodape { flex:none; padding:10px 14px 14px; display:flex; flex-direction:column; gap:10px; border-top:1px solid var(--bd) }
.rapidas { display:flex; gap:6px; overflow-x:auto }
.rapidas > button { flex:none; height:28px; padding:0 12px; border:1px solid var(--bd); border-radius:999px; background:var(--sf3); box-shadow:var(--sh1); color:var(--tx2); font:500 11.5px/1 Geist,sans-serif; cursor:pointer }   /* data-press="sheet" */
.composer { display:flex; align-items:center; gap:8px; height:48px; padding:0 6px 0 8px; border-radius:999px; background:var(--sf2); box-shadow:var(--deb) }
.composer > button.anexar { flex:none; width:34px; height:34px; border:0; border-radius:999px; background:transparent; color:var(--tx2); display:flex; align-items:center; justify-content:center; cursor:pointer }   /* data-ai="clip"; ícone 16; sem hover declarado */
.composer > input { flex:1; min-width:0; border:0; background:transparent; outline:none; color:var(--tx); font:400 13px/1 Geist,sans-serif }
.composer > button.enviar { flex:none; width:36px; height:36px; border:0; border-radius:999px; background:var(--ac); color:var(--acf); box-shadow:var(--ink); display:flex; align-items:center; justify-content:center; cursor:pointer; overflow:hidden }   /* data-press="ink", data-send="sup"; ic.arrowUp 16 */
```

### Estados (resolvidos)

- `m.rc`: `var(--in)` se `st==='lido'`, senão `var(--tx3)`. `m.rd`: `0` (lido, segundo traço desenhado) ou `24` (enviado, segundo traço oculto). `m.rl`: "Lido" / "Enviado".
- Fluxo ao enviar: mensagem entra como `enviado` → **500 ms** depois `typing=true` → **2100 ms** depois `typing=false`, mensagem vira `lido` e chega a resposta.
- Enter envia (preventDefault). Respostas rápidas: "Meu token expirou", "Pedidos não aparecem", "Falar com financeiro".
- Rolagem: `scrollTo({top, behavior:'smooth'})` 40 ms após cada mudança.

### Movimento

- `m.anim` (outro): `pfBubble .55s cubic-bezier(.22,1,.36,1) both` (sobe 10px, scale .97→1, blur 2px→0).
- `m.anim2` (eu): `pfLaunch .7s cubic-bezier(.34,1.22,.64,1) both` (sobe 46px, scale .86→1, blur 3px→0; opacidade 1 aos 55%), origem `bottom right`.
- Recibo: cor `.6s` Respiro; segundo check `stroke-dashoffset .7s` Respiro com delay `.1s`.
- Digitando: colapso global (`--g:10px`) + `pfDot 1.2s ease-in-out infinite`, cascata 0 / .15s / .3s.
- Botão enviar (`fly`, WAAPI):
  - ícone: `[{translateY(0), opacity 1}, {translateY(−18px) scale(.8), opacity 0 @45%}, {translateY(16px), opacity 0 @46%}, {translateY(0), opacity 1}]` — **620 ms**, Respiro.
  - botão: `[{scale(1)}, {scale(.9) @25%}, {scale(1)}]` — **500 ms**, `cubic-bezier(.34,1.28,.64,1)`.

### Medidas

Balão: raio 22 com canto de origem 8; padding `11 14`; largura máx 78%; gap entre mensagens 10; hora 10px; recibo 18×12; composer 48px (botão 36, anexar 34), chips rápidos 28px.

---

## 18. Chat — IA (Identidade IA)

### Anatomia

```
div.janela (folha, 560px)
├─ div.cab > span.avatar-marca--40(sparkle 18) + div.identidade + div.rel > button[data-pop-trigger][data-tipwrap](moreH 18, tooltip) + [menuOpen] div[data-pop].menu
├─ div[data-chat=ai].conversa (gap 18, padding 20/22/8)
│  ├─ div[data-collapse].vazio (aiEmpty) > div > div.boas-vindas > span.pergunta + div.sugestoes > button[sheet] × 3
│  ├─ [m.me]  div.msg-eu-ia (balão discreto)
│  ├─ [m.bot] div.resposta > span.avatar-marca--28 + div.corpo (texto, [m.src] chips de fonte, ações copiar/refazer)
│  ├─ [thinking]  div.pensando > avatar(sparkle girando) + span.shimmer
│  └─ [streaming] div.fluxo > avatar + span.texto + span.caret
└─ div.rodape-ia > div.composer-ia > textarea + ([idle] button.enviar | [busy] button.parar) ; span.dica
```

### Estilos

```css
.cab .avatar-marca--40 { width:40px; height:40px; border-radius:20px; corner-shape:squircle; background:var(--ac); color:var(--acf); box-shadow:var(--ink); display:flex; align-items:center; justify-content:center }
.cab .avatar-marca--40 > span { display:flex; width:18px; height:18px }   /* ic.sparkle */
.cab > .rel { position:relative }
button.opcoes { position:relative; width:36px; height:36px; border:0; border-radius:999px; background:transparent; color:var(--tx2); display:flex; align-items:center; justify-content:center; cursor:pointer }
button.opcoes:hover { background-color:var(--acs); color:var(--tx) }
button.opcoes > span:first-child { display:flex; width:18px; height:18px }   /* ic.moreH */
button.opcoes > [data-tip] { position:absolute; right:44px; left:auto; top:50%; white-space:nowrap; padding:6px 10px; border-radius:999px; background:var(--ac); color:var(--acf); font-size:11.5px; box-shadow:var(--e2) }   /* "Opções"; visível via [data-tipwrap]:hover */
[data-pop].menu-ia { position:absolute; right:0; top:calc(100% + 6px); z-index:9; min-width:210px; padding:6px; display:flex; flex-direction:column; gap:2px; background:var(--glass); backdrop-filter:blur(24px) saturate(1.3); -webkit-backdrop-filter:blur(24px) saturate(1.3); border:1px solid var(--gbd); box-shadow:var(--e2); border-radius:24px; corner-shape:squircle; transform-origin:top right; animation:{{ popIn }} }
/* itens = mesmo botão do menu da seção 2 (min-height 36, padding 0 12, gap 10, ícone 16 em --tx2). Itens: Nova conversa (plus), Copiar conversa (copy), Exportar PDF (download) */

.conversa-ia { flex:1; overflow:auto; padding:20px 22px 8px; display:flex; flex-direction:column; gap:18px }

/* estado vazio */
.boas-vindas { display:flex; flex-direction:column; align-items:center; gap:14px; padding:30px 0 10px; text-align:center }
.boas-vindas > .pergunta { font:300 26px/1.2 Geist,sans-serif; letter-spacing:-0.025em }
.sugestoes { display:flex; flex-direction:column; gap:6px; width:100%; max-width:340px }
.sugestoes > button { height:40px; padding:0 16px; display:flex; align-items:center; gap:10px; border:1px solid var(--bd); border-radius:999px; background:var(--sf3) var(--grain); box-shadow:var(--sh1); color:var(--tx); font:400 13px/1 Geist,sans-serif; cursor:pointer; text-align:left }   /* data-press="sheet" */
.sugestoes > button > span:first-child { display:flex; width:14px; height:14px; color:var(--tx3) }   /* ic.sparkle */

/* minha mensagem (IA): balão discreto, sem carvão */
.msg-eu-ia { align-self:flex-end; max-width:80%; padding:11px 15px; border-radius:22px 22px 8px 22px; background:var(--sf2); box-shadow:var(--deb); font-size:13px; line-height:1.5; transform-origin:bottom right; animation:{{ m.anim2 }} }

/* resposta da IA: sem balão, tinta no papel */
.resposta { display:flex; gap:12px; align-items:flex-start; animation:{{ m.anim }} }
.avatar-marca--28 { flex:none; width:28px; height:28px; border-radius:14px; corner-shape:squircle; background:var(--ac); color:var(--acf); display:flex; align-items:center; justify-content:center }
.avatar-marca--28 > span { display:flex; width:13px; height:13px }   /* ic.sparkle */
.resposta > .corpo { flex:1; min-width:0; display:flex; flex-direction:column; gap:10px }
.corpo > .texto { font-size:13.5px; line-height:1.65 }
.fontes { display:flex; gap:6px; flex-wrap:wrap }
.fontes > span { height:24px; padding:0 10px; border-radius:999px; background:var(--sf2); font-size:11px; color:var(--tx2); display:inline-flex; align-items:center; gap:5px }
.fontes > span > span { display:flex; width:12px; height:12px }   /* ic.bars / ic.receipt */
.acoes-resp { display:flex; gap:2px }
.acoes-resp > button { width:30px; height:30px; border:0; border-radius:999px; background:transparent; color:var(--tx3); display:flex; align-items:center; justify-content:center; cursor:pointer }   /* data-ai="copy" | "refresh" */
.acoes-resp > button:hover { background-color:var(--acs); color:var(--tx) }
.acoes-resp > button > span { display:flex; width:14px; height:14px }

/* pensando */
.pensando { display:flex; gap:12px; align-items:center; animation:pfBubble .5s cubic-bezier(.22,1,.36,1) }
.pensando .avatar-marca--28 > span { animation:pfSpin 2.4s linear infinite }
.pensando > .shimmer { font-size:13px; background:linear-gradient(90deg,var(--tx3) 0,var(--tx) 50%,var(--tx3) 100%); background-size:200px 100%; -webkit-background-clip:text; background-clip:text; color:transparent; animation:pfShimmer 1.4s linear infinite }   /* "Pensando nos seus dados…" */

/* escrevendo (streaming) */
.fluxo { display:flex; gap:12px; align-items:flex-start }
.fluxo > .texto { flex:1; font-size:13.5px; line-height:1.65 }
.caret { display:inline-block; width:7px; height:14px; margin-left:2px; vertical-align:-2px; border-radius:2px; background:var(--tx); animation:pfCaret 1s steps(1) infinite }

/* composer IA */
.rodape-ia { flex:none; padding:12px 14px 14px; border-top:1px solid var(--bd) }
.composer-ia { display:flex; align-items:flex-end; gap:8px; min-height:48px; padding:6px 6px 6px 18px; border-radius:26px; corner-shape:squircle; background:var(--sf2); box-shadow:var(--deb) }
.composer-ia > textarea { flex:1; min-width:0; resize:none; border:0; background:transparent; outline:none; color:var(--tx); font:400 13px/1.5 Geist,sans-serif; padding:8px 0; max-height:120px }   /* rows=1 */
.composer-ia > button.enviar { flex:none; width:36px; height:36px; border:0; border-radius:999px; background:var(--ac); color:var(--acf); box-shadow:var(--ink); display:flex; align-items:center; justify-content:center; cursor:pointer; overflow:hidden }   /* ink; data-send="ai"; ic.arrowUp 16 */
.composer-ia > button.parar  { flex:none; width:36px; height:36px; border:1px solid var(--bd); border-radius:999px; background:var(--sf3); box-shadow:var(--sh1); color:var(--tx); display:flex; align-items:center; justify-content:center; cursor:pointer; animation:pfBadgeIn .4s cubic-bezier(.34,1.28,.64,1) }   /* sheet; ic.stop 14 */
.rodape-ia > .dica { display:block; margin-top:8px; font-size:10.5px; color:var(--tx3); text-align:center }
```

### Estados (resolvidos)

- `aiEmpty`: sem mensagens e não ocupado → boas-vindas (via colapso). Sugestões: "Por que meu ROAS caiu?", "Resuma o lucro de setembro", "Qual o melhor horário de vendas?".
- `thinking` (`aiBusy==='think'`): **1100 ms**; depois `streaming`: palavras chegam a cada **55 ms** (1–2 por tick); ao concluir, a mensagem entra na lista com `src:true` (chips de fonte).
- `idle` ↔ `busy` alterna enviar/parar. Parar: texto parcial vira mensagem terminada em " …".
- Enter envia; Shift+Enter quebra linha.
- Menu: `transform-origin:top right`, `popIn`.

### Movimento

- Minha mensagem: `pfLaunch .7s cubic-bezier(.34,1.22,.64,1) both`. Resposta: `pfBubble .55s` Respiro `both`. Pensando: `pfBubble .5s`; ícone `pfSpin 2.4s linear infinite`; texto `pfShimmer 1.4s linear infinite` (faixa 200px). Caret `pfCaret 1s steps(1) infinite`. Botão parar `pfBadgeIn .4s` Folha. Envio dispara o mesmo `fly` da seção 17.

### Medidas

Composer min 48, raio 26 squircle (não pílula — cresce com o textarea até 120px), padding `6 6 6 18`; avatar IA inline 28 (ícone 13); texto de resposta 13.5/1.65; chips de fonte 24px; ações 30px; sugestões 40px, máx 340 de largura.

---

## 19. Ícones

### Fábrica (resolvido de `mkIcon` em dc.src)

Todo ícone `ic.*` é:

```html
<svg data-icon="1" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block">
  <!-- cada <path|circle|rect> recebe pathLength="100" -->
</svg>
```

- O tamanho é dado pelo contêiner: `span { display:flex; width:Npx; height:Npx }`. Tamanhos usados: 12, 13, 14, 16, 18, 20, 22, 24.
- Cor sempre herdada (`currentColor`); nunca colorido por si.
- `pathLength="100"` em cada primitivo permite o `stroke-dasharray:100` do redesenho.

### Estilos (grade e demos)

```css
.grade-icones { background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:48px; corner-shape:squircle; padding:14px; display:grid; grid-template-columns:repeat(auto-fill,minmax(104px,1fr)) }
.grade-icones > div[data-ai] { cursor:pointer; height:88px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; border-radius:28px; corner-shape:squircle; color:var(--tx) }
.grade-icones > div[data-ai]:hover { background-color:var(--acs) }
.grade-icones > div > span:first-child { display:flex; width:20px; height:20px }
.grade-icones > div > span:last-child  { font-family:'Geist Mono',monospace; font-size:10px; color:var(--tx3) }

.demo-animados { background:var(--sf) var(--grain); border:1px solid var(--bd); box-shadow:var(--sh1); border-radius:44px; corner-shape:squircle; padding:24px 28px; display:flex; flex-direction:column; gap:16px }
.demo-animados > .topo { display:flex; justify-content:space-between; align-items:baseline; gap:12px; flex-wrap:wrap }
.topo > .titulo { font-size:12px; font-weight:500 }
.topo > .nota   { font-family:'Geist Mono',monospace; font-size:10.5px; color:var(--tx3) }   /* "traço 700ms cubic-bezier(.65,0,.35,1) + gesto próprio" */
.demo-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:8px }
.demo-grid > div[data-ai] { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:24px; corner-shape:squircle; background:var(--sf2); box-shadow:var(--deb); cursor:pointer }
.demo-grid > div > span:first-child { display:flex; width:22px; height:22px }
.demo-grid .textos { display:flex; flex-direction:column; gap:2px }
.demo-grid .textos > span:first-child { font-size:12px; font-weight:500 }
.demo-grid .textos > span:last-child  { font-size:10.5px; color:var(--tx3) }
.demo-animados > .regra { font-size:11px; color:var(--tx3); line-height:1.5 }

.tamanhos { display:flex; align-items:flex-end; gap:28px; flex-wrap:wrap }
.tamanhos > div { display:flex; flex-direction:column; align-items:center; gap:8px }
.tamanhos .rotulo { font-family:'Geist Mono',monospace; font-size:10px; color:var(--tx3) }
.tile-44 { width:44px; height:44px; border-radius:22px; corner-shape:squircle; background:var(--sf2); box-shadow:var(--deb); display:flex; align-items:center; justify-content:center }   /* ícone 20 dentro */

/* tabela de medidas de controle */
.tabela-cab { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:8px; font-family:'Geist Mono',monospace; font-size:10.5px; color:var(--tx3); padding-bottom:8px; border-bottom:1px solid var(--bd) }
.tabela-linha { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:8px; font-family:'Geist Mono',monospace; font-size:11.5px; padding:9px 0; border-bottom:1px solid var(--bd) }   /* última sem borda */
```

### Movimento — redesenho do traço e variantes `data-ai`

```css
[data-ai] svg { transform-box:fill-box; transform-origin:center }
[data-ai]:hover svg * { stroke-dasharray:100; animation:pfDraw .7s cubic-bezier(.65,0,.35,1) both }   /* Maré */

/* gesto próprio por nome (soma-se ao pfDraw dos filhos) */
[data-ai="bell"]:hover svg      { animation:pfSwing .9s cubic-bezier(.34,1.22,.64,1); transform-origin:50% 8% }
[data-ai="calendar"]:hover svg  { animation:pfFlip .6s cubic-bezier(.22,1,.36,1) }
[data-ai="settings"]:hover svg,
[data-ai="refresh"]:hover svg   { animation:pfSpin .9s cubic-bezier(.65,0,.35,1) }
[data-ai="download"]:hover svg  { animation:pfDrop .6s cubic-bezier(.34,1.22,.64,1) }
[data-ai="upload"]:hover svg    { animation:pfLift .6s cubic-bezier(.34,1.22,.64,1) }
[data-ai="trash"]:hover svg     { animation:pfShake .5s ease }
[data-ai="star"]:hover svg,
[data-ai="sparkle"]:hover svg,
[data-ai="zap"]:hover svg,
[data-ai="checkCircle"]:hover svg { animation:pfPopI .5s cubic-bezier(.34,1.28,.64,1) }
[data-ai="search"]:hover svg    { animation:pfSeek .8s cubic-bezier(.22,1,.36,1) }
[data-ai="clock"]:hover svg     { animation:pfSpin 1.2s linear }
[data-ai="mail"]:hover svg,
[data-ai="file"]:hover svg,
[data-ai="copy"]:hover svg      { animation:pfLift .5s ease }
[data-ai="alert"]:hover svg,
[data-ai="warn"]:hover svg      { animation:pfShake .45s ease }
[data-ai="logout"]:hover svg,
[data-ai="link"]:hover svg      { animation:pfNudge .6s cubic-bezier(.34,1.22,.64,1) }
[data-ai="eye"]:hover svg       { animation:pfBlink .6s ease }
[data-ai="lock"]:hover svg      { animation:pfDrop .5s ease }

/* variante "desenhar ao montar" (usada em outras seções) */
[data-draw] svg * { stroke-dasharray:100; animation:pfDraw 1.1s cubic-bezier(.22,1,.36,1) .25s both }
```

Nomes `data-ai` usados nestas seções sem gesto próprio (só `pfDraw`): `mic`, `clip`, `moreH`, `chart`, e qualquer nome da grade sem regra acima. Regra do manual: anima só no hover ou em mudança de estado; nunca em loop; desliga com `prefers-reduced-motion`.

### Medidas de controle (ícone ↔ texto), tabela do manual

| tam. | altura | padding | ícone | gap | fonte |
|---|---|---|---|---|---|
| sm | 28 | 12 | 14 | 4 | 12 |
| md | 36 | 16 | 16 | 6 | 13 |
| lg | 44 | 20 | 18 | 8 | 14 |

Com ícone, o lado do ícone perde 2px de padding (ex.: `padding:0 16px 0 14px`).

### Catálogo (paths em viewBox 24, resolvidos de `P` em dc.src)

`ICON_LIST` da grade (40): home, chart, bars, pie, funnel, cart, store, plug, wallet, target, receipt, activity, users, user, bell, calendar, clock, file, tag, zap, settings, search, filter, download, upload, refresh, copy, pencil, trash, link, eye, lock, mail, star, sparkle, info, alert, warn, checkCircle, logout.

Paths completos (todos os nomes de `P`):

```
search:        <circle cx="11" cy="11" r="7"/><path d="m21 21-3.5-3.5"/>
chevronDown:   <path d="m6 9 6 6 6-6"/>
chevronRight:  <path d="m9 18 6-6-6-6"/>
chevronLeft:   <path d="m15 18-6-6 6-6"/>
chevronUpDown: <path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>
arrowUpRight:  <path d="M7 17 17 7M8 7h9v9"/>
arrowRight:    <path d="M5 12h14M13 6l6 6-6 6"/>
arrowUp:       <path d="M12 19V5M5 12l7-7 7 7"/>
arrowDown:     <path d="M12 5v14M19 12l-7 7-7-7"/>
plus:          <path d="M12 5v14M5 12h14"/>
x:             <path d="M18 6 6 18M6 6l12 12"/>
check:         <path d="M20 6 9 17l-5-5"/>
minus:         <path d="M5 12h14"/>
eye:           <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>
eyeOff:        <path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6"/><path d="M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2"/>
lock:          <rect x="4" y="11" width="16" height="10" rx="3"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>
mail:          <rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/>
calendar:      <rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>
upload:        <path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>
bell:          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
home:          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>
chart:         <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
bars:          <path d="M5 20V10M12 20V4M19 20v-7"/>
pie:           <path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M21 12A9 9 0 0 0 12 3"/>
funnel:        <path d="M3 4h18l-7 8v6l-4 2v-8z"/>
cart:          <circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h2.5l2.2 12.3a1 1 0 0 0 1 .8h9.5a1 1 0 0 0 1-.8L20 7H6"/>
plug:          <path d="M9 2v6M15 2v6"/><path d="M7 8h10v3a5 5 0 0 1-10 0z"/><path d="M12 16v6"/>
file:          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>
settings:      <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>
users:         <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
user:          <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>
logout:        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>
more:          <circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>
moreH:         <circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>
info:          <circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>
alert:         <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
warn:          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>
checkCircle:   <circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>
sun:           <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>
moon:          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
sparkle:       <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>
download:      <path d="M12 4v12M6 10l6 6 6-6"/><path d="M4 20h16"/>
filter:        <path d="M4 6h16M7 12h10M10 18h4"/>
copy:          <rect x="8" y="8" width="13" height="13" rx="3"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>
trash:         <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
pencil:        <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>
clock:         <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>
star:          <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>
refresh:       <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>
panel:         <rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 3v18"/>
mic:           <rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
clip:          <path d="m21 11-8.6 8.6a5 5 0 0 1-7-7l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l8-8"/>
link:          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>
wallet:        <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M21 12h-6a2 2 0 0 0 0 4h6v-4z"/>
target:        <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>
tag:           <path d="M3 11V5a2 2 0 0 1 2-2h6l9 9-8 8-9-9z"/><circle cx="7.5" cy="7.5" r="1.2"/>
activity:      <path d="M3 12h4l2.5-7 5 14L17 12h4"/>
grip:          <circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>
shield:        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>
command:       <path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/>
store:         <path d="M3 9 4.5 4.5A2 2 0 0 1 6.4 3h11.2a2 2 0 0 1 1.9 1.5L21 9M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M3 9h18"/>
receipt:       <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>
play:          <path d="M7 5v14l11-7z"/>
pause:         <path d="M8 5v14M16 5v14"/>
stop:          <rect x="7" y="7" width="10" height="10" rx="2"/>
send:          <path d="M5 12h13M13 6l6 6-6 6"/>
zap:           <path d="M13 2 4 14h7l-1 8 9-12h-7z"/>
```

---

## 20. Blocos explicativos de rodapé (Kanban e Chat)

```css
.notas { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:20px 28px }
.notas > div { display:flex; flex-direction:column; gap:6px; padding-top:14px; border-top:1px solid var(--tx) }
.notas .titulo { font-size:12px; font-weight:600 }
.notas .texto  { font-size:12px; color:var(--tx2); line-height:1.55 }
```

---

## Placeholders e divergências

Todos os `{{ }}` destas seções foram resolvidos em `dc.src`. Observações:

- **Kanban, "Pegar"**: o manual diz "após 3px"; o código usa limiar de **4 px** (`Math.hypot(...) < 4`).
- **Kanban, "Soltar"**: o manual diz "700ms na curva Respiro"; o código do pouso usa **1050 ms** com `cubic-bezier(.25,.8,.3,1)` (WAAPI). `pfSettle` e `pfLiftUp` estão definidos no CSS mas não são usados pelo DOM atual.
- **Kanban, realce da coluna**: o `div` absoluto de `background:{{ c.bg }}` está dentro de uma coluna sem `position:relative`; o DOM é literal assim.
- **`data-morph`** (cartão de perfil): a duração/easing do morph de altura entre estados é feita em JS fora dos trechos lidos — não especificado.
- **`kbd.area` / `kbd.line`**: gerados por `spark(walk(16,50,10,seed),280,56)` (curva suavizada); são dados, não estilo.
- Nenhum `style-focus`/`:focus-visible` está declarado nos elementos destas seções (apenas o tooltip usa `:focus-visible`); anel de foco: não especificado.
