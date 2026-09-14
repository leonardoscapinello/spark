# A stack, consolidada

> Resposta direta a: o que é front, o que é back, qual é o banco.
> O **porquê** de cada linha está em [`docs/adr/`](../adr/). Aqui está **o quê**.

---

## Resposta curta

| | |
|---|---|
| **Front-end** | React 19 + React Router 7 (SSR) na web · Tauri v2 no desktop · Expo no mobile — **um design system, quatro alvos** |
| **Back-end** | NestJS 11 sobre Fastify, monólito modular, TypeScript · BullMQ para trabalho assíncrono |
| **Banco** | **Um Postgres.** Relacional onde o dado é relacional, JSONB onde o formato é do cliente. Não há segundo banco. |
| **Camada de dados** | TanStack DB + ElectricSQL — o cliente lê local, a rede sai do caminho |

---

## Front-end

Uma aplicação, quatro alvos de build. Nenhum código de tela duplicado entre web e desktop.

| Peça | Escolha | Papel |
|---|---|---|
| Linguagem | TypeScript strict | Toda a stack |
| Framework | **React 19** | Web, desktop e mobile |
| Roteamento web | **React Router 7** (framework mode) | SSR na primeira visita; navegação no cliente depois. Runtime de ~45 KB |
| Desktop | **Tauri v2** | Empacota o build `ssr:false`. 3–10 MB, não 120–200 MB |
| Mobile | **Expo** (New Architecture) | UI nativa própria, mesmas regras e mesmos dados |
| Dados no cliente | **TanStack DB** | Coleções reativas, query incremental (~0,7 ms em 100 mil linhas) |
| Persistência local | SQLite (desktop/mobile) · IndexedDB/OPFS (web) | Leitura sem rede |
| Primitivos de UI | **Base UI** + React Aria pontual | Comportamento, teclado, foco, ARIA — zero estilo |
| Estilo | **Tailwind v4** (web/desktop) · tema em objeto (mobile) | Consome tokens, nunca valor literal |
| Tokens | **DTCG + Style Dictionary** | Um JSON → CSS vars, React Native, Figma |
| Estado local | Zustand | Rascunho, painel, seleção |
| Listas | TanStack Virtual | Obrigatório acima de 50 itens |
| Editores visuais | React Flow (automação) · editor próprio (páginas) | Carregados sob demanda |
| Offline | Service Worker (Workbox) | Shell em cache, fila de envio |
| Site público | **Astro** | Marketing e documentação — e só |

**Regra dura:** nenhum `<input>`, `<select>`, `<textarea>` ou `<button>` fora de `packages/ui-web`. Lint reprova a PR.

---

## Back-end

| Peça | Escolha | Papel |
|---|---|---|
| Framework | **NestJS 11 + Fastify** | Monólito modular, fronteiras verificadas por lint |
| Entrypoints | `api` · `worker` · `scheduler` | Mesmo código, processos separados, escala independente |
| Contrato | **Zod → OpenAPI → clientes gerados** | Um contrato, quatro clientes, compatibilidade retroativa |
| ORM | **Drizzle** | SQL-first: a query que você escreve é a que roda |
| Fila | **BullMQ + Valkey** | Webhook, e-mail, publicação, passo de automação |
| Agendamento | Scheduler próprio sobre Postgres | `FOR UPDATE SKIP LOCKED` — espera de dias custa uma linha em disco |
| Sync | **ElectricSQL** | Replicação lógica do Postgres → clientes |
| Auth | Supabase Auth (GoTrue) | JWT, PKCE, rotação |
| E-mail | Resend (→ SES acima de 500 mil/mês) | Adaptador em `packages/email` |
| Validação de e-mail | Reoon | Importação, formulário e nó de automação |
| Mensageria | Meta Cloud API direto | WhatsApp, Instagram, Messenger |
| Social | Driver duplo: direto + Buffer | 11 canais numa integração; direto onde importa |
| Renderização de e-mail | MJML | Compilado no worker |
| Observabilidade | OpenTelemetry → Sentry + Grafana | Trace atravessa a fila |
| Deploy | Docker + Dokploy + Traefik, VPS São Paulo | Sem Kubernetes |

**O que mudou com o local-first:** o back-end **saiu do caminho da leitura**. Ele agora cuida de escrita, autorização, webhook, automação, integração e trabalho de fundo. A tela não espera por ele.

---

## Banco de dados — relacional, não-relacional, ou os dois?

**Um Postgres. Ele já é os dois.**

A pergunta fazia sentido em 2010, quando "não-relacional" significava trocar de banco. Em 2026, o Postgres armazena documento, faz busca textual, guarda vetor e particiona série temporal — **sem abrir mão de transação, integridade referencial e junção**.

