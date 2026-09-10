# ADR-0001 — TypeScript em toda a stack

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

O Spark vai rodar em seis alvos: API, workers, web, desktop (macOS/Windows), iOS e Android. O domínio é o mesmo em todos eles — um contato, um negócio, uma automação, uma permissão. Validação de formulário, cálculo de score, regra de segmentação e formatação de moeda precisam produzir **exatamente o mesmo resultado** no servidor e nos quatro clientes.

Toda linguagem a mais na stack é uma duplicação a mais dessas regras, e uma chance a mais de elas divergirem em silêncio.

## Decisão

**TypeScript em modo `strict` em 100% do código de produto**, com um único `tsconfig` base compartilhado. Node 22 LTS no servidor.

Rust entra somente como detalhe de implementação do shell do Tauri (ADR-0007) — não escrevemos lógica de domínio nele.

Abrir exceção para outra linguagem exige um ADR próprio, com número medido em mãos, justificando por que a duplicação de regra vale a pena.

## Alternativas consideradas

**Go no backend.** Mais rápido, binários menores, concorrência melhor. Descartado porque o gargalo real deste produto é I/O (APIs da Meta, SES, Postgres), não CPU — Node resolve isso bem. E porque perderíamos o compartilhamento de regra com os clientes, que é o ativo principal.

**Flutter/Dart para os clientes.** Um só código para mobile e desktop. Descartado: nenhuma linha compartilhada com o backend, ecossistema de UI densa (data grid, tabelas virtualizadas) fraco no Flutter Web, e passaríamos a manter duas linguagens para um time que já é pequeno.

**Elixir/Phoenix.** Excelente para a camada de mensageria em tempo real, e o LiveView resolveria o inbox com elegância. Descartado pelo mesmo motivo do Go, agravado por um mercado de contratação muito menor no Brasil.

## Consequências

- Um dev consegue seguir uma feature do botão até a migration. Onboarding cai de semanas para dias.
- `packages/core` e `packages/contracts` viram os arquivos mais importantes do repositório — e os mais perigosos de mexer.
- Aceitamos o teto de performance do Node. Se um caminho quente aparecer (ex.: renderização de e-mail em massa), a saída é isolá-lo atrás de uma fila e otimizar ali, não trocar a stack.
- O time contrata "dev TypeScript", não "dev backend" e "dev mobile" separados. Isso é uma vantagem de custo real.
