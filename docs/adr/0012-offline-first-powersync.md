# ADR-0012 — Offline-first com PowerSync (Fase 3)

**Status:** Substituído por [ADR-0018](0018-arquitetura-local-first.md)
**Data:** 2026-09-10

## Contexto

Vendedor em campo, atendente no metrô, representante em feira ou em cliente. O uso móvel real do Spark acontece justamente onde a rede é pior. Um app que mostra spinner sem conexão é um app que não é usado.

Mas offline-first é caro: sincronização, resolução de conflito, migração de schema local, e um modelo mental novo para todo o time. Fazer isso antes de o produto existir é otimização prematura da pior espécie.

## Decisão

**A Fase 1 do mobile é online-first com tolerância a rede ruim.** Cache do TanStack Query com persistência, fila de envio com retry e estado otimista para as ações de escrita mais comuns (enviar mensagem, criar nota, mover negócio). Isso cobre a maioria dos casos com uma fração do custo.

**A partir da Fase 3, adotamos [PowerSync](https://powersync.com)** para sincronização offline real.

Motivo da escolha:
- **Foi construído para Postgres**, e o caminho Supabase → PowerSync é o mais documentado da categoria. Ele lê o WAL do Postgres e mantém um SQLite local em cada cliente.
- **Sistema de buckets**: define subconjuntos do banco sincronizados por usuário — essencial num sistema multi-tenant onde ninguém pode receber o banco inteiro. Um vendedor sincroniza *seus* contatos e negócios, não os da organização toda.
- **Garante consistência causal** entre buckets, o que é o que separa uma sincronização confiável de uma pilha de bugs de ordenação.
- Suporta React Native **e** Web, então desktop e mobile podem compartilhar a estratégia.

Escopo do que sincroniza offline: contatos, negócios, atividades, conversas recentes e mensagens não enviadas. **Não** sincronizam: automações, campanhas, relatórios, biblioteca de mídia.

## Alternativas consideradas

**WatermelonDB.** Rápido e maduro, mas a sincronização é responsabilidade nossa — escrever e manter protocolo de sync é exatamente o trabalho que queremos evitar.

**RxDB.** Flexível em backend, com queries reativas. Descartado: mais peça para montar, e o modelo de replicação exige mais decisões nossas que o PowerSync.

**ElectricSQL.** Conceitualmente próximo e promissor. Descartado por maturidade e por ter passado por mudanças arquiteturais grandes recentemente — preferimos a opção com histórico mais estável para dado de cliente.

**Construir sincronização própria.** Descartado. Sync com resolução de conflito é uma das coisas mais difíceis de acertar em software distribuído, e não é onde está o diferencial do Spark.

## Consequências

- **O modelo de dados precisa nascer pronto para isso.** Chaves primárias UUID (v7, para ordenação temporal) desde a primeira migration, `updated_at` em toda tabela, e nada de sequências para IDs de negócio. **Isso é decisão da Fase 1**, mesmo com a implementação na Fase 3 — corrigir depois significa remigrar tudo.
- Exclusão precisa ser lógica (`deleted_at`), não física, nas tabelas sincronizadas. Sem isso o cliente offline não tem como saber que algo sumiu.
- PowerSync tem custo (nuvem) ou operação (auto-hospedado). Decidir na Fase 3, com volume real na mão.
- Conflitos existem e precisam de política explícita por tabela — normalmente *last-write-wins* por campo, exceto em mensagens, que são append-only e não conflitam.
