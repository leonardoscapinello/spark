# Sumi 墨 — sistema de design · v1.0

> Todo dado é a marca que uma venda deixou.

Sumi é a tinta japonesa feita de fuligem de carvão. O sistema trata cada número como uma marca deixada no papel e existe para que essa marca seja lida sem ruído. **Primeira implementação: Profitify.** Feito para ser levado a qualquer produto (CRM, ERP, apps).

## Pacote

| Arquivo | O que é |
|---|---|
| `sumi.css` | Tokens dos dois temas (Papel e Carvão), escalas, física global e keyframes |
| `sumi.js` | Motor de movimento. É ativado por atributos `data-*` e não depende de framework |
| `AGENTS.md` | Regras para uma IA ou um dev reproduzir o sistema sem desvio |
| `exemplo.html` | Tela mínima usando só o pacote |
| `receitas.md` | Marcação pronta de cada componente |
| `tokens.json` | Tokens em JSON (Figma, Tailwind, Style Dictionary) |
| `SKILL.md` | Skill para agentes de IA |

```html
<html data-sumi-theme="papel">            <!-- ou "carvao" -->
<link rel="stylesheet" href="sumi/sumi.css">
<script src="sumi/sumi.js"></script>
<script>Sumi.init();</script>
```

## Os 8 princípios → regra → token

| Princípio | Regra no sistema | Tokens |
|---|---|---|
| 墨の五彩 **Bokushoku**: cinco tons de uma tinta | Toda hierarquia sai de uma tinta em 5 tons | `--tx --tx2 --tx3 --tx4 --bd` |
| 間 **Ma**: o intervalo | Base 4px. Um foco por tela. Seções separadas por 64px | `--space-*` |
| 和紙 **Washi**: a folha | Superfícies são folhas com granulação, em 3 alturas, com sombra curta de contato | `--grain --sh1 --e2 --e3` |
| 障子 **Shoji**: a luz através do papel | Camadas flutuantes usam blur 24 + saturação | `--glass --gbd` |
| 硯 **Suzuri**: a pedra de tinta | Campos são em baixo-relevo. O carvão afunda 1px ao toque | `--deb --ink --inkp` |
| 朱印 **Shuin**: o selo vermelho | Shu só para atenção (erro, notificação, ao vivo). No máximo um por tela | `--shu` |
| 円相 **Ensō**: o círculo de um traço | Progresso e carregamento são um traço contínuo | — |
| 掠れ **Kasure**: o traço seco | Dado estimado ou projetado vai em tracejado, nunca como real | `stroke-dasharray: 2 4` |

## Forma
- **Controles são pílulas**: botão, campo, select, chip, segmentado, item de menu (`--r-pill`).
- **Superfícies são squircles**: tile 18 · menu 28 · card compacto 36 · card 44 · painel e modal 56 (`corner-shape: squircle`; sem suporte, vira canto arredondado comum).
- Controles têm altura 28 / 36 / 44, com ícone 14 / 16 / 18 e gap 4 / 6 / 8. Campos têm 40.

## Luz e matéria (elevação)
| Altura | Uso | Token |
|---|---|---|
| Pousada | cards, tabelas | `--sh1` |
| Erguida | sidebar, menus, hover | `--e2` |
| Segurada | modais, toasts, drawers | `--e3` |
| Cavada | campos, trilhos | `--deb` |

Todas as sombras têm **a mesma estrutura de 5 camadas**. Isso é o que permite que elas se interpolem. Nunca crie sombra com outra estrutura.

## Movimento: uma só física
- **Respiro** `cubic-bezier(.22,1,.36,1)` · 550ms: o padrão de **tudo**. Já é aplicado globalmente.
- **Maré** `(.65,0,.35,1)`: deslocar de A para B. **Folha** `(.34,1.22,.64,1)`: toggle e pop. **Saída** `(.4,0,.6,1)`: 20 a 30% mais rápida que a entrada.
- **Nada teletransporta**: estados passam pelos intermediários.
- **Rápido ao tocar, lento ao soltar**: o press leva 100ms e a volta leva 450ms.
- Animam: transform, opacity, box-shadow e cor. Nunca animam: largura e altura de cards (exceto pelo motor), fundo da página, texto de corpo.
- Sem loops decorativos. Só "ao vivo" pulsa. `prefers-reduced-motion` é respeitado.

## API de atributos (`sumi.js`)

| Atributo | Efeito |
|---|---|
| `data-press="ink｜sheet｜ghost"` | Física de toque: carvão afunda, folha ergue no hover e assenta no clique |
| `data-lbl` (span dentro do botão) | O rótulo nunca quebra linha: corta com reticências e faz marquee no hover |
| *(todo `<button>`)* | Quando o rótulo muda, a largura escoa e o texto novo surge de um leve desfoque |
| `data-morph` | Toda troca de estado dentro do bloco morfa: a altura escoa, o conteúdo antigo dissolve e o novo surge |
| `data-collapse` + `data-open="true｜false"` + `--g` | A mensagem abre espaço de 0 até a sua altura |
| `data-slide` > `data-ind` + filhos `data-on="true"` | Indicador deslizante (abas, segmentado, paginação, sidebar). `data-ind="line"` vira sublinhado |
| `data-pop` / `data-pop-trigger` | Popover fecha ao clicar fora, com saída animada, e dispara o evento `sumi:close` |
| `data-tipwrap` > `data-tip` | Tooltip com atraso de 250ms |
| `data-odo="R$ 184.320"` | Odômetro: cada dígito rola para cima ou para baixo |
| `data-reveal` | Revela ao rolar |
| `data-ai` | Ícone redesenha o traço no hover |
| `data-instant` | Desliga a física (ex.: elemento arrastado) |
| `data-sumi-section` | A seção dorme fora da tela (desempenho) |
| `input[type=password]` | Automático: os caracteres viram marcas de carvão |

Funções: `Sumi.setTheme('carvao')`, `Sumi.refresh()`, `Sumi.land(el, {x,y})` (pouso de papel ao soltar), `Sumi.expandFrom(painel, rect)` (cartão → painel), `Sumi.ease.*`.

## Pigmentos de dados
Sumi `--v0` (série principal) · Ai `--v1` · Asagi `--v2` · Kaki `--v3` · Fuji `--v4` · Hai `--v5` (outros). Comparação em Hai tracejado. Verde e vermelho de estado nunca viram série.

## Adoção em outro produto
**Fixo**: princípios, temas, luz, forma, espaço, tipografia (Geist / Geist Mono), física.
**Muda**: só o selo `--shu` e, se preciso, a ordem dos pigmentos.

Manual vivo: abra `Sumi Design System.dc.html` (o mapa leva às 27 páginas). A seção **Garantia** roda a verificação de contraste, toque, acessibilidade e movimento.
