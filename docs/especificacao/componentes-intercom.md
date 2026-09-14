# Componentes — referência Intercom

Primeiro conjunto implementado em 11/09/2026, conforme ADR-0033. Catálogo interativo no Storybook: `Fundamentos/Catálogo Intercom`. Os exemplos consomem os componentes reais, sem variantes exclusivas da demonstração. Formulário do catálogo valida localmente e não persiste dados.

## Medidas observadas nesta unidade

Fonte: Inbox aberto e modal «Criar visualização», consultados via DOM renderizado e estilos computados, incluindo Shadow DOM. Modal fechado por Cancelar sem salvar.

| Componente/estado | Evidência |
| --- | --- |
| Botão padrão | Inter 14/16 px, peso 600, altura 32 px, padding 8 × 12 px, raio 9999 px |
| Botão pequeno | Inter 13/16 px, altura 24 px, padding 4 × 8 px |
| Primário | Fundo #222222, texto #fafaf7 |
| Secundário | Fundo #f8f8f7, texto #1a1a1a |
| Ação por ícone | 24 ou 32 px; ícone 16 px; círculo |
| Item da sidebar | Altura 32 px, padding 4 × 12 px, raio 8 px; regular 400 e selecionado 600 |
| Item selecionado | Branco; contorno por sombra #e9eae6 de 1 px + 0 1px 4px rgba(20,20,20,.15) |
| Sidebar | Largura 236 px; fundo #fbfbf9, raio 16 px, sombra curta |
| Abas Detalhes/Copiloto | 42 px de altura, fonte 14/20 px, peso 600, padding vertical 10 px; texto inativo #646462 |
| Cabeçalho do acordeão | Fonte 14/21 px, peso 600, padding 12 × 24 px, gap 16 px |
| Campo do modal | Fonte 14/20 px, campo interno 38 px, padding 8 px, raio direito 7 px; envolve seletor de ícone separado |

## Entrega e limites

- `Button`: primário, secundário, ghost e elevado; tamanhos, ícones, loading, disabled, pill e retangular.
- `Input`, `Field`, `Label`, `ErrorText`: componentes existentes alinhados à base; `PasswordInput`, `Form`, `FieldDescription` e `FormActions` compõem o mesmo conjunto.
- `Sidebar`, `SidebarSection`, `SidebarItem`, `NavigationRail`: navegação compartilhada com seleção e contador.
- `Tabs`: painéis, seleção controlada ou interna, teclado e estado desabilitado.
- `Accordion`: seções independentes, controle externo opcional e teclado.
- `Icon`: conjunto inicial de desenhos locais de 16 px; silhuetas ainda não representam reprodução exata dos ícones do Intercom.

As cores de hover/foco, botão grande de 40 px, campo completo de 40 px e exibição de senha são extensões iniciais; falta medição independente desses estados. Campo de senha usa a base de Input, sem afirmar inspeção da autenticação do Intercom. Tema escuro, responsividade completa, sidebar recolhível, menus, modal, tabela, combobox e demais componentes ainda exigem suas unidades de implementação e referência. O catálogo é uma bancada de componentes, não uma cópia de uma tela real de Inbox.

Todos os valores novos de estilo estão em tokens. Ícones usam geometria SVG própria. A futura migração das telas precisa preservar leitura local, regras de core e integração real; o catálogo não substitui essas funcionalidades.

## Segunda unidade: controles interativos para aplicação

A biblioteca agora exporta menu composto (`Menu`, `MenuTrigger`, `MenuContent`, itens, grupos, separadores, checkbox e submenu), `DropdownButton`, `SplitButton`, `Select` simples/múltiplo, `SearchSelect`, popover composto, modal/painel lateral, tooltip, checkbox, switch, rádio, textarea, badge, etiqueta removível, alerta e skeleton. A vitrine usa exatamente essas exportações. Conteúdo, opções, estado e callbacks vêm do consumidor; nenhuma chamada a dados de demonstração faz parte do componente de produção.

Menus, popovers, seleção e modais usam Base UI para teclado, foco, portais e fechamento. O estado pode ser controlado pelo consumidor; selects e controles de escolha recebem `name` e se integram a formulário. O componente não publica, persiste ou calcula regras de negócio: o callback conecta a ação ao módulo responsável. O catálogo informa resultados locais somente para exercitar esse contrato.

Medição adicional no menu «Mais opções» do Intercom: raio externo 12 px, padding 8 px, fundo branco, sombra `0 8px 16px rgba(20,20,20,.15)`, itens de 32 px com padding 6 × 8 px e raio 8 px; animação de entrada computada 150 ms. Largura depende dos rótulos. O tempo observado foi incorporado ao token de popup. Curva e escala são implementações de interação, ainda sem prova de equivalência quadro a quadro ao Intercom.

Abas têm indicador animado por clip-path; acordeões animam altura medida pelo primitivo e opacidade. Menus/popovers/modal usam transições de entrada/saída interrompíveis, com origem no gatilho quando ancorados. Movimento reduzido remove deslocamento e conserva feedback. Switch tem deslocamento do thumb. Não se aplica atraso artificial a ações.

