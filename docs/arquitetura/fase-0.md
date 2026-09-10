# Fase 0 — o plano de execução

> Sete blocos, em ordem de dependência. Cada um tem um critério de pronto **binário**.
> Estimativa: **5 a 6 semanas com 2 devs**, 7 a 8 com 1.

---

## A stack em seis linhas

Para quem só quer saber o que vamos usar:

1. Tudo em **TypeScript** — do banco até o app, uma linguagem só.
2. O banco é **Postgres**. Um só, no Supabase.
3. O servidor é **NestJS** — recebe webhook, manda mensagem, roda automação.
4. O app é **React**. O mesmo código vira site, programa de Mac/Windows (**Tauri**) e app de celular (**Expo**).
5. Entre o banco e o app existe uma **cópia local dos dados** (**TanStack DB + Electric**). É por isso que a tela abre instantâneo: ela não pergunta nada ao servidor.
6. O visual é nosso — **Base UI + tokens próprios**, liquid glass só na camada que flutua.

---

## Bloco 1 · Esqueleto — 2 a 3 dias

- Monorepo: pnpm workspaces + Turborepo + `tsconfig` base
- ESLint com `eslint-plugin-boundaries` — **as regras de fronteira entram agora, não depois**
- `docker-compose` local: Postgres + Valkey
- `.env.example` commitado
- GitHub Actions: typecheck, lint, teste, filtrados por mudança
- `pnpm check` montado, com orçamento de 60 s

**Pronto quando:** numa máquina limpa, `pnpm install && pnpm check` roda e sai 0.

---

## Bloco 2 · Tokens e os primeiros componentes — 4 a 5 dias

- `packages/tokens`: DTCG + Style Dictionary, com a paleta da marca
- Compilação para variáveis CSS e tema React Native
- `packages/ui-web`: `Glass`, `Button`, `Input`, `Field`, `Label`, `ErrorText`
- Storybook com teste de acessibilidade
- Lint proibindo elemento HTML nativo fora de `ui-web`

**Pronto quando:** um formulário de login renderiza usando **só** componentes nossos — zero `<input>`, zero `<button>` — e trocar um token muda o visual dos dois.

---

## Bloco 3 · O núcleo — 3 a 4 dias

- `packages/core`: tipos marcados `Money`, `Email`, `Telefone`, `CPF`, `CNPJ`, `OrgId`
- Schema Zod de `Contact` e `Organization`
- Primeiras regras puras + testes

**Pronto quando:** `money(1990)` existe, e `preco * 0.9` em qualquer app **não compila**.

---

## Bloco 4 · Banco — 3 a 4 dias

- Projeto Supabase em `sa-east-1`, **replicação lógica habilitada**
- `packages/db` com Drizzle
- Migration 1: `organizations`, `users`, `contacts`, `identities`
- Em toda tabela: **UUID v7 · `org_id` · RLS · `updated_at` · `deleted_at`**
- `events` já criada particionada por mês

**Pronto quando:** a migration aplica, e um teste automatizado prova que a RLS bloqueia leitura de outra organização.

---

## Bloco 5 · API — 4 a 5 dias

- `apps/api`: NestJS sobre Fastify, com o módulo `identity`
- Autenticação com JWT do Supabase
- `Zod → OpenAPI → orval` gerando `packages/api-client`
- OpenTelemetry desde o primeiro endpoint

**Pronto quando:** o login funciona ponta a ponta e o cliente gerado tipa a resposta sem nenhum DTO escrito à mão.

---

## Bloco 6 · Camada de dados local — 5 a 7 dias ⚠️

**É o bloco de maior risco do projeto.** Faça-o com dois devs juntos.

- Electric apontando para o Postgres
- Primeiro *shape*: contatos da organização do usuário
- `packages/data`: TanStack DB, coleção de contatos, escrita otimista
- **Teste de isolamento entre organizações no shape** — é o risco de segurança nº 1

**Pronto quando:** a lista de contatos renderiza a partir da coleção local **sem nenhuma chamada de rede na navegação**, e um `insert` numa aba aparece na outra em menos de 1 segundo.

**Se o Electric não entregar:** o plano B é coleção do TanStack DB alimentada por REST com revalidação. A API da aplicação não muda — troca só o transporte. **O risco está isolado neste bloco.**

---

## Bloco 7 · App e deploy — 4 a 5 dias

- `apps/web`: React Router 7, login, layout com sidebar de vidro, rota de contatos
- Service Worker (Workbox)
- VPS São Paulo + Dokploy + Traefik + staging no ar
- `size-limit` e Lighthouse CI na esteira

**Pronto quando:** um push em `main` chega ao staging sozinho, e a navegação entre contatos e detalhe é medida em **≤ 16 ms**.

---

## O que **não** entra na Fase 0

Registrado para evitar que o escopo cresça: pipeline, negócios, inbox, canais, automação, campanhas, páginas, produtos, social, mobile, desktop.

A Fase 0 entrega **uma tela de contatos que abre instantaneamente** — e a fundação que faz todas as outras serem construídas rápido.

---

## Sobre migrar os dados das ferramentas atuais

Não precisamos de acesso às contas agora. O que ajuda, quando chegar a Fase 1:

| Ferramenta | Exportar |
|---|---|
| Pipedrive | CSV de pessoas, organizações e negócios · lista de campos customizados · nomes dos pipelines e estágios |
| ActiveCampaign | CSV de contatos com tags · print ou export das automações em uso · listas e segmentos |
| ManyChat | Print dos fluxos ativos · campos customizados · tags |
| Buffer | Canais conectados · frequência de publicação |

Esses arquivos valem mais que acesso de login: eles mostram **os nomes de campo reais, os estágios reais e o formato das automações reais** — que é o que precisa caber no modelo de dados.
