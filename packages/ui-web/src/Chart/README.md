# Cards e gráficos de dashboard

Importe `Card`, `MetricCard`, `ProgressCard`, `SummaryList`, `DashboardGrid` e `DashboardToolbar` de `@spark/ui-web`. Importe `DataChart` e `DonutChart` de `@spark/ui-web/charts`: o motor de gráficos fica separado das telas que não precisam dele.

Os componentes recebem dados e callbacks da aplicação. Não consultam fornecedores, não calculam indicadores de negócio e não decidem períodos ou permissões. As histórias usam dados ilustrativos; os componentes exportados não dependem deles.

## Contratos

- `Card`: título, descrição, ações, conteúdo e rodapé; aparência `outlined` ou `elevated`.
- `MetricCard`: valor já calculado, comparação textual e sentimento explícito. Zero é um valor válido.
- `ProgressCard`: valor e máximo fornecidos pela aplicação, com rótulo acessível.
- `SummaryList`: itens identificados por ID, rótulo, detalhe, valor e ação opcional.
- `DataChart`: registros com `label` e chaves numéricas; séries com chave, rótulo e cor semântica. Tipos `line`, `area` e `bar`; barras podem ser empilhadas. `null` representa ausência e interrompe a linha. Formatação numérica substituível por callback. Legendas alternam a visibilidade das séries; a tabela preserva todos os dados recebidos.
- `DonutChart`: categorias com ID, rótulo, valor finito não negativo e cor. Categorias zeradas continuam na legenda; todas zeradas não simulam distribuição.
- `state`: `ready`, `loading`, `empty` ou `error`. Carregamento e erro escondem valores anteriores. `onRetry` delega a recuperação à aplicação.
- `DashboardToolbar`: seleção controlada do período e espaço para filtros adicionais. `DashboardGrid`: grade responsiva de gráficos ou indicadores.

Tokens centralizam espaços, cores, espessuras e dimensões. A captura `docs/inspiration/intercom/capturas/054-relatorios-visao-geral.png` orienta cards planos e gráficos; a paleta de séries é uma aproximação visual, não uma medição exata do CSS do Intercom.

## Cobertura ainda pendente

Esta entrega não encerra o inventário de dashboard: tabela avançada com ordenação/paginação/seleção, intervalo de datas com calendário, composição de filtros e organização persistente de widgets ainda precisam de componentes próprios e histórias. Exportação de relatórios e cálculo de métricas pertencem aos módulos de aplicação/domínio, não ao componente visual.
