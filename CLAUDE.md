# Regras de trabalho no Spark

> Este arquivo é lido pelo Claude Code no início de toda sessão. Ele vale para agentes de IA **e** para pessoas.
> Se uma regra aqui conflita com o que parece razoável no momento, **a regra vence**.

---

## 1. O limite de verificação — regra que não se quebra

Verificação existe para dar um sinal binário, não para produzir confiança subjetiva. Loop infinito de verificação acontece por um motivo só: **o critério de parada é subjetivo**. "Será que está bom?" não tem fim. `exit 0` tem.

### O contrato

```bash
pnpm check     # typecheck + lint + teste, só do que mudou
```

- **Sai 0** → está pronto. Commita. **Não verifica de novo.**
- **Sai ≠ 0** → corrige exatamente o que foi apontado e roda **uma** vez mais.
- **Falhou de novo** → **para, e reporta o que travou.** Não tenta uma terceira.

### O que é proibido

| Proibido | Por quê |
|---|---|
| Rodar `pnpm check` mais de 2 vezes seguidas pela mesma mudança | É o loop |
| Reler arquivo que você acabou de editar "para conferir" | A ferramenta teria dado erro se a edição falhasse |
| Screenshot repetido da mesma tela procurando diferença | Não tem critério de parada |
| Rodar a suíte inteira para uma mudança de um arquivo | `--filter` existe para isso |
| Subir servidor de dev só para "ver se está ok" | Se não há hipótese a testar, não há teste |
| Verificar o que o compilador já garante | Se compilou, o tipo está certo. Confie |
| "Deixa eu checar mais uma coisinha" depois do `exit 0` | Está pronto. Acabou |

### O orçamento

**`pnpm check` roda em menos de 60 segundos.** Se passar disso, o problema é o pipeline, não a disciplina — e corrigir o pipeline vira tarefa prioritária. Verificação lenta é a causa de verificação pulada.

### A proporção

O alvo é **~80% construindo, ~20% verificando**. Se uma sessão passou mais tempo verificando que escrevendo, algo está errado — normalmente é escopo grande demais numa tacada só. Quebre em pedaços menores; cada pedaço verifica em segundos.

---

## 2. Por que verificar é barato aqui

Isso não é otimismo — é consequência direta de decisões de arquitetura. **O grosso da verificação foi movido para antes do código existir:**

| Garantia | Quem verifica | Custo |
|---|---|---|
| Regra de domínio consistente entre cliente e servidor | `packages/core` — uma implementação só | zero |
| Dinheiro calculado errado | Tipo marcado `Money` — erro de compilação | zero |
| Contrato de API divergente entre plataformas | Cliente gerado do OpenAPI | zero |
| Componente fora do design system | Lint de fronteiras | segundos |
| Classe de módulo CSS que não existe | Lint (`spark/css-module-classes`) | segundos |
| Módulo tocando tabela de outro módulo | Lint de fronteiras | segundos |
| Validação divergindo entre formulário e API | Mesmo schema Zod | zero |

**Um sistema fortemente tipado se verifica sozinho.** Foi por isso que investimos em [ADR-0019](docs/adr/0019-nucleo-compartilhado.md), [ADR-0020](docs/adr/0020-design-system-proprio.md) e [ADR-0004](docs/adr/0004-contrato-openapi-primeiro.md) — o retorno é este: `pnpm check` em segundos, e ninguém precisa "conferir se ficou certo".

---

## 3. Definição de pronto

Uma unidade de trabalho está pronta quando **todos** os itens abaixo são verdade. Nada além disso é exigido.

- [ ] `pnpm check` sai 0
- [ ] Regra de domínio nova está em `packages/core`, com teste — não no app
- [ ] Componente novo está em `packages/ui-web`, com história no Storybook
- [ ] Migration, se houver, é compatível com a versão anterior (expand/contract)
- [ ] Nenhum `TODO` sem issue vinculada
- [ ] Nenhum `console.log`, `any` ou `@ts-ignore` novo

Não está na lista: revisão visual manual, teste exploratório, cobertura mínima por arquivo, aprovação de terceiro para commit em branch própria.

---

## 4. Como trabalhar

**Uma unidade por vez.** Uma tela, um endpoint, um componente, um nó de automação. Escreva → `pnpm check` → commit. Depois a próxima.

**Commit pequeno e frequente.** Um commit deve ser revisável em menos de 5 minutos.

**Teste onde ele paga:**

