# ADR-0024 — Limite de verificação: critério binário, duas tentativas, e para

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

Agentes de IA — e times inteiros — entram em ciclo de verificação improdutivo: constroem um pouco, e depois passam muito mais tempo conferindo do que construíram. Verifica, confere a verificação, verifica de novo. Horas se vão sem uma tela a mais.

A causa não é falta de disciplina. É **critério de parada subjetivo**. A pergunta *"será que ficou bom?"* não tem resposta final: sempre cabe mais uma olhada. Já *"o comando saiu 0?"* tem exatamente uma resposta.

A intuição de quem definiu o projeto está correta e vale registrar como premissa:

> Se o trabalho é feito com consciência, sem gambiarra, a chance de erro é menor — e a verificação necessária diminui junto. Muito esforço na construção, pouco na verificação. O contrário não é produtivo.

O objetivo do projeto é um MVP com qualidade de código, entregue por um time pequeno em 12 a 18 meses. Tempo gasto em verificação repetida é tempo que não vira produto.

## Decisão

### O critério de pronto é um comando

```bash
pnpm check     # typecheck + lint + teste, filtrado pelo que mudou
```

- **`exit 0`** → pronto. Commita. **Não verifica de novo.**
- **`exit ≠ 0`** → corrige o que foi apontado e roda **uma** vez mais.
- **Falhou de novo** → **para e reporta.** Não existe terceira tentativa automática.

Duas tentativas sem sair do lugar significam falta de informação, não falta de esforço. A ação certa nesse ponto é perguntar, não insistir.

### O orçamento de tempo

**`pnpm check` roda em menos de 60 segundos.** Se ultrapassar, corrigir o pipeline vira tarefa prioritária.

Isso não é conforto: **verificação lenta é a causa de verificação pulada**. Um comando de 5 minutos é um comando que ninguém roda antes de commitar — e aí o erro chega ao CI, ou pior, à `main`.

### A proporção-alvo

**~80% construindo, ~20% verificando.** Sessão que passou mais tempo verificando que escrevendo indica escopo grande demais numa tacada — a correção é quebrar em unidades menores, cada uma verificável em segundos.

### O que fica explicitamente proibido

| Proibido | Motivo |
|---|---|
| Rodar `pnpm check` 3× seguidas pela mesma mudança | É a definição do loop |
| Reler arquivo recém-editado "para conferir" | A ferramenta de edição teria falhado |
| Screenshot repetido procurando diferença | Sem critério de parada |
| Suíte inteira para mudança de um arquivo | `--filter` existe |
| Subir servidor de dev sem hipótese a testar | Sem hipótese, não é teste — é ansiedade |
| Verificar o que o compilador já garante | Redundância pura |
| "Só mais uma coisinha" depois do `exit 0` | Pronto é pronto |

### Onde o teste paga

| Camada | Teste | Motivo |
|---|---|---|
| `packages/core` | Unitário, cobertura alta | Regra pura, milissegundos, sem infraestrutura |
| Módulo do backend | Integração: caminho feliz + erros que importam | Onde estado e I/O se encontram |
| Componente de UI | Interação e acessibilidade, no Storybook | Onde regressão visual e de teclado acontece |
| Fluxo crítico | Poucos testes ponta a ponta | Só o que não pode quebrar |
| Resto | **Nenhum** | Teste de código óbvio é custo sem retorno |

## Por que isso funciona aqui

A premissa "trabalho bem feito precisa de menos verificação" **é sustentada pela arquitetura**, não por otimismo. O grosso da verificação foi movido para antes do código existir:

| Classe de erro | Quem pega | Custo |
|---|---|---|
| Regra divergindo entre cliente e servidor | `packages/core` — uma implementação ([ADR-0019](0019-nucleo-compartilhado.md)) | zero |
| Cálculo monetário errado | Tipo marcado `Money` — erro de compilação | zero |
| Contrato divergente entre plataformas | Cliente gerado do OpenAPI ([ADR-0004](0004-contrato-openapi-primeiro.md)) | zero |
| Componente fora do design system | Lint de fronteiras ([ADR-0020](0020-design-system-proprio.md)) | segundos |
| Módulo violando fronteira | Lint de fronteiras ([ADR-0003](0003-backend-nestjs-fastify.md)) | segundos |
| Validação divergindo entre formulário e API | Mesmo schema Zod | zero |
| Bundle engordando | Orçamento no CI ([ADR-0017](0017-orcamento-de-performance.md)) | segundos |

**Um sistema fortemente tipado se verifica sozinho.** É esse o retorno do investimento em tipos marcados, schema único e lint de fronteiras: `pnpm check` em segundos, e ninguém precisa "conferir se ficou certo".

## Alternativas consideradas

**Revisão manual de cada mudança.** Descartada como padrão: é o comportamento subjetivo que gera o loop. Revisão humana entra na PR, não a cada edição.

**Cobertura mínima por arquivo (ex.: 80%).** Descartada: incentiva teste de getter e de código óbvio, infla a suíte, deixa o `check` lento — e aí ninguém roda. Cobertura alta onde paga (`core`), nenhuma onde não paga.

**Sem verificação automática, confiando no CI.** Descartada: empurra o erro para depois, quando custa mais caro e trava outra pessoa.

**Teste ponta a ponta em tudo.** Descartado: lento, frágil e caro de manter. Poucos, nos fluxos que não podem quebrar.

## Consequências

- Algum bug vai passar. **É aceito conscientemente:** o custo de pegar os últimos 5% em verificação manual é maior que o custo de corrigi-los quando aparecerem.
- `pnpm check` vira infraestrutura crítica. Mantê-lo abaixo de 60 s é responsabilidade de todo mundo.
- As regras ficam em [`CLAUDE.md`](../../CLAUDE.md), na raiz — lido no início de toda sessão de agente e por qualquer pessoa que abra o repositório.
- Ganhamos um critério objetivo para "está pronto?", que hoje só tem resposta por opinião — e é a opinião que gera o loop.
