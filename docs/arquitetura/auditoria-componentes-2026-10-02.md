# Auditoria de componentes — 02/10/2026

Gerada a partir do CSS das telas (`apps/web/app/**/*.module.css`) e do uso dos componentes de `@spark/ui-web` no TSX. Critério do ADR-0045: **tela só faz layout; aparência é do componente.** Cada item abaixo é um lugar em que uma tela desenha algo que deveria vir de um componente — por isso um ajuste no componente não chega lá.

**Total:** 1214 declarações de aparência em 37 arquivos de tela; 30 componentes do design system com a aparência sobrescrita por classe da tela. O lint `spark/tela-so-layout` mede o mesmo número; a meta é zero, e então a regra vira erro.


## Resultado (02/10/2026, fim do dia)

A mesma medição, rodada depois da migração das telas: **0 declarações de aparência em telas** (eram 1.214 em 37 arquivos) e **0 componentes sobrescritos por classe da tela** (eram 30). O lint `spark/tela-so-layout` saiu de 1.301 avisos para zero e virou erro, junto com `spark/identidade-legado`; os tokens `--legado-*` foram removidos. O casco do app (trilho, folha de conteúdo, abas da área) também virou componente (`AppShell`, `AppContent`, `RailGroup`, `RailBrand`, `LinkTabs placement="sheet"`).

O restante deste documento é o retrato de antes, mantido como registro do que foi corrigido.

## 0. Famílias de componente: uma por padrão

O lint enxerga CSS de tela; não enxerga dois componentes do design system fazendo a mesma coisa de jeitos diferentes. Esta é a lista de famílias e quem é o dono de cada uma. Componente fora da coluna "dono" que desenha o mesmo padrão deve passar a compor o dono.

| Padrão | Dono (único) | Hoje desenham o mesmo padrão por conta própria | Ação |
|---|---|---|---|
| Botão (carvão, folha, tinta, destrutivo; com ícone ou avatar) | `Button` | `FeedbackButton` (camadas próprias), botões de tela com `className` (seção 1) | variação vira prop do `Button`; tela não pinta botão |
| Gatilho de escolha (campo de formulário) | `shared/surfaces` `.trigger` (via `Select`) | `SearchSelect`, `RecordSelect`, `PersonChoice`, `TagPicker`, gatilhos do `DateTimePicker` | todos usam o mesmo gatilho e o mesmo encaixe de ícone/avatar |
| Gatilho de barra de ferramentas (filtro, ordenação, visualização) | `.filterTrigger` / `MenuButton secondary` | `CollectionToolbar`, `FilterBar`, cabeçalhos de lista do atendimento e do funil | um gatilho só, com ou sem avatar/ícone |
| Lista flutuante e item de lista flutuante | `shared/surfaces` `.popup` + `.item` (+ `MenuNote`) | `QuickNavigation`, `RecordSelect`, `TagPicker`, `DateTimePicker`, `ColumnCatalog` | mesma folha, mesmo item, mesmo encaixe de 24 |
| Linha de lista (navegação e registros) | `SidebarItem` (navegação) · `DataTable` (tabela) · **`ListRow` (a criar)** para listas densas | conversa do atendimento, notificações, linha do tempo, resultados da busca rápida, cartões do funil em modo lista | listas densas viram `ListRow`: avatar 32, até 3 linhas, separador inset, seleção em folha `--r-rico` |
| Campo de valor editável na ficha | `InlineField` (contrato único: vazio, preenchido e editando no mesmo encaixe) | `InlineEdit`, `CustomFieldValue`, linhas de resumo da ficha de negócio, pessoa e empresa | tudo passa pelo `InlineField` |
| Etiqueta, selo e status | **`Chip` (a criar)**: neutro 22 `--sf2` `--tx2`, ponto de cor opcional, tons de estado | `TagPicker` (chips), etiquetas do funil, etapa no resumo, `PublicationStatus`, `DealOutcome`, SLA do atendimento | um `Chip`; status pequeno é ponto + texto curto |
| Avatar e pilha de avatares | `Avatar` | `UserAvatar` (repassa), `ViewerStack`, `RecordIdentity`, iniciais desenhadas em telas | só `Avatar` desenha iniciais e pigmento |
| Folha (card, painel, coluna) | `Card` · `Panel`/`Modal` · **`Surface` (a criar)** para folha genérica | painéis da ficha, colunas do funil, nós do construtor, blocos do atendimento | aparência da folha vem de um componente com `elevation` (pousada, erguida, segurada, cavada) |
| Abas e navegação por abas | `Tabs` · `SegmentedControl` · **`LinkTabs` (a criar)** para abas que são links | abas da área no casco (`app-layout` `.moduleTab`), abas das fichas | abas com link usam o mesmo traço deslizante do `Tabs` |
| Estado vazio, erro e carregando | `EmptyState` · `Feedback` (`Skeleton`) · `CardContentState` | estados desenhados no atendimento, no funil e na ficha | usar os componentes; tela não desenha esqueleto |
| Título e cabeçalho de página/seção | `PageHeader` · **`SectionTitle` (a criar)** | títulos de bloco desenhados nas fichas, no atendimento e nos construtores | tipografia de título vem do componente |

## 1. Componentes do design system redesenhados pela tela (corrigir primeiro)

