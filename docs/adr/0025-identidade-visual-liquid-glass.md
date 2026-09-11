# ADR-0025 — Liquid glass como identidade visual, com disciplina de camadas

**Status:** Parcialmente substituído por [ADR-0031](0031-identidade-visual-colorsoft.md) — a paleta (seção "Os tokens") e o alcance do vidro (restrito à camada de navegação) foram atualizados lá. A disciplina de camada em si — primitivo único, `contain: paint`, fallbacks, proibição de animar blur/scale, e a regra de nunca usar vidro em conteúdo que rola — continua valendo sem alteração.
**Data:** 2026-09-10

## Contexto

A direção visual da marca foi definida por duas referências:

- **[Luna Health](https://www.behance.net/gallery/249935865/Luna-Health-Wellness-Mobile-App-UX-UI-Design)** — paleta e temperatura: verde-sálvia e azul-ardósia muito dessaturados, areia quente, fundo quase branco, tinta ardósia profunda. Vidro **leitoso e de baixo contraste** sobre imagem orgânica desfocada. Traços brancos finos para dado. Raio generoso. Sans geométrica leve, com tracking aberto.
- **[AlJanub Today](https://www.behance.net/gallery/250061627/AlJanub-Today)** — qualidade do efeito: refração real, realce especular na borda, profundidade. Azul elétrico saturado, alto brilho.

As duas dizem coisas diferentes, e a distinção importa: **Luna é a identidade; AlJanub é a qualidade do vidro.** A paleta vem da primeira; o acabamento do efeito, da segunda. Copiar a saturação do AlJanub para uma ferramenta de trabalho produziria uma interface cansativa em duas horas de uso.

### A tensão que precisa ser resolvida antes de decidir

`backdrop-filter` é uma das propriedades mais caras do CSS. Os números de 2026:

| Custo | Medida |
|---|---|
| Composição por frame | **4–8 ms** |
| GPU a mais que superfície opaca | **15–25%** |
| Queda de FPS em Android médio, com múltiplos elementos de vidro | **~12 fps** |

Nosso orçamento é **16 ms por navegação** e 60 fps ([ADR-0017](0017-orcamento-de-performance.md)). Um único elemento de vidro pode consumir metade do frame.

E há um segundo problema, de legibilidade: o Luna é um app de bem-estar com três números na tela. Nosso pipeline tem 40 negócios em 12 colunas, lido oito horas por dia. **Vidro reduz contraste por definição** — e contraste é o que sustenta densidade de dado.

### O que a Apple faz de fato

Esta é a observação que resolve o impasse, e não é opinião: **a Apple aplica Liquid Glass à camada de navegação que flutua sobre o conteúdo** — barras, toolbars, sheets, sidebars — **e não ao conteúdo em si**. O conteúdo permanece sólido e nítido; o vidro é o que emoldura.

## Decisão

**Liquid glass é a identidade visual do Spark — aplicado por camada, não por superfície.**

### As três camadas

| Camada | O que é | Vidro? | Custo |
|---|---|---|---|
| **0 · Ambiente** | Gradiente mesh de fundo | Não — é o que o vidro refrata | Pintado uma vez. Zero |
| **1 · Conteúdo** | Tabelas, listas, formulários, cards, gráficos, inbox | **Nunca.** Superfície sólida | Zero |
| **2 · Navegação flutuante** | Sidebar, topbar, command palette, sheets, modais, menus, toasts, barra de ação | **Sim. É aqui que o vidro vive** | 4–8 ms, controlado |

A camada 2 é pequena, fixa e sempre visível — é ela que dá identidade a **toda** tela do produto. A camada 1 é grande, densa e rola — é ela que precisa ser rápida e legível.

E o resultado é melhor esteticamente, não só mais rápido: vidro em tudo lê como sujo. Vidro na camada flutuante, sobre conteúdo nítido, lê como caro.

### As regras de vidro — verificadas no CI

1. **Máximo 3 superfícies de vidro visíveis ao mesmo tempo.**
2. **Nenhum vidro dentro de container que rola.** Cabeçalho de vidro fixo sobre lista rolando recomputa o backdrop **a cada frame** — é o pior caso possível.
3. **Nunca animar `blur` nem `scale` do mapa de deslocamento.** Ambos forçam a cadeia de filtro inteira a re-renderizar. Anime `opacity` e `transform`.
4. **`contain: paint`** em toda superfície de vidro, para isolar os limites de pintura.
5. **Refração por filtro SVG é *progressive enhancement*.** Só o Chromium aceita filtro SVG como entrada de `backdrop-filter`; Safari e Firefox não. O visual base usa `blur` + `saturate` nativos, que funcionam em todos.
6. **Fallback sólido obrigatório** em `prefers-reduced-transparency`, em `forced-colors` e quando a detecção de capacidade indicar dispositivo fraco.
7. **Contraste de texto sobre vidro é medido, não estimado.** Mínimo AA (4.5:1) contra o pior caso do fundo, não contra o melhor.

### Os tokens

Camada primitiva, derivada do Luna:

```
sage.200  #D3DEDA    slate.200  #C6D3DB    sand.200  #E4DCCE
sage.400  #B2C6C1    slate.400  #A2B9C6    sand.400  #CFC3B0
sage.600  #7E9A94    slate.600  #6D8B9C    sand.600  #A8977E
ink.900   #1E262B    ink.600    #55646B    ink.300   #94A3A8
teal.700  #2F6F7E    ← acento; escurecido para sobreviver AA sobre vidro
```

Semânticos, contidos para não brigar com a paleta:

```
success #2E7D5B    warning #9A6B1F    danger #A33C39
```

A receita do vidro, como token de componente:

```css
--glass-bg:      rgba(255,255,255,.55);   /* escuro: rgba(22,28,30,.55) */
--glass-blur:    blur(20px) saturate(1.4);
--glass-edge:    inset 0 1px 0 rgba(255,255,255,.60);
--glass-shadow:  0 8px 32px rgba(30,38,43,.10);
--glass-radius:  20px;
```

Tudo passa pelo `packages/tokens` em formato DTCG e é compilado para CSS, React Native e Figma ([ADR-0020](0020-design-system-proprio.md)). **Nenhum componente escreve `backdrop-filter` na mão** — existe um único primitivo `<Glass>` em `packages/ui-web`, e é ele que carrega a receita, o fallback e o `contain`.

No mobile, `expo-blur` cumpre o mesmo papel — e no iOS moderno usa o material nativo, que é mais barato que o do navegador.

### Movimento

As skills do Emil Kowalski entraram no repositório ([`.agents/skills/`](../../.agents/skills/)) e são a referência de movimento: `apple-design`, `animate`, `animate-expo`, `review-animations`, `animation-vocabulary`.

O princípio que mais importa aqui, e que se alinha ao [ADR-0017](0017-orcamento-de-performance.md): **responder no *pointer-down*, não no *release*; rastreamento 1:1 durante o gesto; molas interrompíveis que herdam velocidade.** Latência mata a sensação de direto antes de qualquer efeito visual salvá-la.

Vidro **não** anima seu próprio blur. Ele entra e sai por `opacity` e `transform`.

## Alternativas consideradas

**Vidro em tudo, inclusive em card e linha de lista.** É o pedido literal, e foi descartado com número: uma lista de 200 conversas com vidro por linha derruba o frame em qualquer aparelho de gama média, e reduz o contraste justamente onde a densidade de dado exige o contrário. A disciplina de camadas entrega a mesma identidade — porque a camada 2 aparece em **toda** tela — sem pagar o custo onde ele dói.

**Nada de vidro, só superfícies sólidas.** Mais rápido e mais seguro. Descartado: a identidade da marca é uma decisão de produto, não um detalhe, e a camada 2 comporta o efeito com folga dentro do orçamento.

**Glassmorphism clássico** (blur simples, sem refração nem realce de borda). Descartado como teto: é o que todo mundo faz desde 2020 e não entrega a qualidade da referência do AlJanub. Ele é o nosso **piso** — o que Safari e Firefox recebem — com a refração SVG como camada extra no Chromium.

**Imagem de fundo fotográfica** (como o Luna faz). Descartado para o app: foto atrás de dado denso prejudica legibilidade e pesa no carregamento. Gradiente mesh entrega a mesma temperatura, custa nada e é token. Foto fica permitida em superfícies de marketing e no construtor de páginas.

## Consequências

- Um primitivo `<Glass>` concentra toda a complexidade: receita, fallback, `contain`, detecção de capacidade. Nenhum outro lugar escreve `backdrop-filter`.
- O lint precisa proibir `backdrop-filter` fora de `packages/ui-web`, junto das outras regras de fronteira.
- Teste de performance em aparelho Android de gama média entra na esteira. Vidro é a única parte do sistema que pode passar no desktop e falhar no celular.
- O fundo mesh precisa ser leve — SVG ou gradiente CSS, nunca imagem grande.
- Contraste sobre vidro exige verificação automatizada no Storybook, contra o pior caso do fundo.
- Ganhamos identidade forte e consistente em toda tela, sem colocar a meta de 16 ms em risco.
