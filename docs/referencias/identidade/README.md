# Identidade visual do Spark — referência de trabalho

ADR-0044. A identidade vem do design system do usuário publicado no Claude Design. A origem está guardada intacta em `origem/`, e os valores exatos de cada componente estão em `spec/*.md`. No código, o nome é sempre **identidade**.

> Regra do usuário: cópia fiel. Forma, sombra, cor, tipografia e movimento iguais aos da origem. O que a origem não tiver é construído com as mesmas regras. Componente "quase igual" é defeito.

## De onde vêm os valores

Tudo vem de `packages/tokens` (`pnpm gen:tokens` gera `dist/css/tokens.css`). Não existe valor de cor, curva, duração, raio acima de 8px, família ou tamanho de fonte escrito à mão. O lint `spark/identidade` reprova. Os tokens `--legado-*` foram removidos em 02/10/2026; `spark/identidade-legado` é erro para nenhum voltar.

| Papel | Token |
|---|---|
| Mesa (fundo da página) | `--bg` |
| Folha pousada (card, tabela, seção) | `--sf` + `--grain`, borda `--bd`, sombra `--sh1` |
| Folha erguida (sidebar, menu, hover de card) | `--sf` ou `--sf3`, sombra `--e2` |
| Folha segurada (modal, drawer, toast) | `--sf3` + `--grain`, sombra `--e3` |
| Cavado (campo, trilho, segmentado) | `--sf2` + `--deb` |
| Tinta, em 5 tons | `--tx` títulos e ação · `--tx2` texto · `--tx3` secundário · `--tx4` desabilitado · `--bd` borda |
| Carvão (ação principal, uma por área) | `--ac` / `--acf` / `--ink` / `--inkp` |
| Realce de item | `--acs` |
| Halo de foco | `0 0 0 var(--ui-focusWidth) var(--ring)` |
| Estados | `--ok --er --wa --in`, sempre com o fundo suave `--oks --ers --was --ins` |
| Selo (só o que exige atenção, um por tela) | `--shu` |
| Texto sobre cor de estado ou pigmento | `--sobre-cor` |
| Pigmentos de dado e avatar | `--v0` (tinta) `--v1` `--v2` `--v3` `--v4` `--v5` (comparação) |
| Vidro (só camada flutuante, só via `<Glass>`) | `--glass`, `--glass-lista`, `--gbd`, `--vidro-menu`, `--vidro-barra` |
| Forma | controle `--r-pill`; superfícies `--r-sm` 18 · `--r-item` 20 · `--r-rico` 22 · `--r-lista` 24 · `--r-md` 28 · `--r-bloco` 32 · `--r-lg` 36 · `--r-kpi` 40 · `--r-xl` 44 · `--r-secao` 48 · `--r-2xl` 56, sempre com `corner-shape: var(--r-shape)` |
| Altura de controle | `--h-sm` 28 · `--h-md` 36 · `--h-lg` 44 · `--h-field` 40 |
| Tipografia | `--font` (Geist), `--mono` (Geist Mono), `--fs-*`, `--lh-*`, `--ls-*`, `--fw-*`. Papéis que a origem usa fora da escala: `--fs-meta` 10,5 (hora, atalho e contagem em mono), `--fs-valor` 12,5 (valor em mono), `--fs-iniciais` 9 (avatar de 24), `--fs-estado` 16 (título de estado de página), `--fs-numero-s` 26 (centro da rosca) |
| Física | `--ease` (Respiro), `--ease-move`, `--ease-spring`, `--ease-pop`, `--ease-out`, `--ease-land`; tempos `--t-*` (o pouso do quadro é `--t-land` 1050 ms) |
| Keyframes (globais, em `packages/ui-web/src/identidade.css`) | `animation: var(--anim-pop) var(--t-pop) var(--ease)`; nunca nome literal |

### Vocabulário antigo → novo

| Antigo (legado) | Use |
|---|---|
| raio 8 a 16 em controle (botão, campo, chip, item de menu) | `--r-pill` |
| raio 12 a 20 em card ou painel | `--r-xl` (card), `--r-lista` (lista), `--r-md` (bloco médio) |
| `--legado-ui-modalRadius` | `--r-xl` |
| `--legado-ui-tabLine` / `--legado-ui-buttonLine` | `--lh-controle` (controle) ou `--lh-corpo` (texto) |
| `--legado-t-control` / `--legado-t-selection` / `--legado-t-popup` | não declare transição: a física global já anima cor, sombra, transform e opacidade em 550 ms. Para movimento específico, use o `--t-*` da receita. |
| `--legado-t-exit` | `--t-sink` (modal) ou `--t-pop-out` (camada flutuante) |
| `--legado-ui-fieldFocusShadow` | `var(--deb), 0 0 0 var(--ui-focusWidth) var(--ring)` com borda `--tx3` |
| `--legado-ui-fieldErrorShadow` | `var(--deb), 0 0 0 var(--ui-hairline) var(--er)` |
| `--legado-ui-optionHover` | `--acs` |
| `--legado-ui-labelSize` / `--legado-ui-helpSize` | `--fs-pequeno` (rótulo 12/500) / `--fs-legenda` (ajuda 11, `--tx3`) |
| `--legado-ui-disabledOpacity` | `0.45` em controle, `--disabled-ink` em botão carvão |
| `--legado-ui-spinDuration` | `--t-spin` com `--anim-spin` |

## Receitas

