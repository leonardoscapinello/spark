# ADR-0047 — Presença autenticada no atendimento

**Status:** Aceito
**Data:** 2026-10-09

## Decisão

Estender o transporte efêmero do ADR-0038 ao atendimento. O canal público do
Supabase usado pelo inbox não verificava organização nem autoria: conhecer o
identificador permitia acompanhar ou publicar presença com identidade escolhida
pelo cliente.

A API verifica JWT, capacidade e existência da conversa na organização antes de
abrir SSE (`inbox:read`) ou publicar digitação (`inbox:write`). Nome, foto e ID
vêm do usuário autenticado. A conexão expira junto com o token. Nenhuma tabela
ou migração é necessária.

CRM e inbox compartilham um módulo com as mesmas duas conexões Valkey por
processo. Chaves incluem tipo de recurso, organização e identificador. Leases,
heartbeat e remoção ao fechar seguem o ADR-0038. Digitação usa pub/sub sem
persistência e expira visualmente após quatro segundos; o cliente limita envios
a um a cada dois segundos e não permite requisições sobrepostas.

Presença permanece independente da fila de gravação e nunca bloqueia o envio de
mensagens. A indisponibilidade encerra o stream; o cliente tenta reconectar com
backoff limitado. Leitores lentos são desconectados, evitando buffers sem limite.

## Alternativas

- Canal público: descartado por permitir escuta e identidade forjada.
- Supabase privado com novas políticas: exigiria outra superfície de autorização
  e mudança no banco para um recurso efêmero já atendido pelo transporte existente.
- Escritas de presença no Postgres: descartadas pelo custo e pela natureza efêmera.
