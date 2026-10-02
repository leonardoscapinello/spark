# Mapa de superfícies e sobrescritas — 2026-10-02

Escopo: componentes compartilhados e consumidores TSX/CSS de apps/web/app. Varredura de className de Button, MenuButton, ModalContent, PanelContent, PopoverContent, Select e SearchSelect; regras globais, !important, portais e superfícies flutuantes. Revisão por função; não tratamos responsividade ou estado explícito como erro de cascata.

## Conflitos corrigidos

| Origem | Conflito | Contrato final |
|---|---|---|
| Modal / GlassBackdrop | Fade do ancestral e dos filhos; blur perde a página durante a composição | Só as folhas visuais fazem fade; popup e folhas usam os mesmos tempos e curva |
| Panel / drawers / ficha lateral | Máscara radial usada em todas as posições | Modal radial; esquerda/direita/topo/baixo com máscaras lineares orientadas |
| deals.movePanel | !important em largura/fundo e sombra/raio próprios | Modal placement bottom, superfície e medidas do componente |
| deals.dealWorkspace | Seletor genérico > div altera corpo interno | API bodyDensity flush e size workspace |
| Glass + Menu/Select/RecordSelect | Classes duplicadas aumentam especificidade para ganhar a cascata | Defaults de Glass com especificidade zero; superfície compartilhada com variáveis explícitas |
| Popover / Tooltip / LinkPreview | Padding, largura e cor competiam com shared.popup | Contratos floating-* e surface-background; tooltips de ajuda e cards têm papéis explícitos |
| TagPicker | Popup próprio sem a mesma animação, raio ou material | Mesmo Glass, popup e item dos seletores |
| Hover de opções | Faixa opaca encobria o vidro; estados duplicados | Camada translúcida compartilhada com fade de opacity; campo RecordSelect usa o foco dos demais campos |
| RecordSelect | Cópia independente do movimento/superfície do popup | Reusa shared.popup; mantém somente layout e dimensão para registros |
| Kanban, zonas de drop | Cores e fundo !important, transições locais | Button tone e tamanho; feedback de drag continua explícito |
| Kanban, adicionar negócio | Botão ghost redesenhado na rota | Button ghost lg; somente alinhamento local |
| Page builder, catálogo | Outra borda, sombra, hover e curva | Button row; rota só compõe ícone e textos |
| Inbox, conversas | Hover e seleção recriados na rota | Button row e data-selected compartilhados |
| Automação, paleta | Outro raio, hover e curva | Button row; layout e ícones semânticos preservados |
| Atividades, períodos | Botão transformado em aba por borda local | Button row com seleção compartilhada |
| Importação, erro | !important de cor | Sem prioridade forçada |

## Variações funcionais preservadas

- app-layout.railLink e railPin: navegação do shell, estados ativo/recolhido e medição de indicador; não são ações de formulário.
- automation-builder.nodePort: porta de ligação com alvo de toque e indicador de conexão. A forma circular pertence ao editor de grafo.
- automation-builder.canvasAdd: ação flutuante do canvas, círculo explícito.
- admin-appearance.previewAction: demonstra a cor escolhida pelo usuário, isolada da identidade em uso.
- widget.launcher/close/send: widget externo com identidade configurável e isolamento visual próprio.
- Conteúdo interno (avatares, swatches, previews e ícones de domínio) mantém sua representação sem redefinir a superfície do controle pai.

O teste overlay.contract protege a restrição de composição que causava o salto do blur. Checagem de interação cobre foco/fechamento pelos testes existentes. Validação visual cobre a modal e os quatro lados do painel. Este mapa não afirma que todas as telas foram aprovadas esteticamente; registra o rastreamento das regras de superfície e os conflitos encontrados.
