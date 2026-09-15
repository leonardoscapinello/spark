# ADR-0038 — Presença efêmera nos negócios

**Status:** Aceito
**Data:** 2026-09-14

## Decisão

A ficha mostra quem está visualizando o mesmo negócio, com avatares empilhados.
Presença é informativa: não bloqueia edição simultânea e não participa da fila
de gravação dos campos.

A API autentica, exige `deals:read` e verifica negócio + organização antes de
admitir a conexão. Identidade e foto vêm do usuário autenticado, nunca de um
nome enviado pelo navegador. Um stream SSE por ficha usa o gateway HTTP/2.

Valkey mantém leases efêmeros de 60 segundos e distribui entrada/saída por
pub/sub entre réplicas da API. Há duas conexões Valkey compartilhadas por
processo, não por usuário. O heartbeat de 20 segundos não consulta Postgres.
Fechar a ficha remove a sessão; uma interrupção abrupta expira a presença.
Várias abas da mesma pessoa contam como um avatar.

Não há tabela ou migration: presença não é dado de negócio. Postgres remoto
continua sendo a única fonte da verdade persistente. Valkey indisponível
mostra estado indisponível; não interfere em salvar ou visualizar registros.
Produção requer `REDIS_URL`; desenvolvimento usa o Valkey já previsto na
stack (`127.0.0.1:6379`) quando essa variável não está configurada.

## Alternativas

- Memória de uma única API: descartada, pois separaria usuários entre réplicas.
- Heartbeat em Postgres: descartado, pois adicionaria escrita persistente sem
  necessidade a cada usuário ativo.
- Bloqueio exclusivo: descartado conforme o requisito de edição simultânea.