A tela passa `className` para um componente e muda cor, fundo, borda, raio, fonte ou sombra dele. O mesmo componente fica com aparências diferentes em cada tela. Correção: a variação vira prop/variante do componente (ou um componente novo em `packages/ui-web`), e a classe da tela passa a ter só layout.

| Tela | Componente | Classe | Aparência sobrescrita |
|---|---|---|---|
| `crm/StageSettings.tsx` | `Tabs` | `.identity` | border-top |
| `routes/activities.tsx` | `Button` | `.periodOption` | color, font-size |
| `routes/admin-appearance.tsx` | `Field` | `.colorField` | background, border, border-radius, corner-shape |
| `routes/admin-appearance.tsx` | `Button` | `.previewAction` | background, border-radius, color |
| `routes/app-layout.tsx` | `NavigationRail` | `.rail` | border-radius, opacity, transition |
| `routes/app-layout.tsx` | `NavigationRail` | `.rail` | border-radius, opacity, transition |
| `routes/app-layout.tsx` | `Button` | `.railPin` | color |
| `routes/automation-builder.tsx` | `Button` | `.paletteButton` | background, color, font-weight |
| `routes/automation-builder.tsx` | `Button` | `.paletteButton` | background, color, font-weight |
| `routes/automation-builder.tsx` | `Button` | `.deleteButton` | color |
| `routes/automation-builder.tsx` | `Button` | `.canvasAdd` | background, border-radius, box-shadow, color |
| `routes/automation-builder.tsx` | `Button` | `.nodePort` | background, border, border-color, border-radius, box-shadow, transition |
| `routes/automation-builder.tsx` | `Button` | `.nodePort` | background, border, border-color, border-radius, box-shadow, transition |
| `routes/deal-detail.tsx` | `PageFrame` | `.page` | background, border-bottom |
| `routes/deal-detail.tsx` | `PageFrame` | `.page` | background, border-bottom |
| `routes/deal-detail.tsx` | `PageFrame` | `.embedded` | background, border-bottom |
| `routes/deals.tsx` | `Skeleton` | `.loadingCard` | background |
| `routes/deals.tsx` | `Skeleton` | `.loadingCard` | background |
| `routes/deals.tsx` | `Button` | `.colunaNome` | color, font-size, font-weight |
| `routes/deals.tsx` | `Skeleton` | `.loadingCard` | background |
| `routes/deals.tsx` | `MenuButton` | `.cardMenu` | color |
| `routes/deals.tsx` | `Button` | `.moveDropZone` | box-shadow, outline, outline-offset, transition |
| `routes/files.tsx` | `Skeleton` | `.cardLoading` | border-radius, corner-shape |
| `routes/forms.tsx` | `Skeleton` | `.cardLoading` | border-radius, corner-shape |
| `routes/inbox.tsx` | `Button` | `.recentConversation` | color, font-size, font-weight |
| `routes/page-builder.tsx` | `Button` | `.catalogItem` | background, border-radius, color, corner-shape |
| `routes/pages.tsx` | `Skeleton` | `.cardLoading` | border-radius, corner-shape |
| `routes/widget.tsx` | `Button` | `.launcher` | background, border-radius, box-shadow, color |
| `routes/widget.tsx` | `Button` | `.close` | background, color |
| `routes/widget.tsx` | `Button` | `.send` | background, color, opacity |

## 2. Padrões desenhados à mão nas telas

Agrupado pelo tipo de elemento (pelo nome da classe). Cada grupo deve ter **um** componente no design system; todas as telas usam ele.

