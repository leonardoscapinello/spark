# ADR-0034 — Acentos preservam os azuis da marca

**Status:** Aceito
**Data:** 2026-09-11
**Substitui parcialmente:** ADR-0033, somente quanto às cores de identidade.

## Contexto

O usuário esclareceu que a referência Intercom não substitui as cores da marca. Laranja não deve identificar seleção ou marca, mas pode comunicar atenção.

## Decisão

Acentos e ações primárias usam os azuis já definidos na paleta: `color.blue.600` e `color.blue.700`. Tokens de componente, incluindo `ui.tabIndicator`, `ui.buttonBg` e `ui.buttonHover`, referenciam tokens semânticos compartilhados. A série principal de gráficos também usa o acento da marca. Cores de categoria secundárias não representam identidade.

Cores semânticas de sucesso, atenção e erro permanecem independentes da marca. Laranja/âmbar é permitido em avisos via `color.statusWarning`. A estrutura, tipografia e comportamento orientados pelo Intercom permanecem conforme ADR-0033.

## Alternativas e consequências

Copiar o laranja da referência foi descartado por contradizer a marca. Proibir toda cor quente foi descartado por impedir sinalização semântica autorizada. Alterar a cor em cada tela foi descartado por duplicar decisões: catálogo e produção consomem os mesmos componentes e tokens.
