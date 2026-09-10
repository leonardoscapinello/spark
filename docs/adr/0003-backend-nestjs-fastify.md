# ADR-0003 — NestJS 11 sobre Fastify, como monólito modular

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

O backend precisa sustentar quatro domínios grandes (CRM, atendimento, automação, publicação social), múltiplos desenvolvedores em paralelo, e um ciclo de vida medido em anos. Ao mesmo tempo, o time é pequeno hoje — microsserviços agora seriam um imposto de complexidade sem pagador.

O que mata projetos desse porte não é performance de framework. É o dia em que o módulo de automação passa a fazer `SELECT` direto na tabela de negócios do CRM, e nunca mais dá para separar nada.

## Decisão

**NestJS 11 com adaptador Fastify**, organizado como **monólito modular** com fronteiras rígidas.

Regras de fronteira, verificadas por lint (`eslint-plugin-boundaries`) e não por boa vontade:

1. Um módulo **nunca** lê ou escreve nas tabelas de outro módulo. Acesso a dados alheios passa por um serviço público exposto pelo módulo dono.
2. Comunicação entre módulos: chamada de serviço público (síncrona) ou **evento de domínio** (assíncrona, via outbox → BullMQ).
3. Cada módulo tem `presentation/` (controllers), `application/` (casos de uso), `domain/` (entidades e regras puras) e `infrastructure/` (repositórios Drizzle, clientes externos).
4. `domain/` não importa nada de `infrastructure/`. É onde mora a regra testável sem banco.

Módulos de primeira ordem: `identity` (org, usuários, RBAC), `contacts`, `crm`, `inbox`, `channels`, `automation`, `campaigns`, `social`, `events`, `integrations`.

**Três entrypoints, um código:** `apps/api` (HTTP), `apps/worker` (consumidores BullMQ) e `apps/scheduler` (varredura de timers) instanciam os mesmos módulos Nest com providers diferentes. Escalar o worker sem escalar a API é só mudar o número de containers.

## Alternativas consideradas

**Fastify puro + tRPC.** Mais leve, menos cerimônia, ótimo para 1–2 devs. Descartado porque a estrutura que o Nest impõe é exatamente o que evita o acoplamento descrito no contexto quando o time cresce — e porque tRPC amarra o contrato ao TypeScript (ver [ADR-0004](0004-contrato-openapi-primeiro.md)).

**Hono.** Excelente performance e portabilidade para edge. Descartado: ganho irrelevante para uma carga dominada por I/O externo, e ecossistema de DI/testes bem menos maduro para um app deste tamanho.

**Microsserviços desde o início.** Descartado sem hesitação. Não temos o volume, o time, nem o conhecimento de domínio para acertar as fronteiras agora. O monólito modular **é** o caminho para os microsserviços: quando um módulo precisar escalar sozinho, ele já está isolado e sai inteiro.

**Express (padrão do Nest).** Descartado por Fastify: cerca de 2× mais throughput em JSON, validação de schema nativa e melhor comportamento sob carga de webhook — que é o nosso perfil de tráfego dominante.

## Consequências

- Mais arquivos por feature. É o preço, e é consciente: a estrutura é para o dev que chega no mês 14, não para o que está escrevendo hoje.
- Alguns pacotes do ecossistema Nest assumem Express. Verificar compatibilidade com Fastify antes de adotar qualquer um.
- O lint de fronteiras precisa entrar **na primeira semana**. Depois que a violação existe, ninguém remove.
- Um deploy sobe tudo. Aceitável até termos motivo real para separar — e o motivo será métrica, não opinião.