| Padrão | Declarações | Telas que redesenham |
|---|---|---|
| Outro | 526 | `routes/deal-detail.module.css` (113), `routes/deals.module.css` (69), `routes/inbox.module.css` (59), `routes/automation-builder.module.css` (39), `routes/contact-detail.module.css` (28), `routes/admin-appearance.module.css` (23), `routes/login.module.css` (23), `routes/activities.module.css` (15), `routes/security.module.css` (14), `routes/admin-permission-groups.module.css` (13), `crm/phase-fields.module.css` (11), `routes/app-layout.module.css` (11), `routes/integrations.module.css` (10), `routes/admin-stage-fields.module.css` (9), `routes/admin-home.module.css` (9), `routes/campaigns.module.css` (8), `routes/page-builder.module.css` (8), `routes/contact-profile-layout.module.css` (8), `routes/admin-users.module.css` (7), `routes/company-detail.module.css` (6), `routes/dashboard.module.css` (6), `routes/widget.module.css` (5), `routes/files.module.css` (4), `routes/catalog.module.css` (4), `routes/social.module.css` (4), `routes/admin-teams.module.css` (4), `routes/companies.module.css` (4), `routes/contacts.module.css` (3), `routes/public-form.module.css` (3), `routes/contact-import.module.css` (2), `routes/form-builder.module.css` (2), `crm/RelatedRecords.module.css` (1), `routes/public-page.module.css` (1) |
| Card, painel, folha | 205 | `routes/automation-builder.module.css` (52), `routes/page-builder.module.css` (16), `routes/inbox.module.css` (15), `routes/deal-detail.module.css` (14), `routes/contact-import.module.css` (13), `routes/admin-appearance.module.css` (9), `routes/admin-home.module.css` (9), `routes/automations.module.css` (9), `routes/security.module.css` (8), `routes/integrations.module.css` (7), `routes/login.module.css` (6), `routes/company-detail.module.css` (6), `routes/widget.module.css` (6), `routes/pages.module.css` (5), `routes/forms.module.css` (5), `crm/RelatedRecords.module.css` (4), `routes/admin-permission-groups.module.css` (4), `routes/files.module.css` (4), `routes/dashboard.module.css` (4), `routes/form-builder.module.css` (4), `routes/contact-profile-layout.module.css` (3), `routes/deals.module.css` (2) |
| Campo e busca | 87 | `crm/StageSettings.module.css` (24), `routes/form-builder.module.css` (17), `routes/deals.module.css` (12), `routes/inbox.module.css` (11), `routes/deal-detail.module.css` (11), `routes/admin-appearance.module.css` (4), `routes/automation-builder.module.css` (4), `routes/integrations.module.css` (2), `routes/widget.module.css` (2) |
| Cabeçalho e título | 79 | `routes/deal-detail.module.css` (21), `routes/inbox.module.css` (10), `crm/RelatedRecords.module.css` (9), `routes/automation-builder.module.css` (7), `routes/integrations.module.css` (7), `routes/catalog.module.css` (6), `routes/widget.module.css` (6), `routes/form-builder.module.css` (5), `routes/admin-appearance.module.css` (3), `routes/page-builder.module.css` (3), `routes/deals.module.css` (2) |
| Linha de lista / item | 67 | `routes/deal-detail.module.css` (26), `routes/inbox.module.css` (14), `routes/widget.module.css` (11), `routes/admin-appearance.module.css` (4), `routes/page-builder.module.css` (4), `routes/integrations.module.css` (4), `routes/contact-import.module.css` (2), `routes/activities.module.css` (2) |
| Chip, etiqueta, selo | 63 | `routes/deal-detail.module.css` (24), `routes/admin-appearance.module.css` (9), `routes/deals.module.css` (9), `routes/automations.module.css` (6), `routes/inbox.module.css` (5), `routes/automation-builder.module.css` (5), `routes/dashboard.module.css` (2), `routes/social.module.css` (2), `crm/StageSettings.module.css` (1) |
| Botão / ação | 59 | `routes/automation-builder.module.css` (20), `routes/page-builder.module.css` (8), `routes/deal-detail.module.css` (8), `routes/automations.module.css` (7), `routes/widget.module.css` (7), `routes/admin-appearance.module.css` (3), `routes/security.module.css` (3), `crm/phase-fields.module.css` (1), `routes/inbox.module.css` (1), `routes/app-layout.module.css` (1) |
| Estado vazio / carregando | 53 | `routes/inbox.module.css` (15), `routes/deal-detail.module.css` (8), `crm/phase-fields.module.css` (3), `routes/automation-builder.module.css` (3), `routes/deals.module.css` (3), `crm/RelatedRecords.module.css` (2), `routes/admin-users.module.css` (2), `routes/files.module.css` (2), `routes/pages.module.css` (2), `routes/forms.module.css` (2), `routes/page-builder.module.css` (2), `routes/security.module.css` (2), `routes/automations.module.css` (2), `routes/app-layout.module.css` (2), `routes/contact-import.module.css` (1), `routes/public-page.module.css` (1), `routes/contacts.module.css` (1) |
| Navegação / abas | 46 | `routes/app-layout.module.css` (31), `routes/inbox.module.css` (6), `routes/deal-detail.module.css` (5), `routes/security.module.css` (4) |
| Avatar e identidade | 29 | `routes/deal-detail.module.css` (9), `crm/RelatedRecords.module.css` (8), `routes/admin-appearance.module.css` (5), `routes/contact-profile-layout.module.css` (5), `crm/StageSettings.module.css` (1), `routes/admin-teams.module.css` (1) |

## 3. Por arquivo

### `apps/web/app/routes/deal-detail.module.css` — 239

- `.page` — background
- `.page > header:first-child` — background, border-bottom
- `.topo` — background, border-bottom
- `.painel` — background, border, border-radius, corner-shape
- `.headerOutcome` — border-inline-start
- `.followerFaces` — color
- `.followerFaces > span` — outline
- `.trilha` — color, font-size
- `.trilha a` — color
- `.trilha a:hover` — color
- `.linha` — border-top
- `.linha > span` — color, font-size, line-height
- `.linha > strong, .linha > a` — color, font-size, font-weight
- `.linha > a` — color
- `.linha > a:hover` — color
- `.empty` — color, font-size
- `.nota` — background, border, border-radius
- `.nota header` — color, font-size
- `.nota header strong` — color, font-weight
- `.nota p` — font-size, line-height
- `.activityTiming > header > strong` — font-size, font-weight
- `.activityIntervalArrow` — color
- `.stageReview > p` — color, font-size, line-height
- `.stageReviewSummary` — background, border-radius, color
- `.stageReviewSummary span, .stageReviewSummary small` — font-size
- `.stageReviewSummary small` — color
- `.stagePassageList > li > span` — background, border-radius, color
- `.stagePassageList > li > span[data-direction="forward"]` — background
- `.stagePassageList > li > span[data-direction="backward"]` — background
- `.stagePassageList strong` — font-size
- `.stagePassageList small` — color, font-size, line-height
- `.headerOutcome` — border-block-start
- `.bloco` — background, border, border-radius, corner-shape
- `.blocoCabecalho` — border-bottom
- `.blocoTitulo` — font-size, font-weight
- `.blocoContagem` — color, font-size
- `.activityList li` — border-top
- `.activityList li[data-overdue="true"]` — background, border-inline-start
- `.activityList li[data-completed="true"] strong` — color, text-decoration
- `.activityType` — color, font-size, font-weight, text-transform
- `.activityList strong` — font-size
- `.activityList p, .activityList time` — color, font-size
- `.activityList time[data-overdue]` — color, font-weight
- `.conversationList li + li` — border-top
- `.conversationList a` — border-radius, corner-shape
- `.conversationList a:hover, .conversationList a:focus-visible` — background, color
- `.conversationList a > svg` — color
- `.conversationList strong` — font-size, font-weight
- `.conversationList span` — color, font-size
- `.activityHint` — color, font-size
- `.activityContext` — background, border, border-radius, corner-shape
- `.activityContext > strong` — font-size
- `.activityContextItems > span` — background, border, border-radius, color, font-size
- `.daySchedule` — background, border, border-radius, corner-shape
- `.daySchedule > header` — border-bottom
- `.daySchedule > header strong` — font-size, text-transform
- `.daySchedule > header span` — color, font-size
- `.scheduleItem` — border-top
- `.scheduleItem[data-conflict]` — color
- `.scheduleItem time` — color, font-size
- … e mais 69 regras

