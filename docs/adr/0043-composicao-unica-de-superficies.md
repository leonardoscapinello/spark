# ADR-0043 — Composição única de superfícies

Status: aceito — 2026-10-02

## Problema
Opacidade animada no ancestral do blur cria um Backdrop Root: as camadas internas deixam de capturar o conteúdo da página e reaparecem no último frame. A máscara radial também estava aplicada a drawers direcionais. Rotas e componentes especializados competiam pela superfície via especificidade e !important.

## Decisão
O wrapper do backdrop não recebe opacity, filter, mask nem isolation. Véu e quatro camadas visuais animam a própria opacidade, com blur constante, simultaneamente à janela; duração e curva de saída também são compartilhadas. Modais centrais usam máscaras radiais e drawers máscaras lineares orientadas pelo lado de entrada. Atualiza a composição de overlay da ADR-0040, preservando o desfoque progressivo da referência.

Glass fornece defaults de baixa especificidade e o único backdrop-filter. shared/surfaces é proprietário da superfície de menus e seletores; variantes comunicam largura, padding e material por variáveis, sem competir por ordem de importação. Modal expõe bodyDensity para a visão rápida, eliminando seletores de descendente nas rotas. Ações de lista usam Button row e a seleção declarativa data-selected.

## Limites
Contratos de aparência não mudam permissões ou mutações. Conteúdo rola dentro da janela; blur fica no plano fixo. Preferências de movimento/transparência reduzidos são respeitadas. Exceções funcionais auditadas estão em docs/arquitetura/auditoria-superficies-2026-10-02.md.
