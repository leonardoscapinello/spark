# ADR-0004 — Contrato OpenAPI gerado de Zod, com clientes gerados

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

Quatro clientes vão consumir a mesma API: web, desktop, iOS e Android. Mais adiante, provavelmente, uma API pública para clientes e parceiros integrarem — este é um produto de CRM e automação; integração é requisito de mercado, não luxo.

Um contrato que só existe em tipos TypeScript resolve os quatro primeiros e falha no quinto.

## Decisão

**Zod é a fonte da verdade. OpenAPI 3.1 é o artefato publicado. Os clientes são gerados.**

Fluxo:

```
packages/contracts (Zod)
        │
        ├─→ nestjs-zod ─→ validação em runtime na API + @nestjs/swagger
        │                        │
        │                        └─→ openapi.json (commitado, versionado)
        │                                    │
        └─────────────────────────────→ orval ─→ packages/api-client
                                                  cliente tipado +
                                                  hooks TanStack Query
```

- `openapi.json` é **commitado no repositório**. Mudanças nele aparecem no diff da PR — é assim que uma quebra de contrato fica visível na revisão, e não em produção.
- O CI falha se `openapi.json` estiver dessincronizado dos schemas Zod.
- `packages/api-client` é gerado, nunca editado à mão. Funciona igual em React DOM e React Native, porque TanStack Query é agnóstico de plataforma.
- Versionamento por caminho (`/v1/...`). Quebra de contrato exige `/v2` e um período de convivência.

## Alternativas consideradas

**tRPC.** Melhor experiência de desenvolvimento que existe para TypeScript ponta a ponta, sem passo de geração. Descartado por dois motivos duros: (1) não produz um contrato consumível fora do TypeScript, o que mata a API pública futura; (2) acopla o cliente à versão exata do servidor — inaceitável quando o cliente é um app na App Store que o usuário pode não atualizar por meses. **Este segundo ponto é decisivo:** apps móveis exigem compatibilidade retroativa explícita, e tRPC não tem uma história boa para isso.

**ts-rest.** Meio-termo elegante: contratos em Zod, cliente tipado e geração de OpenAPI. Foi a alternativa mais próxima de ser escolhida. Descartada por maturidade e tamanho de comunidade frente ao par `@nestjs/swagger` + `orval`, que é o caminho mais batido e mais fácil de contratar gente que já conhece. Revisitar em 12 meses.

**GraphQL.** Resolveria bem o over-fetching no mobile e a agregação da linha do tempo. Descartado por complexidade operacional (cache, N+1, rate limiting por custo de query, autorização por campo) desproporcional ao ganho neste estágio. Se voltar, volta como uma camada *sobre* os módulos, não no lugar deles.

## Consequências

- Existe um passo de geração. Ele precisa estar no `turbo` e no CI, senão alguém vai esquecer.
- Ganhamos compatibilidade retroativa como disciplina explícita: adicionar campo é livre, remover ou renomear campo exige nova versão. Isso é chato e é exatamente o que salva o app publicado.
- A API pública para clientes sai quase de graça no futuro — o `openapi.json` já é a documentação.
- Um dev de mobile nunca precisa perguntar "qual o formato dessa resposta?". Ele importa o hook gerado.
