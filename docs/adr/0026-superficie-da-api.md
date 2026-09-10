# ADR-0026 — Superfície da API: escrita pela API, leitura própria pelo sync

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

O [ADR-0004](0004-contrato-openapi-primeiro.md) definiu contrato-primeiro: Zod → OpenAPI → clientes gerados. Isso é API-first.

Mas o [ADR-0018](0018-arquitetura-local-first.md) mudou algo que ainda não estava escrito com precisão: **a leitura do nosso próprio app não passa pela API.** Ela vem da coleção local, sincronizada pelo Electric direto do Postgres por replicação lógica.

Se isso não for dito com clareza, duas coisas ruins acontecem: alguém constrói endpoints de leitura que ninguém usa, ou — muito pior — alguém assume que a autorização da API protege também o caminho do sync. **Não protege. São dois caminhos.**

## Decisão

**API-first para escrita, para operação e para terceiros. O sync é o caminho de leitura do nosso app.**

### O que passa pela API

| | Exemplo |
|---|---|
| **Toda escrita** | criar contato, mover negócio, enviar mensagem, publicar página |
| **Operação que não é dado** | disparar automação, importar CSV, validar e-mail, publicar post |
| **Leitura não sincronizada** | relatório, agregação, histórico antigo, exportação |
| **Terceiros** | integração de cliente, webhook de saída, API pública |

### O que não passa

Leitura de tela de trabalho no nosso app: contatos, negócios, pipelines, conversas recentes. Isso vem da coleção local, em ~0 ms.

```
LEITURA (nosso app)     Postgres → Electric → coleção local → tela
LEITURA (terceiros)     Postgres → API → cliente
ESCRITA (todos)         cliente → API → core → Postgres → Electric → volta
```

### O problema que isso cria — e a solução

**Existem dois caminhos de leitura, e eles precisam aplicar exatamente a mesma política de acesso.** Se o *shape* do Electric e a query REST discordarem sobre o que um usuário pode ver, um dos dois vaza dado. É o risco de segurança número um da arquitetura.

A solução é estrutural, não procedural:

```
packages/core/policy/
└── contactVisibility(user, org) → { orgId, teamIds, ownerIds, incluirArquivados }
        │
        ├──→ shape do Electric  (o que sincroniza)
        └──→ query REST         (o que a API devolve)
```

**A política é uma função pura em `packages/core`.** Os dois caminhos a consomem; nenhum dos dois escreve regra de acesso própria. Mudar quem enxerga o quê é editar um arquivo — e os dois caminhos mudam juntos.

Teste obrigatório na esteira: para o mesmo usuário, o conjunto sincronizado e o conjunto devolvido pela API são **idênticos**. Divergência reprova o build.

**Valor derivado nunca é calculado só de um lado.** Score, SLA, estágio efetivo e total de negócio são funções puras de `core`, aplicadas sobre a linha crua — igual no cliente e no servidor. Nenhum campo derivado é materializado em só um dos caminhos.

### Convenções da API

Definidas agora porque mudar depois quebra cliente de terceiro:

| | |
|---|---|
| Estilo | REST orientado a recurso, `/v1/...` |
| Paginação | **Cursor**, nunca offset — offset quebra em dado que muda durante a navegação |
| Idempotência | Header `Idempotency-Key` obrigatório em **toda** escrita |
| Erro | **Problem Details** (RFC 9457), com código estável de `core/errors` |
| Concorrência | `ETag` + `If-Match` — quem escreve por cima de versão antiga recebe 409 |
| Limite de uso | `RateLimit-*` por organização, não por IP |
| Filtro e ordenação | Vocabulário fixo, derivado do schema Zod — sem query livre |
| Webhook de saída | Assinatura HMAC, retry com backoff, log de entrega consultável |
| Versão | `openapi.json` **commitado**; quebra de contrato exige `/v2` e convivência |

### Pública desde quando

A API **não** é publicada para clientes na Fase 0 — mas é construída como se fosse desde o primeiro endpoint. Sem endpoint interno com regra diferente, sem `?debug=true`, sem campo que só o nosso app entende.

O custo disso é próximo de zero (a disciplina já está no [ADR-0004](0004-contrato-openapi-primeiro.md)), e o retorno é que abrir a API vira uma decisão comercial, não um projeto de engenharia.

## Alternativas consideradas

**API-first puro — toda leitura pela API, inclusive a nossa.** É o desenho clássico e o mais simples de raciocinar. Descartado: reintroduz a rede no caminho da leitura e joga fora a meta de 16 ms ([ADR-0018](0018-arquitetura-local-first.md)). Seria trocar a coisa mais valiosa da arquitetura pela simetria.

**Sem API pública nunca, tudo pelo sync.** Descartado: terceiro não consegue consumir um sync engine, e integração é requisito de mercado em CRM.

**GraphQL como superfície única.** Descartado no [ADR-0004](0004-contrato-openapi-primeiro.md), e agora com mais um motivo: com a leitura fora da API, o principal argumento do GraphQL — evitar over-fetching em consulta de leitura — deixa de valer para nós.

**Autorização duplicada, uma no shape e outra na API.** É o caminho natural e é uma armadilha. Descartado por ser exatamente o mecanismo de vazamento descrito acima.

## Consequências

- Existem dois caminhos de leitura. **Isso precisa estar claro para todo dev**, e está em `CLAUDE.md`.
- `packages/core/policy` vira código de segurança crítico: revisão dupla obrigatória.
- O teste de paridade entre sync e API é infraestrutura, não teste comum. Entra na esteira do Bloco 6 da [Fase 0](../arquitetura/fase-0.md).
- Endpoints de leitura existem para terceiros e para relatório, mesmo sem o nosso app usá-los. É custo aceito conscientemente — sem eles não há API pública.
- Ganhamos velocidade local **e** uma API íntegra, sem escolher entre as duas.
