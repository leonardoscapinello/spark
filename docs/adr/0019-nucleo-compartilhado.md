# ADR-0019 — Núcleo compartilhado: uma regra existe em um lugar só

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

A exigência, nas palavras de quem definiu o projeto: *"uma função que calcula desconto calcula desconto no sistema inteiro — não uma função aqui e outra ali"*, e *"um lead é um lead em todo o sistema; se a gente valida de um jeito aqui, valida assim em todos os outros"*.

É a intuição correta, vinda de quem já resolveu isso com classe de domínio em PHP. Em TypeScript num monorepo multiplataforma, o mesmo princípio precisa de mecanismo — porque aqui a mesma regra roda em seis lugares: API, worker, scheduler, web, desktop e mobile.

E o [ADR-0018](0018-arquitetura-local-first.md) transformou isso de boa prática em **exigência estrutural**: numa arquitetura local-first, a escrita otimista roda no cliente e o servidor confirma depois. Se a regra divergir entre os dois, a tela pisca e o número muda na frente do usuário.

## Decisão

**`packages/core` é o núcleo de domínio. Toda regra de negócio nasce e vive lá — e em nenhum outro lugar.**

```
packages/core/
├── schema/     Zod v4 — a definição de cada entidade, uma vez
├── rules/      funções puras: desconto, score, SLA, dedupe, segmentação
├── policy/     autorização — quem pode fazer o quê
├── money/      aritmética monetária (inteiros em centavos, nunca float)
├── format/     moeda, telefone, CPF/CNPJ, data, endereço — padrão BR
└── errors/     catálogo de erro tipado
```

Quatro regras que definem o pacote:

1. **Nada em `core` faz I/O.** Sem `fetch`, sem banco, sem `Date.now()`, sem `Math.random()`. Tudo é função pura: mesma entrada, mesma saída, sempre. Tempo e aleatoriedade entram por parâmetro.
2. **`core` não importa de `apps/`, de `db` nem de `api-client`.** A dependência é sempre nessa direção.
3. **Testável sem infraestrutura.** Nenhum teste de `core` sobe container. Isso é o que mantém a cobertura alta ao longo de 18 meses.
4. **É o pacote com maior exigência de revisão.** `CODEOWNERS` marcado; mudança exige dois aprovadores.

### Uma definição, seis consumidores

O schema Zod de cada entidade é a **fonte única**, e dele derivam todos os artefatos:

```
packages/core/schema/lead.ts   (Zod)
   ├──→ tipo TypeScript          (todos os apps)
   ├──→ validação em runtime     (API, worker e clientes)
   ├──→ OpenAPI                  (ADR-0004)
   ├──→ validação de formulário  (web, desktop, mobile)
   ├──→ schema Drizzle           (packages/db)
   └──→ coleção TanStack DB      (ADR-0018)
```

Mudar a regra de "o que é um lead válido" é editar **um arquivo**. O typecheck quebra em todos os consumidores na mesma PR — que é exatamente o comportamento desejado.

### Dinheiro não é `number`

O erro clássico de sistema comercial: valor monetário em ponto flutuante, e cálculo de desconto espalhado pelo código. A solução é impedir por tipo, não por convenção:

```ts
// packages/core/money
export type Money = number & { readonly __brand: 'Money' };  // centavos, inteiro

export const money = (centavos: number): Money => { … };
export const aplicarDesconto = (valor: Money, desconto: Desconto): Money => { … };
```

Como o construtor de `Money` só é exportado por `core`, **fazer `preco * 0.9` em qualquer outro lugar é erro de compilação.** A centralização deixa de depender de disciplina e passa a ser garantida pelo compilador.

O mesmo padrão vale para `Email`, `Telefone`, `CPF`, `CNPJ` e `OrgId`: tipos marcados, construídos e validados só em `core`.

### As fronteiras são verificadas por lint, não por confiança

`eslint-plugin-boundaries`, com o CI reprovando a PR:

| Regra | O que impede |
|---|---|
| `apps/*` não importa de `apps/*` | Acoplamento entre aplicações |
| `core` não importa de `apps`, `db` ou `api-client` | Inversão de dependência |
| Elemento HTML nativo fora de `packages/ui-web` | Componente fora do design system ([ADR-0020](0020-design-system-proprio.md)) |
| `packages/db` só é importado por `apps/api`, `worker` e `scheduler` | Cliente falando com banco |
| Módulo do backend tocando tabela de outro módulo | Fronteira de módulo ([ADR-0003](0003-backend-nestjs-fastify.md)) |

**Isso entra na primeira semana da Fase 0.** Depois que a primeira violação existe, ninguém remove — é a lição direta dos dois projetos anteriores.

### O restante dos pacotes compartilhados

| Pacote | Papel | Quem consome |
|---|---|---|
| `core` | Regra de domínio, pura | Todos |
| `contracts` | DTOs de API derivados de `core/schema` | Todos |
| `api-client` | Cliente HTTP tipado, gerado | web, desktop, mobile |
| `data` | Coleções TanStack DB, queries, escrita otimista | web, desktop, mobile |
| `db` | Schema Drizzle e migrations | api, worker, scheduler |
| `ui-web` | Design system web | web, desktop |
| `ui-native` | Design system React Native | mobile |
| `tokens` | Tokens DTCG, compilados por plataforma | ui-web, ui-native |

## Alternativas consideradas

**Effect-TS como base do domínio.** Considerado a sério. Entrega erro tipado, injeção de dependência, concorrência estruturada e schema unificado — resolveria `errors/` e `policy/` com mais elegância, e já é usado em produção por Vercel e Prisma. Descartado por um motivo honesto: **Effect é viral** — uma função que retorna `Effect` empurra o tipo por toda a pilha de chamada; ele quer ser dono do fluxo de controle. Adotá-lo é uma decisão de projeto inteiro, com curva de aprendizado real, num time de 3–4 pessoas que precisa entregar. Funções puras com `Result` tipado entregam 80% do benefício com 5% do custo de adoção. **Ponto de reavaliação registrado: fim da Fase 2.**

**Deixar a regra em cada app, com revisão de código como controle.** É o que produz o problema descrito no contexto. Descartado.

**Um pacote genérico `shared` ou `utils`.** Descartado por experiência: vira depósito. `core` tem fronteira semântica — se não é regra de domínio, não entra.

**Microsserviços com a regra replicada por serviço.** Descartado pelo [ADR-0003](0003-backend-nestjs-fastify.md) e porque multiplicaria exatamente o problema que este ADR resolve.

## Consequências

- Mudar uma regra de domínio quebra o typecheck de tudo que a usa, na mesma PR. É o mecanismo funcionando, e às vezes vai parecer atrito.
- `packages/core` vira o arquivo mais importante e mais perigoso do repositório. Revisão dupla e cobertura alta não são negociáveis.
- Testes de `core` rodam em milissegundos e sem infraestrutura — o que mantém a suíte rápida e, por consequência, mantém a suíte sendo executada.
- Tipos marcados incomodam no começo (`money(1990)` em vez de `19.90`). O incômodo é o ponto: ele acontece uma vez, na escrita, em vez de virar um centavo errado numa fatura.
- O local-first passa a ter garantia de consistência entre otimista e autoritativo. Sem este ADR, o [ADR-0018](0018-arquitetura-local-first.md) produziria telas piscando.