Ainda há trabalho de paridade: ícones exatos, hover/foco medidos sistematicamente, tabela com seleção/resize/reordenação, calendário próprio, editor rico, uploader, toast, estados de rede, mobile e tema escuro. Esses itens não são declarados entregues pela ampliação do catálogo.

## Correção de geometria — dropdown e popover

`SplitButton` identifica seus dois segmentos explicitamente. Não usa `:first-child`/`:last-child`, pois os guards de foco inseridos pelo Base UI mudam a posição do gatilho na árvore enquanto o menu está aberto. Verificação no navegador: segmento de menu com 32 × 32 px e raio `0 9999px 9999px 0` tanto fechado quanto aberto. A forma retangular também é transmitida aos dois segmentos.

`MenuButton` compõe o mesmo Button com menu: texto sem indicador, texto com ícone e indicador, variantes e tamanhos existentes. Catálogo e histórias incluem as formas e o split em carregamento. Separadores pertencem ao conteúdo do menu; não dependem de texto ou ícones fictícios.

Popover de formulário tem título e corpo próprios, largura de 320 px limitada ao espaço disponível e padding de 20 px. Medição do exemplo de filtro: 21 px da borda externa até o conteúdo em ambos os lados (20 px internos + borda de 1 px). Estes valores corrigem a composição reportada pelo usuário; não constituem nova prova de paridade completa com o Intercom.

## Cores de marca e semântica

Conforme ADR-0034, acentos, indicador de aba, foco e botão primário usam os azuis da marca existente. A referência Intercom orienta estrutura e interação, sem substituir a marca. Laranja/âmbar permanece permitido para atenção por `color.statusWarning`. Os componentes recebem conteúdo e callbacks por props e consomem os tokens compartilhados; não se cria uma versão exclusiva para o catálogo.

## Consolidação do inventário — 13/09/2026

Conferência do que as seções anteriores listavam como pendente, item por item, contra o código de `packages/ui-web/src`. A lista antiga era de 11/09 e envelheceu: parte já existia.

| Pendência listada antes | Estado hoje | Onde |
| --- | --- | --- |
| Calendário próprio | Entregue | `CalendarMonth`, `CalendarWeek`, `DateTimePicker` |
| Uploader | Entregue | `FilePicker` |
| Toast | Entregue | `Notification`, `Toast` |
| Estados de rede | Entregue na tabela | `DataTable` tem `state` de carregamento, erro e vazio |
| Tabela com seleção | Entregue | `DataTable` com `selectedIds`/`onSelectionChange` |
| Tabela com escolha de colunas | Entregue | `ColumnCatalog`, pelo `+` no fim do cabeçalho (captura 030) |
| Tabela com resize de coluna | Entregue | `ColumnResizer`, alça no cabeçalho, com teclado |
| Tabela com reordenação de coluna | Entregue | arrasto do cabeçalho, ou Control com as setas |
| Editor rico | **Falta** | nenhum equivalente no pacote |
| Ícones exatos | **Falta** | `Icon` usa silhuetas próprias, não reprodução |
| Hover/foco medidos sistematicamente | **Falta** | medições existem para alguns estados, não para todos |
| Tema escuro | **A avaliar** | `packages/tokens` já compila a paleta escura; [ADR-0033](../adr/0033-interface-fiel-intercom.md) registra o tema como provisório e sem referência |
| Mobile | **Parcial** | tabela e atendimento adaptam; falta a varredura por tela |

### Colunas e seleção

Ambos são controlados pela tela: a tabela informa o que mudou e não guarda preferência. Isso mantém a decisão de escopo — sessão, usuário ou visualização salva — fora do componente, e deixa as ações em lote com quem conhece a política de acesso ([ADR-0029](../adr/0029-paineis-e-grupos-de-permissao.md)).

A seleção é indexada por `rowKey`, então ordenar não a desfaz. Uma coluna marcada `alwaysVisible` não pode ser escondida, e ordenar por coluna escondida deixa de valer.

A largura é arrastada pela alça na borda direita do cabeçalho, que responde no *pointer-down* — a coluna acompanha o ponteiro, não espera o release. A mesma alça é um `separator` focável: setas ajustam de 16 px, `Home` devolve a largura automática, e a largura mínima é 64 px. A tabela só troca para `table-layout: fixed` depois do primeiro ajuste, e nesse modo as células são `border-box`, para a medida arrastada ser exatamente a medida renderizada.

A reordenação é por arrasto do cabeçalho ou por `Control`/`Command` com as setas. Ela opera sobre a lista completa de colunas, não sobre a visível: uma coluna escondida entre duas visíveis não engole o movimento, e uma coluna nova que a ordem ainda não conhece entra no fim em vez de sumir. `moveColumn` e `applyColumnOrder` ficam em `columnOrder.ts`, testados à parte.