### `apps/web/app/routes/inbox.module.css` — 136

- `.setupCard` — background, border, border-radius, corner-shape, font-size, line-height
- `.setupCardIcon` — background, border-radius, color, corner-shape
- `.setupCard strong` — color, font-size
- `.setupCard > span:not(.setupCardIcon)` — color
- `.conversationList,.thread,.details` — background, border, border-radius, box-shadow, corner-shape
- `.conversationList > header` — border-bottom
- `.conversationList > header strong` — font-size, font-weight
- `.conversationList > header span` — color, font-size
- `.search` — border-bottom
- `.listControls` — border-bottom, color, font-size
- `.layoutSwitch` — border-inline-end
- `.preview b` — font-size, font-weight
- `.preview small,.preview time` — color, font-size, font-weight
- `.threadHeader` — border-bottom
- `.threadHeader span` — color, font-size
- `.presenceViewer` — border-radius, box-shadow
- `.presenceViewerMore` — color, font-size
- `.typingIndicator` — color, font-size
- `.messages` — background
- `.message` — background, border, border-radius, corner-shape
- `.message[data-direction="outbound"]` — background
- `.message[data-direction="internal"]` — background, border-inline-start-color
- `.message header` — font-size
- `.message time,.message small` — color
- `.message p` — font-size, line-height
- `.attachment` — color, font-size
- `.attachmentImage` — border-radius, corner-shape
- `.attachmentVideo` — border-radius, corner-shape
- `.attachmentFile` — color, font-size
- `.attachmentFile:hover` — text-decoration
- `.attachmentChip` — background, border-radius, color, corner-shape, font-size
- `.windowWarning` — background, border-radius, color, corner-shape, font-size
- `.templatePreview` — background, border-radius, color, corner-shape, font-size
- `.composer` — background, border, border-radius, box-shadow, corner-shape
- `.composer:focus-within` — outline, outline-offset
- `.composer[data-mode="note"]` — background
- `.composerMode,.composerFooter` — color, font-size
- `.replyTools` — background, border, border-radius, box-shadow, corner-shape
- `.assignment` — border-bottom
- `.assignmentRow` — font-size
- `.assignmentRow > span` — color
- `.contactCard > div span` — color, font-size
- `.recentConversation strong` — font-size, font-weight
- `.recentConversation span,.recentEmpty` — color, font-size
- `.metadata div` — font-size
- `.metadata dt` — color
- `.empty,.threadEmpty` — color, font-size
- `.listFirstRun` — color, font-size
- `.listFirstRunIcon` — background, border-radius, color, corner-shape
- `.listFirstRun strong` — color, font-size
- `.listFirstRun > span:nth-of-type(2)` — line-height
- `.threadEmpty > svg` — color
- `.threadEmptyArt` — background, border-radius, corner-shape
- `.threadEmptyArt > span` — background, border-radius, box-shadow, color
- `.threadEmpty strong` — color, font-size
- `.threadEmpty span` — line-height
- `.workspace[data-layout="table"][data-preview-open="true"] .thread` — border-radius, corner-shape
- `.mobileQueueMenu` — background, border-radius, box-shadow, corner-shape
- `.threadActions` — border-inline-start
- `.channelBar` — border-bottom
- … e mais 1 regras

### `apps/web/app/routes/automation-builder.module.css` — 130