Prefira **sempre** o componente de `@spark/ui-web`. Ele já carrega a receita. O catálogo completo, com todas as variantes e estados nos dois temas, é o Storybook (`pnpm --filter @spark/ui-web storybook`): comece por **Identidade › Comece aqui**. Se a tela redesenha um controle à mão, está errado, e o lint `spark/tela-so-layout` reprova.

Peças que resolvem os casos que mais divergiam:

- `AvatarStack` para qualquer grupo de avatares (seguidores, quem está vendo). Dentro de botão, vai no `icon`.
- `Spinner` é o único ensō: botão, busca, campo na linha e página usam o mesmo.
- `Card` com `href` ou `linkRender` é o cartão inteiro clicável; ações continuam clicáveis por cima.
- `LinkTabs placement="sheet"` é a barra de abas da área no topo da folha.
- `AppShell` e `AppContent` são o casco; `NavigationRail`, `RailGroup`, `RailItem` e `RailBrand` são o trilho.
- `Tabs fill` ocupa a altura do pai e rola só o painel.
- `ViewSwitcher views` troca os modos oferecidos (ex.: Conversa e Lista).

- **Botão.** Pílula. Carvão `primary`, um por área. Folha `secondary`. Tinta `ghost`. Destrutivo `tone="danger"`. Tamanhos 28, 36 e 44. Rótulo nunca quebra. Ícone, avatar ou grupo de avatares vão sempre na prop `icon`: ocupam o mesmo encaixe de 24 e o texto começa no mesmo lugar.
- **Campo.** Pílula cavada de 40 com borda transparente. Foco: borda `--tx3` + halo. Rótulo 12/500 a 6px; ajuda 11 `--tx3`.
- **Lista flutuante.** Vidro de lista, raio 24, padding 6, itens de 34–36 em pílula, realce `--acs`. Entra descendo 6px em 380 ms e sai em 240 ms.
- **Card.** Folha pousada, raio 44 (KPI 40), padding 26 28, título 500 15. O hover só ergue (`--e2`) quando o card é clicável.
- **Modal.** `--sf3` + granulação, borda, `--e3`, raio 44. Sobe 10px em 620 ms sobre o véu com 4 camadas de desfoque. Drawer solto 12px da borda.
- **Tabela.** `DataTable`: linhas de 52, cabeçalho 11 `--tx3`, números em mono à direita, tira de papel no hover. **Toda tabela de registros recebe `onRowOpen` e abre a página do registro** (regra permanente do usuário).
- **Indicador deslizante.** Abas, segmentado, sidebar e paginação: o item ativo não se pinta, a folha (`[data-ind]`) desliza até ele (`useSlidingIndicator`).
- **Selo e etiqueta.** Etiqueta neutra: 20–22 de altura, `--sf2`, `--tx2`, 10.5–11. Cor de estado só quando significa, e com fundo suave. Nunca borda colorida grossa nem pílula larga só para status.
- **Status pequeno.** Prazo, SLA e presença viram sinal: ponto de 6–8px na cor do estado + texto curto `--tx3`, ou só o ícone. Não ocupam uma linha inteira.
- **Avatar.** Círculo em pigmento (`--v1..--v4`) com iniciais em `--sobre-cor` 500.

## Movimento

Uma só física: a regra global anima cor, sombra, transform e opacidade em 550 ms Respiro. Não declare `transition` para essas propriedades sem motivo. O press responde em 100 ms (`data-press`). Listas entram em cascata (`--anim-item`, `--t-item`, atraso `n × --t-item-stagger`). Hover de card ergue 1px com `--e2`. Mensagem condicional abre espaço com o colapso (`data-collapse` + `data-open`) em vez de aparecer seca. Número de KPI rola (odômetro). Só o "ao vivo" pulsa.

## O que o usuário cobrou (não repetir)

1. Texto ilegível. `--tx4` só em desabilitado de verdade. Texto informativo usa `--tx2` ou `--tx3`, nunca sobre vidro transparente.
2. Densidade. Lista que pode ter mil itens (conversas, notificações) usa linhas compactas: avatar 32, duas linhas, sem pílula gigante. Linha de várias linhas selecionada usa `--r-rico` ou `--r-lista`, não `--r-pill`, que vira estádio.
3. Nada sai da caixa. Indicador, sombra ou conteúdo que passa da borda do contêiner é defeito.
4. Alinhamento. Ícone e avatar no mesmo encaixe; texto de todos os itens começa na mesma coluna.
5. Campo de busca é campo de verdade (`Input` com ícone), não item de lista que abre algo.
6. Rótulos em português. Status técnico (`received`, `delivered`) vira texto em pt-BR ou ícone.
7. Cores fortes demais em coluna ou etiqueta: a cor fica num ponto ou num traço fino, não pinta a área.
8. Falta vida. Use a física: cascata de entrada, hover que ergue, indicador que desliza, odômetro, morfismo de estado.

## Processo

- Componente novo ou alterado vive em `packages/ui-web`, com histórias no Storybook: `Interativo` (controles), `Variantes` (prancha com todas as variantes e estados, usando `src/storybook/Prancha.tsx`) e os estados reais (vazio, carregando, erro, desabilitado, texto longo, muitos itens, largura estreita). Título na taxonomia: Ações, Campos, Escolhas, Navegação, Camadas, Dados, Retorno, Superfícies, Estrutura, Padrões.
- Nenhum `<input>`, `<button>` ou `<select>` nativo fora de `packages/ui-web`. `backdrop-filter` só no `Glass`.
- Antes de entregar uma tela: `pnpm check` (typecheck, lint e testes do que mudou) saindo 0.