Diferenças conhecidas em relação à captura 030: os itens do catálogo ainda não têm ícone por coluna, e o popover tem título visível em vez de apenas o campo de busca. Nenhuma medição independente do popup de colunas da Intercom foi feita — a composição segue o primitivo `Popover` já existente. O comportamento de largura também não foi medido contra a Intercom: com `table-layout: fixed` a tabela ocupa 100 % da largura disponível e ajustar uma coluna redistribui o resto, em vez de fazer a tabela crescer e rolar.

## Passada de fidelidade — 14/09/2026

Medido contra as capturas 028 (tabela de atendimento) e 031 (modal "Criar visualização") e contra `medidas-inbox-shadow-dom.json`. Cada linha foi corrigida **no componente**, então vale em todas as telas (ADR-0020). Valores em px; "antes" é o que o app mostrava antes desta passada.

| Elemento | Intercom | Antes | Agora | Onde |
|---|---|---|---|---|
| Linha de título | 64, sem risco embaixo, ~8 até a barra | 64 + hairline, 16 até a barra | 64, sem risco, 8 | `PageFrame` |
| Título | 20/600, linha 32 | 19/600 | 19/600 (1 px, mantido) | `PageHeader` |
| Campo de busca | ~220 × 32 | 320 × 40 | 220 × 32 | `CollectionToolbar` re-escopa `--ui-fieldHeight` |
| Campo com ícone | mesma altura do campo simples | 2 px mais alto | igual | `Input` `.adorned` é o campo (border-box) |
| Foco em campo | um anel | 2–3 anéis (borda + outline com gap + outline do navegador) | um anel: borda + sombra encostada | `Input` (`:focus`, não `[data-focused]`), `surfaces .trigger` |
| Busca → filtros | hairline vertical, 16 de cada lado | gap 8 | 16 · hairline · 16 | `CollectionToolbar` |
| Chip de filtro | pílula 32 | 32 | 32 | já batia |
| Cabeçalho da tabela | 40, 14/600 apagado | ~30, 13/500 | 40, 14/600 apagado | `DataTable` |
| Linha da tabela | 14/400, ~16 de respiro (66 com avatar) | 12 de padding (~46) | 16 de padding (53) | `DataTable` |
| Botões | pílula 32, 14/600, 8 × 12 | igual | igual | `Button` |
| Modal | 640, raio 12, cabeçalho 64 + hairline, título 16, corpo 24, rodapé 64 + hairline | 560, raio 16, cabeçalho 24 solto, título 19 | igual à Intercom | `Modal`, token `--ui-modalWidth` |
| Item da navegação lateral | 212 × 32, 4 × 12, raio 8, selecionado branco | igual | igual | `Sidebar` |

| Sidebar do módulo | título 64, primeiro item colado, seções a 12, cabeçalho de seção 32 | 16+16 no título, 24 na primeira seção, cabeçalho ~40 | igual à Intercom | `Sidebar` |
| Item selecionado da sidebar | sombra íntegra com vizinho em hover | hover do vizinho cobria a sombra | selecionado acima dos irmãos (`z-index`) | `Sidebar` |
| Filtros da coleção | Intercom: visão + filtro em modal; Pipedrive: construtor com grupos E/OU | chips soltos que empilhavam e empurravam a busca | pílula «Filtros · N» → construtor com grupos, E/OU, calendário, seleção múltipla | `FilterBar`, `core/filter` |

| Kanban do CRM (Pipedrive 020) | coluna ~280/8/raio 8, card 264 raio 8 pad 8 gap 4, nome 16/600, soma 13 | coluna 320/16/raio 16, card raio 10 pad 12 gap 8 | igual ao Pipedrive; token `--ui-kanbanColumnWidth` | `deals.module.css` |
| Herói do perfil (051) | avatar 72, nome 24/600, metadados 14 | nome 19, metadados 12 | igual | `RecordHero` |
| Cartão de detalhes do perfil (051) | raio 8, 16, linha «rótulo · valor» 14 | raio 10, 24, rótulo caixa alta 12 sobre valor 16 | igual | `contact-detail.module.css` |
| «Buscar conversas» (Atendimento) | item de navegação 32, 8 de respiro | parecia campo cinza colado no item | `SidebarItem` botão | `Sidebar`, `inbox.tsx` |
| Módulo selecionado no rail | anel íntegro; hover sutil | anel decepado pelo overflow; hover = selecionado | folga de 8px na lista; hover cinza | `app-layout.module.css` |
| Linha de filtros da lista de conversas | 40 (chips 24, 8/16) | 44, 12 lateral | 40, 8/16 | `inbox.module.css` |

Armadilha registrada: o Base UI só marca `data-focused` dentro de `<Field>`. Estilo de foco que dependa do atributo falha em toda barra de busca (que fica fora de `Field`) e deixa o outline padrão do navegador aparecer. Usar `:focus`/`:focus-within` reais.

Ainda diferente e deixado de propósito: a tabela da Intercom assenta sobre fundo `surface2` com a linha selecionada em cartão branco; a nossa é branca com seleção em `accentWash`. Mudança de linguagem, não de medida — decidir em ADR antes de mexer.