| Formato do dado | Exemplo no Spark | Como é guardado |
|---|---|---|
| Relacional | Contatos, negócios, produtos, usuários, listas | Tabelas, chaves estrangeiras, transação |
| Documento | Grafo de automação, árvore de página, payload de evento/auditoria | **JSONB**; somente quando lido e gravado inteiro |
| Dado configurável consultável | Campos customizados, tags, público, preferências | **Tabelas relacionais e colunas tipadas** |
| Série temporal | Mensagens, eventos, métricas de envio | Tabelas **particionadas por mês** |
| Busca textual | Contato, negócio, conversa | **FTS** nativo + `pg_trgm` |
| Chave-valor efêmero | Fila, rate limit, sessão | **Valkey** — transporte, não fonte de verdade |
| Bytes | Mídia, anexo, HTML publicado | **R2 / Supabase Storage** |

### Por que não um segundo banco

Três razões, na ordem de peso:

1. **O local-first exige um Postgres.** O Electric sincroniza por replicação lógica. Dado num segundo banco **não sincroniza** — e vira exatamente a tela lenta que estamos evitando.
2. **A identidade do contato é o produto.** Um lead do formulário, a DM do Instagram e o negócio no pipeline precisam de junção transacional. Espalhar isso entre bancos recria o problema que motivou o projeto.
3. **Nenhum número justifica.** Um segundo banco só entra quando houver métrica provando que o Postgres não dá conta. Até lá, é complexidade sem pagador.

### Quando um segundo armazenamento entraria

Com gatilho explícito, não por gosto:

| Gatilho | O que entra |
|---|---|
| Busca textual ficando lenta acima de ~5 M de registros | Motor de busca dedicado |
| Relatório agregando > 100 M de eventos | OLAP (ClickHouse), alimentado por CDC |
| Busca semântica em conteúdo | `pgvector` — **ainda no mesmo Postgres** |

### Regras do modelo de dados

1. **Zero DDL em runtime.** Nada de `CREATE SCHEMA` ou `ALTER TABLE` por tenant — é a lição do [diagnóstico](licoes-do-twenty.md).
2. **`org_id` + RLS** em toda tabela de negócio.
3. **UUID v7** como chave primária, sempre.
4. **`updated_at` e `deleted_at`** em tudo que sincroniza. Exclusão é lógica.
5. **Partição mensal** em `events` e `messages`, desde a primeira migration.
6. **Campo customizado que vira essencial é promovido a coluna real**, por migration.

---

## Domínio completo — tudo que as ferramentas fazem

| # | Módulo | O que cobre | Referência |
|---|---|---|---|
| 1 | `identity` | Organizações, usuários, times, papéis, permissões, auditoria | — |
| 2 | `contacts` | Contatos, **identidades**, campos custom, tags, listas, segmentos, importação, fusão, scoring, consentimento LGPD | Pipedrive + AC + ManyChat |
| 3 | `companies` | Empresas, hierarquia, contatos vinculados | Pipedrive |
| 4 | `crm` | Pipelines, estágios, negócios, atividades, metas, previsão, cotações | Pipedrive |
| 5 | `catalog` | **Produtos, variantes, preços, descontos, moedas** | Pipedrive |
| 6 | `channels` | WhatsApp, Instagram, Messenger, e-mail, SMS, webchat · templates · janela de 24 h | ManyChat |
| 7 | `inbox` | Conversas, atribuição, filas por time, SLA, respostas prontas, notas internas | ManyChat + Chatwoot |
| 8 | `automation` | Grafo versionado, execuções, timers, nós de gatilho/condição/espera/ação | ManyChat + AC |
| 9 | `campaigns` | E-mail, broadcast, listas, supressão, A/B, MJML, agendamento | ActiveCampaign |
| 10 | `pages` | **Construtor visual, blocos, templates, domínios, publicação, A/B** | AC + landing pages |
| 11 | `forms` | Captura, campos, validação, submissão, gatilho de automação | AC + ManyChat |
| 12 | `social` | Contas, calendário, fila, agendamento, publicação, métricas, aprovação | Buffer |
| 13 | `events` | Timeline unificada, tracking de site e app, ingestão | — |
| 14 | `analytics` | Relatórios, dashboards, atribuição de ponta a ponta | Todos |
| 15 | `files` | Mídia, upload, CDN, biblioteca de criativos | — |
| 16 | `integrations` | Sync externo, webhooks de saída, API pública | — |

**A espinha é o módulo 2.** `contacts.identities` é o que liga a DM do Instagram, o e-mail do formulário e o negócio no pipeline à **mesma pessoa**. Sem ele, o Spark é só mais um dos quatro sistemas. Com ele, é o que nenhum dos quatro consegue ser.

---

## Os quatro pacotes que sustentam a centralização

| Pacote | Regra |
|---|---|
| `core` | Toda regra de domínio. Tipos marcados (`Money`, `Email`, `CPF`) tornam violação um erro de compilação |
| `tokens` | Todo valor de design. Um JSON, quatro plataformas |
| `blocks` | Toda definição de bloco de página. Mesmo código no editor e no renderizador |
| `data` | Toda coleção e toda escrita otimista. Uma camada, quatro plataformas |

> Se uma regra, um valor de design, um bloco ou uma query existe em dois lugares, é bug — não estilo.
