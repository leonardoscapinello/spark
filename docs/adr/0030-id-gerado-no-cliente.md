# ADR-0030 — ID gerado no cliente para escrita otimista

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

O [ADR-0018](0018-arquitetura-local-first.md) exige escrita otimista: o usuário cria um contato e ele aparece na tela antes de qualquer resposta do servidor. Pra isso funcionar, a coleção local (TanStack DB) precisa inserir a linha localmente com uma chave estável — a MESMA chave que o registro vai ter depois que o servidor confirmar e o Electric replicar de volta.

Se o servidor for quem gera o `id` (como era até aqui: `idColumn()` em `packages/db`, via `$defaultFn`), a coleção local não tem chave nenhuma pra usar no insert otimista. A alternativa óbvia — inserir com uma chave temporária e trocar pela chave real quando o servidor responder — quebra a premissa do local-first: a tela re-renderiza, qualquer estado de UI referenciando aquele item (seleção, rota, animação) perde a referência, e existe uma janela real onde duas chaves apontam pro mesmo registro.

A pergunta de segurança óbvia: se o cliente escolhe o `id`, ele pode escrever em cima do registro de outra organização? Não — `id` não é fronteira de autorização, `orgId` é. `orgId` continua **exclusivamente** derivado do usuário autenticado no servidor ([ADR-0026](0026-superficie-da-api.md)); o cliente nunca o envia. Um `id` de UUID v7 é praticamente impossível de colidir por acidente, e mesmo uma colisão proposital só teria efeito dentro da própria organização do atacante — ele já pode fazer o que quiser lá.

## Decisão

**O cliente gera o `id` de todo recurso que cria, sempre UUID v7. O servidor aceita o `id` recebido — nunca gera um novo.**

```
cliente                              servidor
  │
  │ contactId.novo()  →  id
  │ collection.insert({ id, ...})  ──────────────►  POST /v1/contacts { id, ... }
  │ (aparece na tela, otimista)                        │
  │                                                     │ INSERT ... VALUES (id, org_id, ...)
  │                                                     │ org_id vem da sessão, NUNCA do body
  │  ◄──────────────── Electric replica a linha real ──┘
  │ chave já bate — sem re-render, sem troca de id
```

- `CreateContactInputSchema` (`packages/core/src/schema/contact.ts`) inclui `id` como campo obrigatório — deixou de estar na lista de `.omit(...)`. Continua omitindo `orgId`, `criadoEm`, `atualizadoEm`, `excluidoEm`: esses seguem 100% server-derived.
- `ContactsRepository.create` (`apps/api/src/modules/contacts/infrastructure/contacts.repository.ts`) passa `id: input.id` explicitamente no insert, em vez de deixar `idColumn()`'s `$defaultFn` gerar um.
- `idColumn()` (`packages/db/src/schema/_helpers.ts`) continua existindo como está — outras tabelas (`organizations`, `users`) não passam por escrita otimista de cliente hoje, e continuam com id gerado no server até que precisem do mesmo tratamento.
- Regra geral, não só de `contacts`: **todo recurso que a UI cria via escrita otimista usa este padrão.** Quando `deals`/`activities`/etc. chegarem (Fase 1), seguem a mesma regra — não é decisão por endpoint.

## Alternativas consideradas

**Servidor gera o id, cliente troca a chave otimista pela real quando a resposta chega.** É o padrão mais comum em app que não é local-first. Descartado: reintroduz o re-render e a janela de chave-dupla que o ADR-0018 existe pra eliminar. Justamente o tipo de detalhe que faz um sync engine "funcionar mas não parecer instantâneo".

**Servidor aceita um `clientId` separado, além de gerar seu próprio `id`, e devolve o mapeamento.** Resolve o mesmo problema mas com dois identificadores pro mesmo registro pra sempre — todo log, toda FK, toda tela precisa saber qual é "o id de verdade". Descartado por violar a regra de centralização deste projeto: um recurso, um identificador.

**Trocar UUID v7 por um id sequencial/curto gerado no servidor.** Descartado — sequencial exige coordenação central (exatamente o que a escrita otimista offline não tem) e vaza contagem de registros entre organizações.

## Consequências

- Todo DTO de criação (`Create*InputSchema`) que alimenta uma coleção local-first tem `id` obrigatório no corpo — diferente de `orgId`, que nunca aparece. Ler o schema já diz qual é qual; não precisa de comentário por campo.
- O servidor confia no `id` recebido pra fazer o INSERT, mas a unicidade continua garantida pela constraint de chave primária do Postgres — um `id` repetido (por bug de cliente, nunca por ataque cross-org) falha o insert com erro de constraint, não com dado corrompido.
- `packages/core` precisa expor o construtor de id (`contactId.novo()`, e o equivalente de cada entidade futura) pro lado do cliente também, não só pro servidor — já é o caso hoje (`packages/core/src/identity/id.ts` não tem código server-only).
- Esta regra é o que faz o critério de saída do Bloco 6 ("escrita otimista sem re-render, leitura instantânea") ser verificável de verdade, não só teoricamente possível.
