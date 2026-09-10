# Spark — regras para agentes

As regras de trabalho deste repositório estão em **[`CLAUDE.md`](CLAUDE.md)**, e valem igualmente para Codex, Claude Code, qualquer outro agente e pessoas.

Leia esse arquivo antes de qualquer alteração. O resumo, para não haver dúvida:

## O limite de verificação

```bash
pnpm check     # typecheck + lint + teste, só do que mudou
```

- `exit 0` → pronto, commita, **não verifica de novo**
- `exit ≠ 0` → corrige o apontado, roda **uma** vez mais
- falhou de novo → **para e reporta**. Nunca uma terceira tentativa

Alvo: ~80% construindo, ~20% verificando. `pnpm check` roda em menos de 60 s.

## As seis regras estruturais

1. Regra de domínio vive em `packages/core` — e só lá
2. Nenhum elemento HTML nativo fora de `packages/ui-web`
3. Zero geração de schema em runtime
4. Um só banco: Postgres é a fonte da verdade
5. Leitura não vai à rede — tela de trabalho lê de coleção local
6. Nada de valor literal de design — tudo vem de `packages/tokens`

## Contexto obrigatório

| Arquivo | O que é |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Regras de trabalho, completas |
| [`docs/arquitetura/licoes-do-twenty.md`](docs/arquitetura/licoes-do-twenty.md) | Por que os sistemas anteriores ficaram lentos |
| [`docs/arquitetura/stack.md`](docs/arquitetura/stack.md) | Front, back, banco, módulos |
| [`docs/adr/`](docs/adr/) | As decisões, com alternativas descartadas |

ADR é imutável depois de aceito. Discordar é escrever o próximo.