- `.editorPage` — background
- `.editorHeader` — border-bottom
- `.runBar` — background, border, border-radius, corner-shape
- `.runBar > div:first-child span, .runList small` — color, font-size
- `.workspace` — background, border, border-radius, box-shadow, corner-shape
- `.workspace[data-panel="palette"] .panel` — border, border-radius, box-shadow, corner-shape
- `.panel` — animation, background, box-shadow
- `to` — opacity
- `.workspace[data-panel="palette"] .panel` — animation-name
- `to` — opacity
- `.palette, .inspector` — background
- `.palette > header span` — color, font-size, line-height
- `.paletteGroup > strong` — color, font-size
- `.paletteButton small` — color, font-weight
- `.nodeIcon` — background, border-radius, color, corner-shape
- `.paletteButton[data-type="trigger"] .nodeIcon` — background, color
- `.paletteButton[data-type="condition"] .nodeIcon` — background, color
- `.paletteButton[data-type="action"] .nodeIcon` — background, color
- `.paletteButton[data-type="wait"] .nodeIcon` — background, color
- `.validation` — background, border-radius, corner-shape
- `.validation strong` — font-size
- `.validation span` — color, font-size, line-height
- `.validation span[data-valid="true"]` — color
- `.canvas` — background
- `.zoomControls > button` — background, border, border-radius, box-shadow, corner-shape
- `.canvasAdd` — background, border-radius, box-shadow, color
- `.canvasAdd:hover:not([data-disabled])` — background
- `.edges path` — stroke
- `.edges path[data-branch="sim"]` — stroke
- `.edges path[data-branch="não"]` — stroke
- `.node` — background, border, border-radius, box-shadow, corner-shape, transition
- `.node:hover` — border-color, box-shadow
- `.node[data-selected="true"]` — border-color, box-shadow
- `.node > header` — border-radius, color, letter-spacing, text-transform
- `.node[data-type="trigger"] > header` — background
- `.node[data-type="condition"] > header` — background
- `.node[data-type="action"] > header` — background
- `.node[data-type="wait"] > header` — background
- `.node > header .nodeIcon` — border-radius, corner-shape
- `.node > header .nodeIcon` — color
- `.node > strong` — font-size
- `.node p` — color, font-size, line-height
- `.node .nodePort` — border-radius
- `.nodePort::before` — background, border, border-radius, box-shadow, transition
- `.nodePort:hover::before, .nodePort[data-connecting]::before` — border-color, box-shadow
- `.nodePort[data-branch="sim"]::before` — border-color
- `.nodePort[data-branch="não"]::before` — border-color
- `.node .inputPort::before` — border-color, box-shadow
- `.nodeOutputLabel, .nodeOutputHint` — color, font-size, font-weight
- `.nodeOutputLabel` — letter-spacing, text-transform
- `.nodeOutputHint` — transition
- `.nodeOutput:hover .nodeOutputHint, .nodeOutput:focus-within .nodeOutputHint` — opacity
- `.canvasEmpty` — color
- `.canvasEmpty strong` — color, font-size
- `.inspector[data-type="trigger"] > header` — background
- `.inspector[data-type="condition"] > header` — background
- `.inspector[data-type="action"] > header` — background
- `.inspector[data-type="wait"] > header` — background
- `.inspector > header strong` — color, font-size
- `.inspectorType` — color, font-size, font-weight, letter-spacing, text-transform
- … e mais 6 regras

### `apps/web/app/routes/deals.module.css` — 97

- `.toolbar` — border-bottom
- `.loadingCard` — background
- `.coluna` — background, border-radius, corner-shape
- `.coluna[data-outcome="won"]` — background
- `.coluna[data-outcome="lost"]` — background
- `.coluna[data-outcome="won"] .colunaNome` — color
- `.coluna[data-outcome="lost"] .colunaNome` — color
- `.colunaNome` — font-size, font-weight
- `.colunaTotal` — color, font-size
- `.cartao` — background, border, border-radius, box-shadow, corner-shape, transition
- `.cartao:hover` — box-shadow
- `.cartaoArrastando` — opacity, transition
- `.dragPreview` — background, border, border-radius, box-shadow, color, corner-shape, font-size, font-weight, opacity
- `.colunaSobreArraste` — outline, outline-offset, transition
- `.cartaoNome` — color, font-size, font-weight
- `.cartaoNome:hover` — color
- `.cartaoValor` — color, font-size, font-weight
- `.cartaoMeta` — color, font-size
- `.cartaoRodape` — border-top
- `.cartaoBadge` — border-radius, font-size, font-weight
- `.cartaoBadgeGanho` — background, color
- `.cartaoBadgePerdido` — background, color
- `.cartaoBadgeArquivado` — background, color
- `.moveBar` — background, border, border-radius, box-shadow, corner-shape
- `.moveDropZone` — transition
- `.moveDropZone[data-drag-over="true"]` — box-shadow, outline, outline-offset
- `.duplicateDealsList` — color, font-size
- `.cartaoPasso` — color, font-size
- `.cartaoPassoPonto` — background, border-radius
- `.cartaoPasso[data-state="overdue"]` — color
- `.cartaoPasso[data-state="overdue"] .cartaoPassoPonto` — background
- `.cartaoPasso[data-state="scheduled"] .cartaoPassoPonto` — background
- `.editorLinha` — background, border-radius, corner-shape, transition
- `.editorLinhaArrastando` — opacity
- `.editorAlca` — color
- `.editorNome` — font-size
- `.editorVazio` — color, font-size
- `.editorLinha` — transition-duration
- `.editorConfigVazio` — color, font-size
- `.cartao` — border-radius, corner-shape
- `.cartaoNome` — line-height
- `.cardMenu` — color
- `.coluna` — border-top
- `.coluna[data-color="blue"]` — border-top-color
- `.coluna[data-color="green"], .coluna[data-outcome="won"]` — border-top-color
- `.coluna[data-color="red"], .coluna[data-outcome="lost"]` — border-top-color
- `.coluna[data-color="amber"]` — border-top-color
- `.coluna[data-color="purple"]` — border-top-color
- `.coluna[data-color^="#"]` — border-top-color
- `.cartao:focus-within` — outline, outline-offset
- `.cartaoValor` — font-weight

