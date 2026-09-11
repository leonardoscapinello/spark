# Registros de Decisão de Arquitetura (ADR)

Cada arquivo aqui registra **uma decisão**, o contexto em que foi tomada, as alternativas descartadas e as consequências aceitas.

## Como usar

- Um ADR é **imutável** depois de aceito. Mudou de ideia? Escreva um novo que substitua o anterior e marque o antigo como `Substituído por ADR-XXXX`.
- Discordar de um ADR é bem-vindo — em um novo ADR ou numa issue, nunca editando o antigo em silêncio.
- Toda PR que contraria um ADR deve, ou trazer o ADR que o substitui, ou ser rejeitada.

## Índice

| # | Decisão | Status |
|---|---|---|
| [0001](0001-typescript-ponta-a-ponta.md) | TypeScript em toda a stack | Aceito |
| [0002](0002-monorepo-pnpm-turborepo.md) | Monorepo com pnpm + Turborepo | Aceito |
| [0003](0003-backend-nestjs-fastify.md) | NestJS 11 sobre Fastify, monólito modular | Aceito |
| [0004](0004-contrato-openapi-primeiro.md) | Contrato OpenAPI gerado de Zod, clientes gerados | Aceito |
| [0005](0005-postgres-supabase-drizzle.md) | Postgres gerenciado (Supabase Cloud) + Drizzle ORM | Aceito |
| [0006](0006-web-spa-vite-tanstack.md) | ~~Web como SPA (Vite + React + TanStack)~~ | Substituído por 0015 |
| [0007](0007-desktop-tauri.md) | Desktop com Tauri v2 | Aceito |
| [0008](0008-mobile-expo-react-native.md) | Mobile com Expo / React Native | Aceito |
| [0009](0009-motor-de-automacao.md) | Motor de automação: estado em Postgres + BullMQ | Aceito |
| [0010](0010-canais-e-email.md) | ~~Meta Cloud API direto + Amazon SES~~ | Substituído por 0016 |
| [0011](0011-infra-vps-docker-dokploy.md) | VPS + Docker + Dokploy, sem Kubernetes | Aceito |
| [0012](0012-offline-first-powersync.md) | ~~Offline-first com PowerSync (Fase 3)~~ | Substituído por 0018 |
| [0013](0013-observabilidade.md) | OpenTelemetry + Sentry + Grafana | Aceito |
| [0014](0014-construir-vs-adotar-open-source.md) | Construir o núcleo, copiar os modelos de dados | Aceito |
| [0015](0015-web-react-router-7-ssr.md) | Web com React Router 7 (SSR) + SPA mode no desktop | Aceito |
| [0016](0016-canais-email-e-publicacao.md) | Canais oficiais, Resend + Reoon, driver duplo no social | Aceito |
| [0017](0017-orcamento-de-performance.md) | Orçamento de performance e contrato de rede móvel | Aceito |
| [0018](0018-arquitetura-local-first.md) | Local-first: TanStack DB + Electric | Aceito |
| [0019](0019-nucleo-compartilhado.md) | Núcleo compartilhado: uma regra, um lugar | Aceito |
| [0020](0020-design-system-proprio.md) | Design system próprio, zero componente nativo | Aceito |
| [0021](0021-schema-estatico-campos-dinamicos.md) | Schema estático, campos customizados em JSONB | Aceito |
| [0022](0022-um-so-banco-postgres.md) | Um só banco: Postgres para tudo | Aceito |
| [0023](0023-construtor-de-paginas.md) | Construtor de páginas: árvore JSON, publicação estática | Aceito |
| [0024](0024-limite-de-verificacao.md) | Limite de verificação: critério binário, duas tentativas | Aceito |
| [0025](0025-identidade-visual-liquid-glass.md) | ~~Liquid glass por camada, não por superfície~~ | Parcialmente substituído por 0031 |
| [0026](0026-superficie-da-api.md) | API-first para escrita e terceiros; leitura pelo sync | Aceito |
| [0027](0027-catalogo-de-gatilhos.md) | Catálogo de gatilhos: todo evento de domínio dispara automação | Aceito |
| [0028](0028-armazenamento-s3.md) | Armazenamento: um adaptador S3, provedor trocável | Parcialmente substituído por 0032 |
| [0029](0029-paineis-e-grupos-de-permissao.md) | Dois painéis, um app; permissão por grupo | Aceito |
| [0030](0030-id-gerado-no-cliente.md) | ID gerado no cliente para escrita otimista | Aceito |
| [0031](0031-identidade-visual-colorsoft.md) | Identidade visual COLORsoft substitui a paleta Luna; vidro ganha camada de conteúdo | Parcialmente substituído por 0033 |
| [0032](0032-provedores-substituiveis.md) | Contratos próprios, troca de destino por configuração e coexistência de fornecedores | Aceito; implementação pendente |
| [0033](0033-interface-fiel-intercom.md) | Interface de produto fiel ao Intercom; precedência ManyChat na automação | Aceito |

## Leitura obrigatória antes do primeiro código

[`docs/arquitetura/licoes-do-twenty.md`](../arquitetura/licoes-do-twenty.md) — o diagnóstico dos dois sistemas anteriores. Vários ADRs existem por causa dele.

## Modelo para novos ADRs

```markdown
# ADR-XXXX — Título curto e afirmativo

**Status:** Proposto | Aceito | Substituído por ADR-YYYY
**Data:** AAAA-MM-DD

## Contexto
O que é verdade no mundo que força esta decisão.

## Decisão
O que faremos. Em voz ativa e no presente.

## Alternativas consideradas
O que foi descartado e o motivo honesto.

## Consequências
O que ganhamos, o que perdemos, e o que passa a doer.
```
