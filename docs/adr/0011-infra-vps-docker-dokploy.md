# ADR-0011 — VPS + Docker + Dokploy, sem Kubernetes

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

A VPS hospeda API, workers, scheduler e Redis ([ADR-0005](0005-postgres-supabase-drizzle.md)). Precisamos de deploy repetível, rollback rápido, TLS automático e ambiente de staging — com o mínimo de superfície operacional, porque nos primeiros meses ninguém vai ter tempo sobrando para operar infraestrutura.

## Decisão

**Docker Compose orquestrado por [Dokploy](https://dokploy.com) numa VPS em São Paulo.**

- **Dokploy** (open source, auto-hospedado) entrega o essencial de uma PaaS: deploy a partir do GitHub, variáveis de ambiente, logs, rollback, preview de branch, Traefik com TLS automático via Let's Encrypt, backups agendados. Coolify é equivalente e aceitável — Dokploy foi escolhido por ser mais enxuto e ter o modelo de Compose mais direto.
- **Provedor:** Vultr São Paulo (tem região no Brasil; Hetzner não tem — ver [ADR-0005](0005-postgres-supabase-drizzle.md)). DigitalOcean e Magalu Cloud são alternativas equivalentes.
- **Dimensionamento inicial:** 4 vCPU / 8 GB para tudo. Quando a carga de worker competir com a API, separar em duas VPS antes de aumentar a máquina — isola falha, além de capacidade.
- **Redis/Valkey** em container na mesma VPS, com persistência AOF. É transporte de fila ([ADR-0009](0009-motor-de-automacao.md)), não fonte de verdade; perdê-lo custa reprocessamento, não dado.

### Esteira

```
push → GitHub Actions
  ├─ typecheck + lint + testes (turbo, filtrado por mudança)
  ├─ build de imagens → GHCR (tag = SHA do commit)
  └─ deploy via webhook do Dokploy
        ├─ main  → staging  (automático)
        └─ tag v* → produção (com aprovação manual)
```

- **Migrations rodam num job próprio, antes do deploy**, nunca no boot do container — senão três réplicas subindo ao mesmo tempo tentam migrar em paralelo.
- Toda migration precisa ser compatível com a versão anterior do código (expand/contract). Remover coluna é sempre uma segunda PR, num segundo deploy.
- Segredos no Dokploy e no GitHub Environments. **Nada de `.env` no git.** `.env.example` commitado e obrigatório: é ele que garante que a máquina de qualquer dev suba igual.
- `docker compose` local para desenvolvimento (Postgres, Redis, MailHog) + Supabase CLI para Auth/Storage locais.

## Alternativas consideradas

**Kubernetes (k3s ou gerenciado).** Descartado sem hesitação. Não temos o número de serviços, o volume, nem alguém para operar um cluster. Kubernetes resolveria problemas que ainda não temos e criaria uma classe inteira de problemas que não temos hoje. Revisitar quando houver mais de 10 serviços e mais de 5 pessoas em plantão.

**Vercel / Railway / Render.** Ótima DX. Descartados por custo em carga de worker: processos de longa duração e alta concorrência são o pior caso comercial dessas plataformas, e são metade da nossa carga.

**Fly.io.** Boa opção intermediária, com região em São Paulo (GRU) e bom suporte a processos persistentes. Foi a alternativa mais forte. Descartada por previsibilidade de custo e por manter a operação num modelo (Docker Compose) que qualquer dev do time já entende.

**AWS ECS/Fargate.** Descartado: mais caro e muito mais configuração para o mesmo resultado neste porte.

## Consequências

- A VPS é ponto único de falha para a camada de processamento. Aceito nesta fase: uma indisponibilidade atrasa automação e webhook, não perde dado — o estado está no Postgres gerenciado, e webhooks da Meta são reenviados. Mitigar na Fase 3 com uma segunda VPS.
- O Dokploy vira infraestrutura crítica. Manter atualizado, atrás de VPN ou lista de IPs, com 2FA.
- Precisamos monitorar disco: log e imagem Docker antiga enchem VPS silenciosamente. `docker system prune` agendado e alerta de disco em 80%.
- Fica documentado o gatilho de migração para Kubernetes, para que a discussão seja sobre métrica e não sobre gosto.
