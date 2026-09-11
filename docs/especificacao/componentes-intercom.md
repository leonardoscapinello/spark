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

As cores de hover/foco, indicador laranja da aba (estimado visualmente), botão grande de 40 px, campo completo de 40 px e exibição de senha são extensões iniciais; falta medição independente desses estados. Campo de senha usa a base de Input, sem afirmar inspeção da autenticação do Intercom. Tema escuro, responsividade completa, sidebar recolhível, menus, modal, tabela, combobox e demais componentes ainda exigem suas unidades de implementação e referência. O catálogo é uma bancada de componentes, não uma cópia de uma tela real de Inbox.

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
