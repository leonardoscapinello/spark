# ADR-0031 — Identidade visual COLORsoft substitui a paleta Luna; vidro ganha camada de conteúdo

**Status:** Aceito
**Data:** 2026-09-11

## Contexto

O ADR-0025 (2026-09-10, um dia antes deste) decidiu a paleta Luna/AlJanub (sálvia, ardósia, areia, acento teal) e uma disciplina de vidro restrita à camada de navegação flutuante. Desde então, uma segunda identidade — **COLORsoft** — amadureceu fora deste repositório: um contrato visual completo (cor, tipografia, vidro, grid, componentes de produto, motion) construído para o conteúdo educativo do autor sobre IA, algoritmos e segurança. O próprio contrato já se declara "a fundação visual do Content Operations e dos produtos em nuvem que vierem depois" — ou seja, não nasceu como um one-off de post de Instagram, nasceu para ser reutilizado.

A pergunta que este ADR resolve: **duas identidades visuais aceitas ao mesmo tempo, num intervalo de 24 horas, não é uma opção.** Ou o Spark segue Luna/AlJanub, ou segue COLORsoft. Misturar as duas — cor de uma, vidro de outra — não produz coerência, produz um terceiro sistema não documentado.

### Onde as duas decisões colidem, especificamente

| Eixo | ADR-0025 (Luna/AlJanub) | COLORsoft |
|---|---|---|
| Paleta | Sálvia/ardósia/areia dessaturados + teal escurecido | Vazio azul-marinho `#0A1526`, porcelana `#DCE0E5`, azul elétrico `#1B45E8`, ciano `#06BFF5`, dourado raro `#C8A65D` |
| Onde vidro vive | Só camada 2 (nav flutuante): sidebar, topbar, sheet, modal, toast. Conteúdo (tabela, lista, card) é **sempre** sólido | Três níveis (subtle/panel/modal) aplicados também a card, painel, dropdown, drawer — não só navegação |
| Tipografia | Não especificada no ADR-0025 (herda o que já existe: FH Duo/FH Duo Display, ADR-0020) | Helvetica Neue como referência |

O terceiro eixo (tipografia) tem uma saída óbvia: FH Duo/FH Duo Display já são ativos próprios, licenciados e self-hosted (`packages/tokens/fonts`), com todo o pipeline DTCG → Style Dictionary já construído em cima deles (ADR-0020). Não há motivo técnico ou de marca para trocar por Helvetica Neue — COLORsoft especifica "uma sans neutra disponível no sistema" porque foi escrita antes de existir um ativo próprio nesse contexto; aqui já existe. **Tipografia não muda.**

Os outros dois eixos exigem decisão explícita.

## Decisão

### Paleta: substituição completa

A paleta COLORsoft (vazio/porcelana/azul elétrico/ciano/dourado) substitui integralmente a paleta Luna/AlJanub em `packages/tokens`. Não é uma paleta alternativa — é a única paleta. `packages/tokens/tokens/color.primitive.json` e as duas camadas semânticas (`color.semantic.light.json`, `color.semantic.dark.json`) foram reescritas com os valores de COLORsoft, mapeados para os MESMOS nomes semânticos que já existiam (`ground`, `surface`, `ink`, `accent`, `focusRing`, `glassBg`, ...) — nenhum componente precisa saber que a paleta trocou, porque nenhum componente referencia cor primitiva direto (ADR-0020).

Onde COLORsoft dava o valor exato (ex.: `--cs-blue-on-dark` para `focusRing`, `--cs-border-dark` para `line` no escuro, `--cs-meta` para `inkMuted` no escuro), o token herda esse valor com uma nota de origem. Onde COLORsoft não cobria o caso — o tema escuro do sistema de produto é tratado por COLORsoft como "uma variação de superfície", não uma tabela própria — os valores foram interpolados a partir do que existe (documentado token a token nos arquivos JSON, marcado `$description` como "Interpolado").

### Vidro: a disciplina de camada continua, o alcance dela cresce

O `<Glass>` primitivo (`packages/ui-web/src/Glass`) continua sendo o único lugar do repositório autorizado a escrever `backdrop-filter` — isto não muda, e não é negociável: é o que torna a regra de fronteira do lint verificável e o fallback (`prefers-reduced-transparency`, `forced-colors`, `@supports`) garantido em um único lugar.

O que muda é o alcance de onde ele pode ser usado. `<Glass>` ganha uma prop `tier`:

| Tier | Blur | Raio | Uso |
|---|---:|---:|---|
| `subtle` | 8px | `radius.md` (10px) | Chip, tag, botão de vidro |
| `panel` (default) | 18px | `radius.lg` (16px) | Card, painel, dropdown, drawer — **e** a camada de navegação flutuante do ADR-0025 (sidebar, topbar, sheet) |
| `modal` | 28px | `radius.xl` (24px) | Modal, confirmação, foco de tarefa |