### `apps/web/app/routes/admin-appearance.module.css` — 60

- `.colorLabel small` — color, font-size, line-height
- `.colorField input` — background, border, border-radius, corner-shape
- `.preview` — background, border, border-radius, box-shadow, corner-shape
- `.previewHeader` — color, font-size, font-weight
- `.previewDot` — background, border-radius
- `.previewCanvas` — background, color, font-family
- `.previewLogo` — color, font-family, font-size, font-weight, letter-spacing
- `.previewAvatar` — background, border-radius, color, font-size, font-weight
- `.previewEyebrow` — color, font-size, font-weight, letter-spacing
- `.previewBody h2` — font-family, font-size, line-height
- `.previewBody p` — color, font-size
- `.previewCard` — background, border, border-radius, box-shadow, corner-shape
- `.previewCard strong` — font-family, font-size
- `.previewCard > span:last-of-type` — color, font-size
- `.previewBadge` — background, border-radius, color, corner-shape, font-size, font-weight
- `.previewProgress` — background, border-radius
- `.previewProgress i` — background
- `.previewAction` — background, border-radius, color

### `apps/web/app/routes/app-layout.module.css` — 45

- `.shell` — background, color
- `.shell` — transition
- `.rail` — transition
- `.railIndicator` — background, border, border-radius, box-shadow
- `.railBrand` — border-radius, color
- `.railBrand:focus-visible` — box-shadow
- `.railPin` — color
- `.railPin:hover, .railPin:focus-visible` — color
- `.rail[data-expanded] .brandWordmark` — opacity
- `.conteudo` — background, border, border-radius, box-shadow, corner-shape
- `.conteudo > :not(.moduleTabs, .sendQueueNotice)` — animation
- `.shell[data-navigating] .conteudo::before` — background
- `.moduleTabs` — background, border-bottom
- `.moduleTab` — color, font-size, font-weight
- `.moduleIndicator` — background, border-radius, transition
- `.moduleTab:hover, .moduleTab[data-pending]` — color
- `.moduleTab[aria-current="page"], .moduleTab[data-pending], .moduleTab:active` — color
- `.moduleTab:focus-visible` — border-radius, box-shadow
- `.railPlaceholder` — animation, background, border-radius
- `.loadingContent` — color, font-size
- `.rail` — border-radius
- `.railBottom` — border-left
- `.mobileSecondaryNav` — background, border, border-radius, box-shadow
- `.rail .brandSymbol` — opacity

### `apps/web/app/routes/page-builder.module.css` — 41

- `.workspace` — border-top
- `.toolPanel` — background, border-right
- `.panelTabs` — background, border-bottom
- `.panelTabs > button` — border-bottom, color, font-weight, transition
- `.panelTabs > button[aria-pressed="true"]` — border-bottom-color, color
- `.panelTabs > button:hover:not([data-disabled])` — background, color
- `.panelSection h2` — font-size, font-weight
- `.panelSection p` — color, font-size
- `.catalogItem > :first-child` — background, border-radius, color, corner-shape
- `.catalogCopy strong` — color, font-size
- `.catalogCopy small` — color, font-size, font-weight, line-height
- `.block, .blockActive` — background, border, border-radius, corner-shape, transition
- `.block:hover, .blockActive` — background
- `.blockActive` — border-color, box-shadow
- `.empty` — color, font-size
- `.preview` — background
- `.previewHeader` — border-bottom
- `.previewHeader > span` — font-size, font-weight

### `apps/web/app/routes/widget.module.css` — 37

- `.launcher` — background, border-radius, box-shadow, color
- `.launcher:hover:not([data-disabled])` — background
- `.panel` — animation, background, border, border-radius, box-shadow, corner-shape
- `.header` — background, color
- `.header strong` — font-size, font-weight
- `.header span` — color, font-size
- `.close` — color
- `.close:hover:not([data-disabled])` — background
- `.messages` — background
- `.bubble` — border-radius, corner-shape, font-size, line-height
- `.bubble[data-from="team"]` — background, border-end-start-radius, box-shadow
- `.bubble[data-from="visitor"]` — background, border-end-end-radius, color
- `.composer` — background, border-top
- `.send` — background, color
- `.send:hover:not([data-disabled])` — background, opacity
- `.send[disabled]` — opacity

### `apps/web/app/routes/security.module.css` — 31

- `.card` — background, border, border-radius, corner-shape
- `.explanation` — color, font-size, line-height
- `.loadError` — color, font-size
- `.cardHeader h2` — font-size, font-weight
- `.cardHeader p, .instructions p, .factor span` — color, font-size
- `.factor` — border-top
- `.qrCode` — border-radius, corner-shape
- `.step` — background, border-radius, color, font-weight
- `.secret` — color, font-size
- `.secret code` — color, font-size
- `.sessionDetails` — border-top
- `.sessionDetails span` — color, font-size
- `.sessionDetails strong` — font-size
- `.sessionActions` — border-top
- `.sessionActions p` — color, font-size

