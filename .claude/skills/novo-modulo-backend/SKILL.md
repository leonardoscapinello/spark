---
name: novo-modulo-backend
description: Criar ou alterar um módulo do backend NestJS do Spark. Use ao adicionar endpoint, caso de uso, repositório ou consumidor de fila — e sempre que precisar de dado que pertence a outro módulo.
---

# Módulo do backend

O backend é um **monólito modular** com fronteiras rígidas. A regra que sustenta tudo:

> Um módulo **nunca** lê ou escreve nas tabelas de outro módulo.

Foi a ausência disso que tornou os sistemas anteriores impossíveis de separar. Ver [`licoes-do-twenty.md`](../../../docs/arquitetura/licoes-do-twenty.md).

## Estrutura

```
apps/api/src/modules/<modulo>/
├── presentation/     controllers, DTOs (de packages/contracts)
├── application/      casos de uso — um arquivo por caso
├── domain/           entidades e regras específicas do módulo
└── infrastructure/   repositórios Drizzle, clientes externos
```

`domain/` **não importa** de `infrastructure/`. É onde mora o que se testa sem banco.

## Comunicação entre módulos

| Situação | Como |
|---|---|
| Preciso de dado de outro módulo, agora | Chamar o **serviço público** que ele expõe |
| Outro módulo precisa reagir a algo que fiz | Emitir **evento de domínio**, via outbox |
| Preciso de um `JOIN` com tabela de outro módulo | **Não faça.** É sinal de que a fronteira está no lugar errado — discuta antes |

Evento de domínio grava na mesma transação da mudança de negócio (padrão outbox) e um relay publica no BullMQ. Sem isso, um crash entre o `COMMIT` e o `enqueue` perde a reação em silêncio.

## Regras de dado

- **Regra de negócio vai para `packages/core`**, não para o módulo. O módulo orquestra; `core` decide.
- `org_id` em toda tabela, **RLS habilitada**, sempre.
- UUID v7 como chave primária. `updated_at` e `deleted_at` em tudo que sincroniza.
- **Zero DDL em runtime.** Migration versionada, revisada em PR.
- Migration compatível com a versão anterior (expand/contract). Remover coluna é uma segunda PR, num segundo deploy.

## Trabalho assíncrono

- Job de **segundos**, nunca de dias. Espera longa vira linha em `automation_timers`.
- Fila por criticidade: `webhooks`, `automation`, `email`, `social`, `sync`.
- Toda ação com efeito externo é **idempotente** — chave de idempotência gravada antes de executar.
- Contexto de trace viaja **dentro do payload do job**, senão o rastro morre na borda da fila.

## Webhook

Validar assinatura → enfileirar → responder `200`. **Nunca processar dentro do handler.** A Meta reenvia e desabilita endpoint lento.

## Checklist

- [ ] Nenhum import de tabela de outro módulo
- [ ] Regra de negócio está em `packages/core`
- [ ] DTO vem de `packages/contracts`, não definido localmente
- [ ] `org_id` + RLS na tabela nova
- [ ] Migration expand/contract
- [ ] Teste de integração: caminho feliz + os erros que importam
- [ ] `pnpm gen:api` rodado se o contrato mudou

## Pronto quando

`pnpm check` sai 0. Uma vez. Ver [ADR-0024](../../../docs/adr/0024-limite-de-verificacao.md).

Referência: [ADR-0003](../../../docs/adr/0003-backend-nestjs-fastify.md) · [ADR-0009](../../../docs/adr/0009-motor-de-automacao.md) · [ADR-0021](../../../docs/adr/0021-schema-estatico-campos-dinamicos.md)
