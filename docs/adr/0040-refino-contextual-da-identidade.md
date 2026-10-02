# ADR-0040 — Adaptação da identidade à densidade do Spark

**Status:** Aceito  
**Data:** 2026-10-02  
**Complementa:** ADR-0039, com refinamentos solicitados após a revisão visual.

## Contexto

Os primeiros resultados aplicaram curvas grandes indiscriminadamente. O usuário apontou excesso de arredondamento em colunas e cartões, campos sem contraste, toast azul e ausência do backdrop progressivo da referência.

## Decisão

Usar raios por função: campos de 12px, menus de 18px, cartões e painéis de 20px e modais de 28px. Botões de ação e chips preservam a pílula. Cartões de trabalho ficam sem textura; campos têm contorno e baixo-relevo. O toast usa superfície inversa independente da cor de marca, sem contorno claro. O backdrop progressivo de quatro camadas fica exclusivamente no primitivo Glass e fora dos containers com rolagem, com respeito a movimento e transparência reduzidos.

A coluna SQL `surface_2_color` precisa de mapeamento explícito para `surface2Color` no sync. Caches antigos sem essa coluna podem reconhecer o preset original; personalizações permanecem. Valores ausentes nunca são serializados como `undefined` no CSS. Não há regravação de dados nem alteração da geometria das colunas.

## Consequências

A referência orienta material e movimento, enquanto a densidade de trabalho determina a forma. A mesma implementação serve ao catálogo e ao app. O preset antigo passa a herdar os tokens atuais inclusive antes de o cache receber a coluna corrigida.
