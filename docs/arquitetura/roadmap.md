# Roadmap por fases

Premissa: **3–4 desenvolvedores TypeScript**. Cada fase entrega algo utilizável — nenhuma delas é "infraestrutura sem produto".

Prazos são estimativas de esforço, não compromissos de data.

---

## Fase 0 — Fundação · 5 a 7 semanas

Nada de feature. O objetivo é que toda máquina de todo dev suba o projeto igual, e que a esteira funcione ponta a ponta.

- [ ] Monorepo: pnpm + Turborepo + tsconfig base + ESLint com lint de fronteiras
- [ ] **`packages/core`** — schemas Zod, tipos marcados (`Money`, `Email`, `CPF`), primeiras regras puras ([ADR-0019](../adr/0019-nucleo-compartilhado.md))
- [ ] **Lint de fronteiras** — `eslint-plugin-boundaries` + proibição de elemento HTML nativo fora de `ui-web`. **Primeira semana, sem exceção**
- [ ] `packages/contracts` derivado de `core/schema`
- [ ] `apps/api` NestJS/Fastify com um endpoint e OpenAPI gerado
- [ ] `packages/db` com Drizzle, primeira migration: **UUID v7 + `org_id` + RLS + `deleted_at` + `updated_at` + partição mensal em `events`**
- [ ] **Replicação lógica habilitada** no Supabase — requisito duro do Electric ([ADR-0018](../adr/0018-arquitetura-local-first.md))
- [ ] **`packages/tokens`** — DTCG + Style Dictionary compilando para CSS vars e objeto JS
- [ ] **`packages/ui-web`** — inventário mínimo de campos sobre Base UI, com Storybook ([ADR-0020](../adr/0020-design-system-proprio.md))
- [ ] **`packages/data`** — TanStack DB + primeira coleção Electric, ponta a ponta
- [ ] Projeto Supabase em `sa-east-1`, com Auth funcionando
- [ ] VPS + Dokploy + Traefik + staging no ar
- [ ] GitHub Actions: typecheck, lint, teste, build, deploy em staging
- [ ] `apps/web` com React Router 7 em framework mode e login de verdade
- [ ] **Orçamento de bundle no CI** (`size-limit`) + Lighthouse CI em preset mobile ([ADR-0017](../adr/0017-orcamento-de-performance.md))
- [ ] OpenTelemetry instrumentado desde o primeiro endpoint

**Critério de saída:** um dev novo clona, roda `pnpm install && pnpm dev` e está produtivo em menos de 30 minutos. Um push em `main` chega em staging sozinho. Uma lista sincronizada por Electric renderiza a partir de coleção local, **sem chamada de rede na navegação**.

> Fase 0 ficou maior — cerca de 5 a 7 semanas em vez de 3 a 4. É deliberado: design system, núcleo de regras e camada de dados são exatamente o que não dá para retrofitar depois. É o preço de não repetir o [diagnóstico dos projetos anteriores](licoes-do-twenty.md).

