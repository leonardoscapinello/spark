# Spark

Plataforma interna que unifica **CRM**, **Atendimento omnichannel**, **Automação de Marketing**, **Publicação social**, **Catálogo de produtos** e **Construtor de páginas** num único produto — substituindo internamente Pipedrive, ManyChat, Buffer e ActiveCampaign.

> **Status:** Fase 0 em andamento — Blocos 1 a 7 de 7 construídos e verificados (monorepo, domínio, design system, banco com RLS, API, sincronização local-first, `apps/web` real). Falta só o que depende de infraestrutura que ainda não existe: VPS + staging no ar. Ver [`docs/arquitetura/fase-0.md`](docs/arquitetura/fase-0.md) e o critério de saída em [`docs/arquitetura/roadmap.md`](docs/arquitetura/roadmap.md).
>
> **Comece por [`docs/arquitetura/licoes-do-twenty.md`](docs/arquitetura/licoes-do-twenty.md)** — o diagnóstico dos dois sistemas anteriores. Metade dos ADRs existe por causa dele.
> Depois, [`docs/adr/`](docs/adr/), antes de escrever a primeira linha de código.

---

## Por que existir

As quatro ferramentas de referência resolvem pedaços do mesmo problema e **não compartilham a identidade do contato**. Um lead que veio de um anúncio, respondeu no Instagram, virou negociação e recebeu uma sequência de e-mail é hoje quatro registros desconectados em quatro bancos de dados.

O produto do Spark não é "um CRM" nem "um chatbot". É a **linha do tempo unificada do contato** — e as automações que só são possíveis quando ela existe.

Detalhes: [`docs/arquitetura/visao-geral.md`](docs/arquitetura/visao-geral.md)

---

## Stack (resumo executivo)

> Quadro completo — front, back, banco e os 16 módulos: [`docs/arquitetura/stack.md`](docs/arquitetura/stack.md)


| Camada | Escolha | ADR |
|---|---|---|
| Linguagem | TypeScript ponta a ponta | [0001](docs/adr/0001-typescript-ponta-a-ponta.md) |
| Repositório | Monorepo pnpm + Turborepo | [0002](docs/adr/0002-monorepo-pnpm-turborepo.md) |
| Backend | NestJS 11 sobre Fastify — monólito modular | [0003](docs/adr/0003-backend-nestjs-fastify.md) |
| Contrato de API | OpenAPI gerado de Zod; escrita pela API, leitura pelo sync | [0004](docs/adr/0004-contrato-openapi-primeiro.md) · [0026](docs/adr/0026-superficie-da-api.md) |
| Banco | **Um** Postgres gerenciado (Supabase, São Paulo) + Drizzle | [0005](docs/adr/0005-postgres-supabase-drizzle.md) · [0022](docs/adr/0022-um-so-banco-postgres.md) |
| Modelo de dados | Schema **estático**; campos customizados em JSONB | [0021](docs/adr/0021-schema-estatico-campos-dinamicos.md) |
| Camada de dados | **Local-first** — TanStack DB + ElectricSQL | [0018](docs/adr/0018-arquitetura-local-first.md) |
| Regras de domínio | `packages/core` — uma regra, um lugar | [0019](docs/adr/0019-nucleo-compartilhado.md) |
| Design system | Base UI + tokens DTCG, zero componente nativo | [0020](docs/adr/0020-design-system-proprio.md) |
| Identidade visual | Liquid glass **na camada de navegação**, conteúdo sólido | [0025](docs/adr/0025-identidade-visual-liquid-glass.md) |
| Páginas | Árvore JSON + renderizador compartilhado + estático no edge | [0023](docs/adr/0023-construtor-de-paginas.md) |
| Arquivos | Adaptador S3 único, provedor trocável por config | [0028](docs/adr/0028-armazenamento-s3.md) |
| Painéis e acesso | Colaborador + Admin num app só; permissão por grupo | [0029](docs/adr/0029-paineis-e-grupos-de-permissao.md) |
| Web | React Router 7 (SSR) + React 19 + TanStack Query | [0015](docs/adr/0015-web-react-router-7-ssr.md) |
| Desktop (macOS/Windows) | Tauri v2 — reaproveita o bundle web | [0007](docs/adr/0007-desktop-tauri.md) |
| Mobile (iOS/Android) | Expo / React Native (New Architecture) | [0008](docs/adr/0008-mobile-expo-react-native.md) |
| Motor de automação | Máquina de estados em Postgres + BullMQ | [0009](docs/adr/0009-motor-de-automacao.md) |
| Gatilhos | Todo evento de domínio pode disparar automação | [0027](docs/adr/0027-catalogo-de-gatilhos.md) |
| Canais | Meta Cloud API direto (WhatsApp · IG · Messenger) | [0016](docs/adr/0016-canais-email-e-publicacao.md) |
| E-mail | Resend + Reoon; SES acima de 500 mil/mês | [0016](docs/adr/0016-canais-email-e-publicacao.md) |
| Social | Driver duplo: direto + Buffer | [0016](docs/adr/0016-canais-email-e-publicacao.md) |
| Infra e deploy | VPS + Docker + Dokploy + GitHub Actions | [0011](docs/adr/0011-infra-vps-docker-dokploy.md) |
| Observabilidade | OpenTelemetry + Sentry + Grafana | [0013](docs/adr/0013-observabilidade.md) |
| Construir vs. adotar | Construir o núcleo, copiar os modelos de dados | [0014](docs/adr/0014-construir-vs-adotar-open-source.md) |
| Performance | Orçamento de bundle verificado no CI | [0017](docs/adr/0017-orcamento-de-performance.md) |
| Como trabalhar | `pnpm check` sai 0 → pronto. Duas tentativas, e para | [0024](docs/adr/0024-limite-de-verificacao.md) |

