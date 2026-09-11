# ADR-0033 — Interface de produto tem o Intercom como alvo visual

**Status:** Aceito
**Data:** 2026-09-11
**Substitui parcialmente:** ADR-0031 e ADR-0025 na identidade visual da interface de produto; preserva arquitetura de tokens, componentes e limites de performance.

## Contexto

O usuário determinou explicitamente fidelidade ao Intercom, incluindo tipografia, cores, sombras, estruturas e componentes. Manter FH Duo e COLORsoft como obrigação da interface contradiz esse pedido. Automação continua com precedência visual do ManyChat.

## Decisão

A interface geral usa Inter e valores medidos no Intercom, reconstruídos em componentes próprios de `packages/ui-web` e tokens de `packages/tokens`. Não se distribui o aplicativo, código empacotado, marca ou dados do fornecedor. Inter é disponibilizada localmente pelo pacote Fontsource com sua licença. Ativos FH Duo permanecem disponíveis para usos existentes, mas deixam de definir a fonte geral do produto.

O primeiro conjunto é a referência desktop clara observada. Superfícies novas são sólidas, sem introduzir vidro onde a referência não o apresenta. A identidade escura existente permanece provisória; sua paridade com Intercom não está validada. As telas antigas precisam de migração estrutural própria: alterar tokens não torna seus layouts idênticos.

Paridade visual é alvo de comparação por componente, estado e viewport; não uma afirmação automática sobre toda a biblioteca. Valores ainda não medidos e ícones reconstruídos são identificados como pendência. Acessibilidade, semântica e comportamento de teclado são responsabilidade do componente compartilhado. Em ponteiro grosseiro, alvos interativos podem ser ampliados para acessibilidade, registrando essa diferença intencional.

## Alternativas consideradas

- Manter COLORsoft/FH Duo apesar do pedido: descartado por divergência explícita.
- Copiar CSS global inteiro: descartado por carregar acoplamento e estilos alheios ao componente.
- Fazer um tema paralelo só para o catálogo: descartado; o catálogo usa os componentes reais que as telas consomem.

## Consequências

Botões e campos existentes passam a consumir a nova base. A referência rastreável está em `docs/especificacao/componentes-intercom.md`. O editor de automações terá seus tokens específicos derivados do ManyChat. A implementação desta primeira unidade não declara paridade completa de telas, estados, ícones ou tema escuro.
