# ADR-0039 — Identidade de papel e curvas contínuas

**Status:** Aceito
**Data:** 2026-10-02
**Substitui parcialmente:** ADR-0033 e ADR-0034 quanto à tipografia, paleta, formas, elevação e movimento. Preserva a composição por colunas e a arquitetura do design system.

## Contexto

O usuário forneceu um design system próprio, publicado no Claude Design, e seu ZIP original. Pediu a mesma linguagem visual no Spark, incluindo campos, gráficos e movimento, preservando os painéis inspirados no Intercom. O nome e a filosofia do material não fazem parte do produto.

## Decisão

A referência está preservada em `docs/referencias/spark-design/original.zip`. Seus valores são incorporados aos tokens DTCG existentes, sem executar seu motor global de DOM ou criar um segundo design system.

- Geist e Geist Mono, distribuídas localmente via Fontsource com licença; fontes anteriores continuam disponíveis.
- Claro em papel quente e escuro em carvão, com ações monocromáticas e cores semânticas independentes. A primeira série de gráficos usa tinta; as demais usam pigmentos próprios, e comparações/projeções podem ser tracejadas.
- Controles em pílula. Superfícies em curva contínua (`corner-shape: squircle`), com fallback automático de cantos arredondados. Dimensões e rolagens das colunas permanecem.
- Campos em baixo-relevo. Superfícies usam sombras de contato, elevação de menu e elevação de modal. Textura estática discreta; sem filtros animados em áreas de trabalho.
- Curvas e tempos vêm da referência: pressão imediata em 100 ms, acomodação em 450–550 ms, saída em 280 ms. CSS, Base UI e Recharts controlam os estados; indicadores, dígitos, popovers e drawers respeitam movimento reduzido. Molas existentes de gestos permanecem.

Foco, teclado, máscaras, datas, edição inline e as APIs dos componentes são preservados. Valores de contraste insuficiente para texto pequeno são ajustados na mesma família de cores. Transições não atrasam a aplicação do estado ou a interação. Não se importa o CSS universal ou os observadores globais do protótipo; não se acrescentam máscaras de senha que escondam o input real.

O preset antigo completo acompanha o novo padrão em leitura, sem atualização destrutiva do banco. Aparências personalizadas permanecem. A migration 0072 apenas amplia a lista de fontes aceitas com `geist`; deve chegar ao banco antes de salvar essa família pela API. Não há novo banco nem mudança no sync.

## Alternativas

Copiar `sumi.css` e `sumi.js` foi descartado: os seletores globais, observadores e mutações competiriam com React e Base UI. Criar um tema exclusivo de demonstração também foi descartado: o catálogo deve usar os mesmos componentes do app.

## Consequências

A nova identidade é compartilhada por todas as telas que consomem os tokens. Componentes adicionais do Spark conservam seus recursos. Os ADRs anteriores permanecem como registro histórico. A mudança visual não autoriza migração automática de produção nem regravação de temas personalizados.