**Por que não Astro no app:** Astro é excelente para conteúdo estático, não para uma interface densa e persistente como um inbox. Ele tem lugar aqui — `apps/site`, o site público — e apenas ali.

**Por que SSR e não SPA:** o time usa o produto em 4G. SSR ganha no primeiro acesso; navegação no cliente ganha no uso contínuo. O React Router 7 entrega os dois, e o mesmo código gera o build estático que o Tauri empacota.

**Por que local-first:** enquanto a rede estiver no caminho da leitura, o piso de uma navegação em 4G é 65–450 ms — e 1 segundo vira um teto que se encosta. Tirando a rede do caminho, a meta deixa de ser 1 segundo e passa a ser **16 ms**. É a mesma aposta que faz o Linear responder em ~47 ms onde o Jira leva ~3.200 ms. Ver [ADR-0018](docs/adr/0018-arquitetura-local-first.md) e [ADR-0017](docs/adr/0017-orcamento-de-performance.md).

---

## Estrutura do monorepo

```
spark/
├── apps/
│   ├── api/          NestJS — HTTP, webhooks, autorização
│   ├── worker/       BullMQ — mesmos módulos Nest, outro entrypoint
│   ├── scheduler/    Varre timers vencidos e enfileira
│   ├── web/          React Router 7 — SSR no browser, estático no Tauri
│   ├── desktop/      Tauri v2 — empacota apps/web
│   ├── mobile/       Expo — iOS e Android
│   └── site/         Astro — site público (aqui sim)
├── packages/
│   ├── core/         ★ Regras de domínio puras — uma regra, um lugar
│   ├── contracts/    DTOs derivados de core/schema
│   ├── data/         Coleções TanStack DB, queries, escrita otimista
│   ├── api-client/   Cliente HTTP tipado, gerado
│   ├── blocks/       Blocos de página — mesmo render no editor e na publicação
│   ├── db/           Schema Drizzle + migrations
│   ├── email/        Interface de envio: Resend | SES
│   ├── tokens/       Tokens DTCG → CSS vars, RN, Figma
│   ├── ui-web/       Design system web (Base UI + primitivo <Glass>)
│   └── ui-native/    Design system React Native
├── infra/            docker-compose, Traefik, migrations runner
├── .agents/skills/   Skills compartilhadas (Claude Code, Codex, e outros)
└── docs/             ADRs e arquitetura ← comece aqui
```

### Três regras que não se quebram

1. **`packages/core` é a única fonte de verdade das regras.** Cálculo, validação e política existem lá — e só lá. Verificado por lint. Tipos marcados (`Money`, `Email`, `CPF`) tornam a violação um erro de compilação, não uma questão de disciplina. ([ADR-0019](docs/adr/0019-nucleo-compartilhado.md))
2. **Nenhum elemento HTML nativo fora de `packages/ui-web`.** Nada de `<input>`, `<select>` ou `<button>` no código de aplicação. ([ADR-0020](docs/adr/0020-design-system-proprio.md))
3. **Zero geração de schema em runtime.** Nem DDL, nem entidade de ORM, nem GraphQL. Tudo conhecido em build. ([ADR-0021](docs/adr/0021-schema-estatico-campos-dinamicos.md))
4. **Um só banco.** Postgres é a fonte da verdade de tudo. Valkey é transporte, R2 é bytes. ([ADR-0022](docs/adr/0022-um-so-banco-postgres.md))

O critério que orienta todas as decisões:

> **Menos camadas entre o clique e o dado. Toda camada precisa justificar sua existência com um número.**

---

## Documentação

- [Lições dos sistemas anteriores](docs/arquitetura/licoes-do-twenty.md) — **leia primeiro**
- [A stack, consolidada](docs/arquitetura/stack.md) — front, back, banco e os 16 módulos
- [Visão geral da arquitetura](docs/arquitetura/visao-geral.md) — modelo de dados, fluxos
- [Custos e infraestrutura](docs/arquitetura/custos-e-infra.md) — números reais, por fase
- [Roadmap por fases](docs/arquitetura/roadmap.md) — o que entra em cada etapa e por quê
- [**CLAUDE.md**](CLAUDE.md) — regras de trabalho, lidas por agentes e por pessoas
- [Índice de ADRs](docs/adr/README.md) — todas as decisões, com contexto e consequências

---

## Começando

```bash
pnpm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
```

Preencha as credenciais do **Postgres remoto de produção** e do Supabase.
Não existe banco local. Não execute migrations ou seeds como passo de boot.
Configure uma vez o [gateway HTTP/2 local](apps/dev-gateway/README.md),
incluindo a confiança explícita no certificado de desenvolvimento, e rode:

```bash
pnpm dev
```

Requisitos: Node 24+, pnpm 9+, Caddy e acesso aos serviços configurados.
Web: `http://localhost:3100`. API pública de desenvolvimento:
`https://localhost:3001` — não apontar o navegador diretamente para a porta
3000, pois HTTP/1.1 deixa sincronizações bloquearem salvamentos e previews.