Isto **estende** o ADR-0025, não o descarta: a regra "nenhum vidro dentro de container que rola" continua valendo — tabela, lista e linha de card seguem **sempre** sólidas, porque o argumento ali nunca foi estético, foi o custo de recompor `backdrop-filter` a cada frame de scroll (medido no ADR-0025: 4–8ms/frame, ~12fps de queda em Android médio). Nada em COLORsoft muda essa física.

A regra "no máximo 3 superfícies de vidro visíveis ao mesmo tempo" (ADR-0025) também continua valendo, e é ela — não a paleta, não o tier — que impede o caso óbvio de abuso: o board de pipeline tem até 40 negócios em 12 colunas; nenhuma leitura razoável de "cards podem ser vidro" significa "os 40 cards do board são vidro simultaneamente". Um card individual do board **não** vira glass por padrão. O que a extensão realmente libera é: um painel de detalhe (sheet lateral), um card isolado/hero (ex.: resumo do negócio em destaque), dropdown, drawer, modal de confirmação — superfícies que já eram poucas e already-elevated por natureza, só que antes eram forçadas a ficar sólidas mesmo sendo, conceitualmente, parte da mesma família visual do sidebar/topbar.

### Validação de performance pendente antes de qualquer superfície de conteúdo nova usar `panel`/`modal`

O ADR-0025 mediu o custo do vidro genérico; ele não mediu o custo específico de aplicar `tier="panel"` a um painel de detalhe sobre o board real, com dados reais, no Android de gama média que já é o alvo do ADR-0017. Antes de qualquer PR aplicar `<Glass tier="panel">`/`tier="modal"` a uma superfície de conteúdo nova (fora do que já era nav flutuante), ela precisa passar pelo mesmo teste de performance que o ADR-0025 já exige na esteira — não é uma formalidade nova, é a aplicação do que o ADR-0025 já pedia, agora que existe uma superfície nova pra medir.

## Alternativas consideradas

**Manter a paleta Luna/AlJanub e usar COLORsoft só como referência de técnica de vidro/motion.** Descartada: o pedido explícito era coerência visual entre tudo o que está sendo construído, incluindo o conteúdo autoral fora deste repositório. Duas paletas ativas não entrega isso — entrega duas marcas.

**Vidro em paridade total com COLORsoft, incluindo tabela e lista.** Descartada. COLORsoft já não pede isto — a própria especificação de `DataTable` no contrato não usa vidro ("sem raio por linha", superfície plana). O board de 40 negócios em 12 colunas é exatamente o caso que o ADR-0025 mediu e rejeitou, e nada mudou na física do `backdrop-filter` entre ontem e hoje.

**Editar o ADR-0025 em vez de escrever um novo.** Descartada por regra do próprio processo (`docs/adr/README.md`): ADR é imutável depois de aceito. Este documento o substitui explicitamente; o ADR-0025 permanece no histórico, com o status atualizado.

## Consequências

- `packages/tokens/tokens/color.primitive.json`, `color.semantic.light.json`, `color.semantic.dark.json`, `effect.json` e `radius.json` foram reescritos. `radius.glass` (token dedicado, 20px) foi removido — os tiers de vidro agora usam `radius.md/lg/xl` diretamente, o que também alinha o raio do vidro ao raio do resto do sistema (COLORsoft dá exatamente essa correspondência: modal 24px, card/painel 16px).
- `<Glass>` ganha a prop `tier` (`subtle | panel | modal`, default `panel`); todo consumidor existente (sidebar, topbar) continua funcionando sem mudança, porque `panel` é o comportamento que já tinham.
- Toda superfície que hoje usa `<Glass>` herda a nova paleta automaticamente, sem tocar em código de componente — é o próprio argumento do ADR-0020 (`packages/tokens` como fonte única) se pagando.
- Nenhuma superfície de conteúdo (card de negócio, linha de tabela, item de lista) muda de sólida para vidro por este ADR sozinho — isso é uma decisão por componente, feita depois, com o teste de performance descrito acima.
- O índice em `docs/adr/README.md` e o cabeçalho do ADR-0025 precisam apontar "Substituído por ADR-0031" na paleta e na extensão de alcance do vidro; as partes do ADR-0025 que não mudaram (o primitivo único, o `contain: paint`, os fallbacks, a proibição de animar blur/scale, a regra de no-vidro-em-scroll, o limite de 3 superfícies simultâneas) continuam valendo e não precisam ser reescritas — este ADR não as contradiz, só as estende.
