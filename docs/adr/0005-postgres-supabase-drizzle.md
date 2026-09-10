# ADR-0005 — Postgres gerenciado (Supabase Cloud) + Drizzle ORM

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

A pergunta original era "Supabase ou VPS com Postgres". A resposta honesta é: **os dois, com papéis diferentes** — e a divisão importa mais que a escolha.

Autogerir Postgres em produção significa assumir: backups testados, *point-in-time recovery*, réplicas de leitura, upgrades de versão sem downtime, tuning de `autovacuum`, monitoramento de bloat e connection pooling. Isso é o trabalho de um DBA. Em 2026, o Supabase Pro custa US$ 25/mês com US$ 10 de crédito de compute embutido — muito abaixo do custo de qualquer pessoa fazendo esse trabalho.

O que **não** faz sentido terceirizar é o processamento: workers de automação, ingestão de webhook e renderização de e-mail em massa ficam absurdamente caros em plataformas gerenciadas e absurdamente baratos numa VPS.

## Decisão

**Supabase Cloud guarda o estado. A VPS faz o trabalho.**

| Responsabilidade | Onde |
|---|---|
| Postgres (dado de verdade, backups, PITR, réplicas) | Supabase Cloud |
| Auth / emissão e rotação de JWT | Supabase Auth |
| Realtime do inbox (broadcast + presence) | Supabase Realtime |
| Arquivos (mídia de conversa, anexos, criativos) | Supabase Storage ou Cloudflare R2 |
| API, workers, scheduler, Redis, ingestão de webhook | VPS ([ADR-0011](0011-infra-vps-docker-dokploy.md)) |

**Região: São Paulo (`sa-east-1`) no Supabase, VPS em São Paulo.** Confirmar na criação do projeto. O motivo é duplo: latência (o inbox precisa parecer instantâneo para atendentes no Brasil) e residência de dado sob a LGPD. Hetzner é 3–5× mais barato, mas **não tem região no Brasil** — a economia de ~US$ 40/mês não paga 120 ms a mais em cada round-trip de um inbox de atendimento.

**Não** vamos autogerir o Supabase (Docker Compose com GoTrue, PostgREST, Realtime, Storage, Kong, Supavisor). Isso troca US$ 25/mês por uma superfície de operação inteira, incluindo um Studio self-hosted que não tem RBAC — quem tem a URL é admin.

**Drizzle ORM** como camada de acesso:
- SQL-first: a query que você escreve é a query que roda. Em um produto com segmentação dinâmica e relatórios, prever o SQL é requisito, não preferência.
- Migrations em arquivos `.sql` versionados no git — inclusive as políticas RLS, os índices e as partições.
- Sem engine binária, sem geração de client pesada. Funciona bem no Node e não estraga o cold start.

**Multi-tenancy:** `org_id` em toda tabela de negócio, **RLS ligada em todas elas**. A autorização real acontece na camada de aplicação (`identity`); a RLS é defesa em profundidade contra o bug que um dia vai acontecer. O acesso do backend usa uma role dedicada, nunca a `service_role` genérica sem contexto.

**Acesso direto do cliente ao Postgres (PostgREST) é proibido**, com duas exceções: Realtime e upload no Storage. Toda escrita e toda leitura de negócio passam pela API — para que exista **um só lugar** com autorização, auditoria, rate limit e cache.

## Alternativas consideradas

**Postgres autogerido na VPS.** Mais barato no papel (US$ 0 a mais). Descartado: o custo real aparece na primeira restauração de backup às 3h da manhã. Reconsiderar quando a conta do Supabase passar de ~US$ 200/mês, quando o cálculo inverte.

**Neon.** Branching de banco excelente para ambientes de preview, escala a zero. Descartado: não traz Auth, Storage e Realtime juntos, e o modelo serverless de compute é hostil a workers de conexão longa, que é metade da nossa carga.

**AWS RDS.** Mais controle, ecossistema completo. Descartado por custo: uma instância equivalente com Multi-AZ passa de US$ 150/mês antes de qualquer coisa, e ainda precisaríamos construir Auth e Realtime.

**Prisma.** Melhor DX e melhor `studio`. Descartado: gera SQL que surpreende em consultas complexas, o suporte a RLS é desconfortável, e o peso da engine incomoda no worker.

## Consequências

- Existe uma fronteira de rede entre a API e o banco. Toda consulta chatty vira latência visível — `DataLoader`/batching não é otimização, é requisito desde o início.
- Ficamos dependentes do Supabase para Auth e Realtime. Mitigação: Auth é GoTrue (open source) e Realtime fala Postgres — a rota de saída existe, e vale mantê-la documentada.
- O connection pooling é do Supavisor, em modo transação. Isso proíbe `PREPARE`/sessão persistente — Drizzle precisa ser configurado de acordo.
- Precisamos monitorar egress do Supabase desde o dia um: é a linha da fatura que estoura sem avisar.