| Camada | Teste |
|---|---|
| `packages/core` | **Unitário, cobertura alta.** É regra de negócio pura, roda em milissegundos, sem infraestrutura |
| Módulo do backend | Integração no caminho feliz + os erros que importam |
| Componente de UI | Interação e acessibilidade no Storybook |
| Fluxo crítico ponta a ponta | Poucos, só nos caminhos que não podem quebrar |
| Resto | **Nenhum.** Teste de código óbvio é custo sem retorno |

**Quando travar, pergunte.** Duas tentativas sem sair do lugar significa que falta informação, não esforço. Perguntar custa 30 segundos; insistir custa uma hora.

---

## 5. Antes de escrever a primeira linha

1. [`docs/arquitetura/licoes-do-twenty.md`](docs/arquitetura/licoes-do-twenty.md) — por que os dois sistemas anteriores ficaram lentos
2. [`docs/arquitetura/stack.md`](docs/arquitetura/stack.md) — front, back, banco, módulos
3. [`docs/adr/`](docs/adr/) — as decisões, com contexto e alternativas descartadas

**ADR é imutável depois de aceito.** Discordar é escrever o próximo, nunca editar o anterior em silêncio. PR que contraria um ADR ou traz o ADR que o substitui, ou é rejeitada.

---

## 6. As regras estruturais

1. **Regra de domínio vive em `packages/core`.** Cálculo, validação e política — lá, e só lá.
2. **Nenhum elemento HTML nativo fora de `packages/ui-web`.** Sem `<input>`, `<select>`, `<textarea>`, `<button>` no código de aplicação.
3. **Zero geração de schema em runtime.** Sem DDL por tenant, sem entidade de ORM dinâmica, sem GraphQL gerado.
4. **Um só banco, e ele é remoto.** O Postgres de produção no Supabase é a fonte da verdade. Não existe Postgres local, de desenvolvimento ou de homologação. Valkey é transporte; R2 são bytes.
5. **Leitura não vai à rede.** Tela de trabalho lê de coleção local. Chamada de rede na renderização de tela sincronizada é bug de arquitetura.
   **Existem dois caminhos de leitura** — o sync (nosso app) e a API (terceiros e relatórios). Os dois consomem a **mesma** política de `packages/core/policy`. Escrever regra de acesso em só um deles é vazamento de dado ([ADR-0026](docs/adr/0026-superficie-da-api.md)).
6. **Nada de valor literal de design.** Cor, espaço, raio e tipografia vêm de `packages/tokens`.
7. **`backdrop-filter` só dentro do primitivo `<Glass>`.** Vidro vive na camada de navegação flutuante; conteúdo é sólido. Nunca dentro de container que rola ([ADR-0025](docs/adr/0025-identidade-visual-liquid-glass.md)).
8. **Rota e mutação declaram a capacidade exigida — quem não declara, nega por padrão.** Checagem sempre via `packages/core/policy`, nunca `if (role === '...')` espalhado ([ADR-0029](docs/adr/0029-paineis-e-grupos-de-permissao.md)).
9. **Arquivo sempre por `packages/storage`.** Nenhum módulo fala com o bucket direto ([ADR-0028](docs/adr/0028-armazenamento-s3.md)).

O critério que resolve empate:

> **Menos camadas entre o clique e o dado. Toda camada precisa justificar sua existência com um número.**

---

## 7. Skills do repositório

Versionadas em `.agents/skills/`, com symlink em `.claude/skills/`. Funcionam no Claude Code, no Codex e em outros agentes — todo mundo segue a mesma qualidade.

**Nossas convenções:** `novo-componente` · `nova-regra-de-dominio` · `novo-modulo-backend`

**Design e movimento** (de [emilkowalski/skills](https://github.com/emilkowalski/skills)): `apple-design` · `emil-design-eng` · `animate` · `animate-expo` · `review-animations` · `improve-animations` · `find-animation-opportunities` · `animation-vocabulary` · `pick-ui-library` · `prototype` · `ask-sonner` · `write-swift`

Use `apple-design` e `animate` ao construir qualquer interação com gesto, sheet ou transição. O princípio que mais vale aqui: **responder no *pointer-down*, não no *release*** — latência mata a sensação de direto antes de qualquer efeito visual salvá-la.

Atualizar: `npx skills add emilkowalski/skills`

## 8. Comandos

```bash
pnpm dev            # tudo em modo desenvolvimento
pnpm check          # typecheck + lint + teste do que mudou  ← o comando do dia a dia
pnpm check:full     # tudo, sem filtro — antes de abrir PR
pnpm db:migrate     # aplica migrations
pnpm db:generate    # gera migration a partir do schema Drizzle
pnpm gen:api        # OpenAPI + cliente tipado
pnpm gen:tokens     # DTCG → CSS vars + tema React Native
pnpm size           # orçamento de bundle (ADR-0017)
```
