# ADR-0042 — Contrato visual de ações e etapas

Status: aceito — 2026-10-02

## Contexto
A ficha de negócio combinava botões com aparência de campo, desfechos pintados por CSS local e uma trilha angular herdada da referência Pipedrive. A visão rápida duplicava os desfechos com outro acabamento. O usuário pediu um padrão consistente inspirado no Sumi.

## Decisão
Button é a fonte de geometria, superfície, foco e movimento de ações. O padrão é rounded com token controlRadius de 12px; pill permanece uma escolha explícita para casos específicos. Tamanho lg define os quatro controles do cabeçalho, sem padding ou altura locais. Responsável e seguidores são ações secundárias elevadas, não campos rebaixados.

A intenção success/danger é propriedade do Button, compartilhada pela ficha e visão rápida. A superfície secundária permanece neutra; tinta e hover comunicam intenção. CSS de rota não redefine fundo, borda, raio, sombra ou movimento desses botões.

A trilha mantém ordem, etapa atual, tempos, histórico e confirmação de movimentação. Segmentos arredondados dentro de uma superfície rebaixada substituem o recorte angular das ADR-0033/0034. O destaque carvão é reservado à etapa atual. Essa exceção atualiza somente a representação da trilha, não as regras do funil nem o layout em colunas.

## Consequências
Uma correção em Button propaga para todas as ações consumidoras. Foco e pressão são mantidos, com movimento reduzido respeitado. A ficha deixa de carregar variantes visuais particulares para controles com a mesma função.
