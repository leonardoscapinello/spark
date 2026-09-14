# ADR-0036 — Integridade de tenant no banco e mensagens particionadas

**Data:** 14/09/2026
**Estado:** Aceito

## Contexto

RLS impedia uma sessão normal de ler outra organização, mas uma FK como
`deals.stage_id -> stages.id` não provava que as duas linhas tinham o mesmo
`org_id`. Também havia relações redundantes sem consistência composta (etapa e
funil, variante e produto, versão e automação) e `messages` ainda era uma tabela
única apesar do volume append-heavy previsto na arquitetura.

## Decisão

- Toda FK simples entre duas tabelas tenant-aware recebe um guard no Postgres
  que exige o mesmo `org_id`. A instalação é derivada do catálogo de FKs na
  migration 0047, sem depender de o chamador lembrar da regra.
- Relações compostas de domínio recebem guards explícitos e testáveis.
- Alvos polimórficos de campos personalizados são limitados ao catálogo fechado
  (`contact`, `company`, `deal`) e sua existência no tenant é validada.
- `messages` é particionada mensalmente por `created_at`. Uma
  `message_registry` não sincronizada garante unicidade global de UUID e
  deduplicação de `external_id` entre partições, inclusive sob concorrência.
- O scheduler mantém as partições de `events` e `messages`; a partição default
  continua sendo a rede de segurança operacional.

## Alternativas consideradas

- **Confiar apenas na API e no RLS:** descartado; importadores, workers e SQL de
  manutenção também escrevem, e RLS não expressa igualdade entre linhas.
- **Transformar toda PK em `(org_id, id)`:** integridade excelente, mas quebra
  chaves públicas e o protocolo local-first sem ganho funcional sobre os
  guards centralizados nesta fase.
- **Não particionar mensagens até aparecer lentidão:** descartado; migrar a
  tabela quente depois custa mais e a regra já estava aceita no stack.

## Consequências

Escritas inconsistentes falham com `23514` na fronteira do banco. Novas tabelas
tenant-aware devem declarar FKs antes de chamar novamente o instalador de
guards em migration. IDs externos de mensagens ficam reservados no registro de
deduplicação mesmo que a mensagem seja removida, de propósito: replay de webhook
antigo não pode recriar efeito.
