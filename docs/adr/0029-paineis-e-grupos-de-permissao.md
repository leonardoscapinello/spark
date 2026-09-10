# ADR-0029 — Dois painéis, um app; permissão por grupo governa página, ação e função

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

Requisito explícito: **painel do colaborador** e **painel do administrador**, com **toda integração vivendo só no admin**, e **todo acesso, página, ação e função governado por grupo de permissão** — não por checagem de papel espalhada pelo código.

## Decisão

### Um app, duas árvores de rota — não dois builds

```
apps/web/app/routes/
├── app/*      painel do colaborador — inbox, CRM, contatos, automação, campanhas
└── admin/*    painel do administrador — integrações, permissões, organização, auditoria, faturamento
```

Dois apps separados duplicaria consumo do design system e do `packages/data`, repetindo o erro do `landingsuite` (três frontends, nenhum dono da tela — [`licoes-do-twenty.md`](../arquitetura/licoes-do-twenty.md)). **Um app, guardas de rota diferentes.**

### O modelo: grupo → capacidade, não papel fixo

```
permission_groups        (id, org_id, nome, capacidades[])
user_permission_groups   (user_id, group_id)   — muitos-para-muitos
```

Capacidade é um par `recurso:ação` — `contacts:write`, `deals:move`, `automation:publish`, `integrations:manage`, `permission_groups:manage`, `billing:manage`. Enumeradas em **`packages/core/policy`**, o mesmo pacote que já resolve visibilidade de dado no [ADR-0026](0026-superficie-da-api.md). **Uma política só, para "o que você vê" e "o que você pode fazer."**

Toda organização nasce com cinco grupos padrão — **Proprietário, Administrador, Gerente, Agente, Visualizador** — e pode criar grupos próprios com capacidades customizadas. É requisito de paridade: Pipedrive e ActiveCampaign têm papel customizável, e "trazer integralmente" inclui isso.

### A regra que não se quebra

**Toda rota e toda mutação declaram a capacidade exigida — quem não declara, nega por padrão.** Verificado em dois lugares, nunca um só:

| Camada | Papel |
|---|---|
| API (NestJS) | **Autoritativa.** Rejeita a chamada sem a capacidade, sempre |
| Cliente (React) | Esconde da navegação e bloqueia o clique. **UX, não segurança** |

Nada de `if (role === 'admin')` espalhado pelo código — toda checagem chama a mesma função de `core/policy`.

### Integração é admin, sem exceção

Configuração de credencial (app da Meta, chave do Buffer, do Resend, do SES, do Reoon, segredo de webhook) vive **só** em `/admin/integrations/*`, atrás de `integrations:manage`. Segredo é criptografado em repouso (`pgsodium`, já decidido nos ADRs de banco) e **nunca** volta em payload de API — campo de escrita, nunca de leitura.

Toda mudança de grupo de permissão e toda mudança de integração grava no `audit_log` — são as ações de maior raio de dano do sistema.

## Alternativas consideradas

**Dois apps separados para admin e colaborador.** Descartado pelo motivo do contexto — é o erro já documentado no `landingsuite`.

**Papel fixo (enum `admin`/`agent`), sem grupo customizável.** Descartado: não atende "trazer o Pipedrive e o ActiveCampaign integralmente" — os dois têm papel customizável, e times de vendas reais têm estruturas diferentes (SDR vê só os próprios leads, Closer vê o pipeline inteiro).

**ACL por registro individual** (este negócio específico, visível só para X). Descartado como v1: complexidade desproporcional ao tamanho do time agora. O modelo por grupo cobre o requisito declarado; compartilhamento por registro entra depois como um input a mais da mesma política, sem mudar o formato.

## Consequências

- `packages/core/policy` vira, junto com as migrations, o código de maior exigência de revisão do repositório.
- Página ou ação nova sem capacidade declarada nega por padrão — é a segurança certa, ainda que gere atrito no começo.
- A migration inicial precisa semear os cinco grupos padrão.
- Navegação é renderizada a partir de capacidade, nunca de comparação de string de papel.