> As decisões de schema desta fase são as caras de reverter. Ver [visão geral](visao-geral.md#decisões-da-fase-1-que-são-caras-de-reverter).

---

## Fase 1 — CRM · 6 a 8 semanas

Substitui o **Pipedrive**. Escolhido primeiro porque é o domínio mais estável e nenhuma aprovação externa é necessária — dá para entregar valor enquanto a App Review da Meta corre em paralelo.

- [ ] `identity`: organizações, usuários, times, RBAC
- [ ] `contacts` + **`identities`** + campos customizados + importação CSV
- [ ] `crm`: pipelines, estágios, negócios com arrastar-e-soltar, atividades
- [ ] `events`: timeline unificada do contato (particionada por mês)
- [ ] Busca com Postgres full-text
- [ ] Migração real dos dados do Pipedrive
- [ ] `audit_log`
- [ ] **Service Worker** — shell em cache e fila de envio. Nasce aqui, não depois
- [ ] **Driver Buffer do módulo `social`** — publicação nos 11 canais com uma integração, sem esperar a Fase 5

**Critério de saída:** o time comercial trabalha no Spark e cancela o Pipedrive.

> Iniciar o processo de **App Review da Meta e o registro da WABA brasileira nesta fase**, não na próxima. O prazo é externo e imprevisível ([ADR-0010](../adr/0010-canais-e-email.md)).

---

## Fase 2 — Atendimento · 8 a 10 semanas

Substitui o **ManyChat** — e fecha a lacuna que ele tem: inbox de time de verdade, com o CRM ao lado.

- [ ] `channels`: WhatsApp Cloud API, Instagram, Messenger
- [ ] Ingestão de webhook com fila, dedupe e resposta imediata
- [ ] `inbox`: conversas, atribuição, filas por time, respostas prontas
- [ ] Tempo real via Supabase Realtime
- [ ] Janela de 24 h modelada, templates sincronizados com a Meta
- [ ] **Resolução de identidade**: DM do Instagram e e-mail convergem no mesmo contato
- [ ] Mídia: áudio, imagem, documento
- [ ] Métricas de atendimento: tempo de primeira resposta, tempo de resolução

**Critério de saída:** todo o atendimento acontece no Spark. Nenhum vendedor abre o WhatsApp Web.

---

## Fase 3 — Automação · 10 a 12 semanas

O coração do produto, e a fase de maior risco técnico. Substitui a automação do **ActiveCampaign**.

- [ ] Motor: grafo versionado, `automation_runs`, `automation_timers`, scheduler ([ADR-0009](../adr/0009-motor-de-automacao.md))
- [ ] Interpretador de nós: gatilho, condição, espera, ação, divisão, meta, saída
- [ ] Construtor visual com React Flow
- [ ] `campaigns`: e-mail via Resend, listas, supressão, MJML
- [ ] Validação de lista com Reoon — incluindo o estado `indeterminado` para *catch-all*
- [ ] Eventos de e-mail (bounce, reclamação, abertura, clique) via webhook
- [ ] Segmentação dinâmica e lead scoring
- [ ] **Simulador de custo de campanha** — ver [custos](custos-e-infra.md)
- [ ] Teste A/B

**Critério de saída:** as automações do ActiveCampaign rodam no Spark, com resultado auditável passo a passo.

---

## Fase 4 — Clientes nativos · 8 a 10 semanas

Pode correr **em paralelo** à Fase 3, com um dev dedicado, porque depende só do contrato de API ([ADR-0004](../adr/0004-contrato-openapi-primeiro.md)).

- [ ] `apps/desktop` com Tauri: bandeja, notificação, atalho global, auto-update
- [ ] Assinatura e notarização (macOS) e assinatura Windows — **começar cedo, é burocrático**
- [ ] `apps/mobile` com Expo: inbox, contatos, pipeline, atividades
- [ ] Push via APNs e FCM
- [ ] Publicação nas lojas
- [ ] Tolerância a rede ruim: cache persistente, fila de envio, estado otimista

**Critério de saída:** apps publicados nas quatro plataformas, com push funcionando.

---

## Fase 5 — Social e maturidade · 8 semanas

Substitui o **Buffer** e fecha o ciclo.

- [ ] `social`: calendário e agendamento próprios sobre o driver Buffer já entregue
- [ ] **Driver direto** para os canais estratégicos: Meta Graph, TikTok, YouTube, LinkedIn
- [ ] Adaptador SES, se o volume de e-mail tiver passado de ~500 mil/mês
- [ ] Métricas de post e atribuição de post → contato
- [ ] Relatórios e dashboards
- [ ] Offline completo e resolução de conflito — o local-first já nasceu na Fase 0 ([ADR-0018](../adr/0018-arquitetura-local-first.md))
- [ ] Réplica de leitura, particionamento, tuning
- [ ] API pública documentada, se o Spark virar produto

---

## Total: 12 a 18 meses

Ordem escolhida por três critérios: **o que substitui a ferramenta mais cara primeiro** (Pipedrive), **o que depende de aprovação externa começa cedo** (Meta), e **o que tem mais risco técnico só depois de o time estar rodando junto** (automação).

## Riscos e o que fazer com eles

| Risco | Mitigação |
|---|---|
| App Review da Meta demora ou reprova | Iniciar na Fase 1; manter o ManyChat ativo até a Fase 2 fechar |
| WABA brasileira exige estrutura societária | **Validar antes da Fase 0** — pode alterar o cronograma inteiro |
| O motor de automação é subestimado | Protótipo do interpretador ainda na Fase 2, com um dev sênior |
| Entregabilidade de e-mail ruim | Aquecer domínio desde a Fase 1, mesmo sem campanha |
| Escopo do mobile inflar | Escopo congelado em [ADR-0008](../adr/0008-mobile-expo-react-native.md); ampliar exige ADR |
| O app engordar ao longo dos meses | Orçamento reprova PR + revisão mensal de bundle ([ADR-0017](../adr/0017-orcamento-de-performance.md)) |
| OAuth de terceiros do Buffer não liberar | Só afeta o Spark como produto vendável; para uso interno a chave da conta basta |
| Time menor que 3 devs | Cada fase dobra de duração. Reduzir escopo, não aumentar o prazo em silêncio |
| Shape do Electric vazando dado entre organizações | **Risco de segurança nº 1** da arquitetura. Revisão dedicada de cada shape + teste automatizado de isolamento |
| Volume sincronizado estourar os 50 MB por usuário | Orçamento no CI; a correção é ajustar o recorte, nunca aumentar o teto |