### `apps/web/app/routes/integrations.module.css` — 30

- `.providerCard` — background, border, border-radius, corner-shape, transition
- `.providerCard:hover` — border-color, box-shadow
- `.providerHeading h3` — font-size, font-weight
- `.providerHeading p` — color, font-size, line-height
- `.providerIcon` — background, border-radius, color, corner-shape
- `.providerMeta` — color, font-size
- `.connectionInfo` — color, font-size
- `.connectionInfo small` — color
- `.connectionInfo strong` — color, font-size, font-weight
- `.connectionRow` — background, border, border-radius, corner-shape
- `.fieldHint` — color, font-size

### `apps/web/app/routes/login.module.css` — 29

- `.container` — background
- `.intro` — background, border-right
- `.titulo` — font-family, font-size, font-weight, letter-spacing, line-height
- `.subtitulo` — color, font-size, line-height
- `.rodape` — color, font-size
- `.access` — background
- `.cardHeader h2` — font-family, font-size, font-weight
- `.cardHeader p` — color, font-size
- `.textLink, .returnLink` — color, font-size, font-weight
- `.success` — color, font-size
- `.erroGeral` — color, font-size
- `.container` — background
- `.intro` — background
- `.cardHeader h2` — font-size

### `apps/web/app/routes/contact-detail.module.css` — 28

- `.campos` — background, border, border-radius, corner-shape
- `.rotulo` — color, font-size
- `.valor` — font-size
- `.subtitulo` — font-size, font-weight
- `.atividade` — background, border, border-radius, corner-shape
- `.atividadeConcluida` — opacity
- `.atividadeTipo` — color, font-size, font-weight, letter-spacing, text-transform
- `.atividadeTitulo` — font-size, font-weight
- `.atividadeConcluida .atividadeTitulo` — text-decoration
- `.atividadeData` — color, font-size
- `.formAtividade` — background, border, border-radius, corner-shape

### `apps/web/app/routes/form-builder.module.css` — 28

- `.workspace` — border-top
- `.editorSection + .editorSection` — border-top
- `.sectionHeading h2` — font-size, font-weight
- `.sectionHeading p` — color, font-size
- `.fieldCard` — background, border, border-radius, corner-shape, transition
- `.fieldCard:focus-within` — border-color, box-shadow
- `.fieldCardHeader > strong` — color, font-size, font-weight
- `.fieldNumber` — background, border-radius, color, corner-shape, font-size, font-weight
- `.preview` — border-left
- `.previewHeader strong` — color, font-size, font-weight
- `.previewHeader span` — color, font-size

### `apps/web/app/crm/StageSettings.module.css` — 26

- `.identity > section + section, .movement > section + section` — border-top
- `.fieldRulesSummary, .help` — color, font-size, line-height
- `.fieldRules` — border, border-radius, corner-shape
- `.fieldRulesHead` — background, border-bottom, color, font-size, font-weight
- `.fieldRule` — border-bottom
- `.fieldRule:hover` — background
- `.fieldRule[data-active]` — background
- `.fieldRuleName strong` — font-size, font-weight
- `.fieldKind` — color, font-size
- `.fieldRulesEmpty` — color, font-size
- `.newField` — background, border-radius, corner-shape
- `.newFieldHeader` — font-size
- `.fieldRule > label > span:last-child` — font-size

### `apps/web/app/crm/RelatedRecords.module.css` — 24

- `.root` — background
- `.relationBlock` — background, border, border-radius, corner-shape
- `.relationHeader h2` — color, font-size, font-weight
- `.relationHeader p` — color, font-size
- `.profileSummary` — background
- `.profileHeading strong` — color, font-size, font-weight
- `.profileHeading span, .profileFacts dt` — color, font-size
- `.profileFacts dd` — color, font-size
- `.emptyRelation` — color, font-size
- `.relationHeader p` — line-height
- `.relationDescription` — color, font-size, line-height

### `apps/web/app/routes/automations.module.css` — 24

- `.cardLink` — border-radius, corner-shape
- `.cardLink > section` — transition
- `.cardLink:hover > section` — box-shadow
- `.cardLink:focus-visible` — outline, outline-offset
- `.cardTriggers span` — background, border-radius, color, corner-shape, font-size
- `.cardTriggers svg` — color
- `.cardLink .cardTriggers svg` — color
- `.cardMeta` — color, font-size
- `.cardMeta .runCount` — color, font-size, font-weight
- `.runCount small` — color, font-size, font-weight
- `.cardMeta svg` — color
- `.empty` — color, font-size

### `apps/web/app/routes/contact-import.module.css` — 18

- `.sectionTitle` — border-bottom
- `.sectionTitle h2` — font-size, font-weight
- `.sectionTitle > span` — color, font-size
- `.uploadSection p, .fileName, .previewNotice` — color, font-size
- `.fileName` — color, font-weight
- `.error` — color
- `.summary` — border-block
- `.summary div + div` — border-inline-start
- `.summary span` — color, font-size
- `.summary strong` — font-size
- `.rowIssue` — color, font-size
- `.summary div + div` — border-block-start

### `apps/web/app/routes/admin-home.module.css` — 18

