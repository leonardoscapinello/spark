# ADR-0002 — Monorepo com pnpm + Turborepo

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

Seis aplicações e seis pacotes compartilhados. O requisito declarado é que **toda informação seja compartilhada entre todos os desenvolvedores e todas as máquinas**, com o projeto inteiro no GitHub.

Em polirepo, mudar um campo de contato vira: PR no pacote de contratos, publicar versão, PR na API, PR no web, PR no mobile, PR no desktop. Cinco PRs, cinco revisões, e uma janela em que a versão publicada não bate com o que está em produção.

## Decisão

**Um único repositório** (`leonardoscapinello/spark`), gerenciado com **pnpm workspaces** e **Turborepo**.

- `pnpm` pelo store com links simbólicos: instalação rápida e disco compartilhado entre os projetos, o que importa quando cada app tem seu grafo de dependências.
- `turbo` para cache de build e execução por grafo de dependência — local e remoto (Vercel Remote Cache no plano gratuito, ou um bucket S3/R2 próprio).
- Versão de Node e pnpm travadas por `.nvmrc` e `packageManager` no `package.json`. Corepack habilitado.
- Uma mudança de contrato é **uma PR**, que quebra o typecheck de todos os consumidores na hora. É esse o objetivo.

## Alternativas consideradas

**Nx.** Mais poderoso — geradores, grafo de projeto, plugins. Descartado por peso: o Nx impõe estrutura e um modelo mental próprio que custa caro num time que ainda está se formando. O Turborepo faz 90% do valor com 10% do conceito. Migrar Turbo → Nx depois é viável; o contrário é doloroso.

**Polirepo com pacotes publicados no npm privado.** Descartado pelo motivo do contexto: o custo de coordenação é pago em toda mudança de domínio, e mudanças de domínio serão constantes nos primeiros 18 meses.

**Submódulos git.** Descartado. Resolvem distribuição de código, não coerência de versões, e o custo cognitivo por dev é alto.

## Consequências

- CI precisa ser seletivo desde o primeiro dia (`turbo run --filter=...[origin/main]`), senão cada PR roda build de mobile sem necessidade.
- O repositório vai ficar grande. Artefatos de build de mobile e desktop **nunca** entram no git; vão para o Releases do GitHub ou para o R2.
- Um `pnpm-lock.yaml` único e obrigatório. Conflito de lockfile em PR resolve-se regenerando, nunca editando à mão.
- `CODEOWNERS` passa a ser a ferramenta de proteção: `packages/contracts` e `packages/db` exigem revisão de quem conhece o domínio.
