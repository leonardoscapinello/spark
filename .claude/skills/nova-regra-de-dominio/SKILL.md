---
name: nova-regra-de-dominio
description: Adicionar uma regra de negócio ao packages/core do Spark — cálculo, validação, política de acesso, scoring, segmentação ou formatação. Use sempre que a lógica precisar valer igual no servidor e nos clientes.
---

# Nova regra de domínio

Toda regra de negócio vive em `packages/core`. **Nunca num app, nunca num módulo do backend, nunca num componente.**

O motivo é estrutural, não estético: na arquitetura local-first, a escrita otimista roda no cliente e o servidor confirma depois. Regra duplicada que diverge faz a tela piscar e o número mudar na frente do usuário.

## Onde colocar

| Tipo | Pasta |
|---|---|
| Definição de entidade, validação | `core/schema/` |
| Cálculo, decisão, transformação | `core/rules/` |
| Quem pode fazer o quê | `core/policy/` |
| Aritmética monetária | `core/money/` |
| Moeda, telefone, CPF/CNPJ, data | `core/format/` |
| Erro de domínio | `core/errors/` |

## As quatro leis

1. **Função pura.** Sem `fetch`, sem banco, sem `Date.now()`, sem `Math.random()`. Tempo e aleatoriedade entram por parâmetro.
2. **Sem importar de fora.** `core` nunca importa de `apps/`, `db/` ou `api-client/`.
3. **Testável sem infraestrutura.** Nenhum teste de `core` sobe container.
4. **Tipo marcado para valor de domínio.** Dinheiro, e-mail, documento e identificador nunca são `number` ou `string` cru.

## Dinheiro

```ts
// packages/core/money
export type Money = number & { readonly __brand: 'Money' };  // centavos, inteiro

export const money = (centavos: number): Money => { … };
export const aplicarDesconto = (valor: Money, d: Desconto): Money => { … };
```

Só `core` exporta o construtor. Isso torna `preco * 0.9` em qualquer outro lugar um **erro de compilação** — a centralização deixa de depender de alguém lembrar.

Nunca use ponto flutuante para dinheiro. Centavos inteiros, sempre.

## Schema é fonte única

Um schema Zod em `core/schema/` gera **todos** os artefatos: tipo TypeScript, validação em runtime, OpenAPI, validação de formulário, schema Drizzle e coleção do TanStack DB.

Mudar a regra é editar **um** arquivo. O typecheck quebra em todos os consumidores na mesma PR — é o comportamento desejado, não um problema.

## Checklist

- [ ] A função é pura
- [ ] Valor de domínio usa tipo marcado
- [ ] Teste unitário cobrindo caminho feliz **e** os limites
- [ ] Nenhuma cópia da mesma lógica em outro lugar — procure antes
- [ ] Erro é do catálogo tipado, não `throw new Error('...')`

## Pronto quando

`pnpm check` sai 0. Uma vez. Ver [ADR-0024](../../../docs/adr/0024-limite-de-verificacao.md).

Referência completa: [ADR-0019](../../../docs/adr/0019-nucleo-compartilhado.md).