- `.card` — border, border-radius, color, corner-shape, transition
- `.card:hover` — background, box-shadow
- `.card:focus-visible` — outline, outline-offset
- `.icon` — background, border-radius, color, corner-shape
- `.copy strong` — font-size, font-weight
- `.copy span` — color, font-size, line-height

### `apps/web/app/routes/admin-permission-groups.module.css` — 17

- `.groupSummary strong` — font-size, font-weight
- `.groupSummary span` — color, font-size
- `.feedback` — color, font-size
- `.capabilityGroup` — background, border, border-radius, corner-shape
- `.capabilityGroup h3` — border-bottom, color, font-size, font-weight
- `.capabilityLegend` — color, font-size, font-weight

### `apps/web/app/routes/activities.module.css` — 17

- `.periods` — border-bottom
- `.periodOption strong` — color, font-size
- `.typeIcon` — background, border-radius, color, corner-shape
- `.secondary` — color, font-size
- `.overdue` — color, font-weight
- `.calendarActivity > strong` — font-size, font-weight
- `.calendarActivity > span:not(.calendarTime)` — color, font-size
- `.calendarTime` — color, font-size

### `apps/web/app/routes/contact-profile-layout.module.css` — 16

- `.columnTitle` — font-size, font-weight
- `.profileColumn > div, .profileColumn > form, .profileColumn > section, .workColumn > section, .identityColumn ` — background, border, border-radius, corner-shape
- `.workColumn > section h2, .identityColumn > section h2` — font-size
- `.workColumn > section > ul > li` — border-top
- `.recordLink` — color, font-size, font-weight
- `.recordLink:hover` — color
- `.recordLink strong` — font-weight
- `.recordLink span` — color, font-size, font-weight

### `apps/web/app/crm/phase-fields.module.css` — 15

- `.empty` — color, font-size, line-height
- `.requirement` — color, font-size, font-weight
- `.requirement[data-level="required"]` — color
- `.requirement[data-level="important"]` — color
- `.commercial` — border-top, color
- `.commercial strong` — color, font-size, font-weight
- `.commercial p` — font-size
- `.commercial button` — color

### `apps/web/app/routes/company-detail.module.css` — 12

- `.details span` — color, font-size
- `.details > div` — border-bottom
- `.details strong, .details a` — color, font-size, font-weight
- `.relationCard li` — border-top
- `.relationCard li a` — color, font-size, font-weight
- `.relationCard li span, .empty` — color, font-size

### `apps/web/app/routes/dashboard.module.css` — 12

- `.reportFilters` — border-bottom
- `.filterLabel` — color, font-size
- `.sectionHeading h2` — font-size, font-weight
- `.sectionHeading span` — color, font-size
- `.metricLink` — border-radius, corner-shape
- `.metricLink:hover` — box-shadow
- `.metricLink:focus-visible` — outline, outline-offset

### `apps/web/app/routes/files.module.css` — 10

- `.fileIcon` — background, border-radius, color, corner-shape
- `.cardBody` — color, font-size
- `.cardLoading` — border-radius, corner-shape
- `.empty` — color, font-size

### `apps/web/app/routes/catalog.module.css` — 10

- `.productDescription` — color, line-height
- `.productFacts dt` — color, font-size
- `.productFacts dd` — font-weight
- `.variantsHeading` — border-bottom
- `.variantsHeading h3` — font-size
- `.variantsHeading span` — color, font-size
- `.noVariants` — color

### `apps/web/app/routes/admin-users.module.css` — 9

- `.email` — color, font-size, line-height
- `.feedback` — color, font-size
- `.error` — color, font-size
- `.emailCheck` — color, font-size

### `apps/web/app/routes/admin-stage-fields.module.css` — 9

- `.linha` — border-bottom
- `.linha[data-head="true"]` — color, font-size, font-weight
- `.campo` — font-size
- `.campo small` — color, font-size
- `.nota` — color, font-size

### `apps/web/app/routes/campaigns.module.css` — 8

- `.delivery strong` — font-size, font-weight
- `.preview` — background, border-radius, color, corner-shape
- `.preview strong` — color, font-size

### `apps/web/app/routes/pages.module.css` — 7

- `.cardMeta` — color, font-size
- `.cardMeta svg` — color
- `.cardLoading` — border-radius, corner-shape
- `.empty` — color, font-size

### `apps/web/app/routes/forms.module.css` — 7

- `.cardMeta` — color, font-size
- `.cardMeta svg` — color
- `.cardLoading` — border-radius, corner-shape
- `.empty` — color, font-size

### `apps/web/app/routes/social.module.css` — 6

- `.channelName span, .counter` — color, font-size
- `.calendarPost strong` — font-size, font-weight
- `.calendarPost > span` — color, font-size

### `apps/web/app/routes/admin-teams.module.css` — 5

- `.memberAvatars > span` — border
- `.memberNames` — color, font-size
- `.members p` — font-size, font-weight

### `apps/web/app/routes/contacts.module.css` — 4

- `.secondary, .muted` — color, font-size
- `.secondary` — line-height
- `.savedViewsEmpty` — color

### `apps/web/app/routes/companies.module.css` — 4

- `.secondary` — color, font-size, font-weight, line-height

### `apps/web/app/routes/public-form.module.css` — 3

- `.page` — background, color, font-family

### `apps/web/app/routes/public-page.module.css` — 2

- `.frame` — background
- `.loading` — color

