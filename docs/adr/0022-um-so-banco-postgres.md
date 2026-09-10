# ADR-0022 — Um só banco: Postgres para tudo

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

A pergunta foi direta: *"vai ser um banco relacional, vai ser um banco não relacional, vai ser os dois?"*

O escopo real do Spark tem formatos de dado genuinamente diferentes:

- **Relacional puro** — contatos, empresas, negócios, produtos, usuários, listas. Junção, transação, integridade referencial.
- **Documento** — campos customizados (o formato é de cada cliente), grafo de automação (árvore de nós), árvore de página (árvore de blocos).
- **Série temporal de alto volume** — mensagens, eventos, métricas de envio.
- **Busca textual** — encontrar contato, negócio ou conversa por texto livre.
- **Efêmero** — fila de trabalho, rate limit, sessão.

A pergunta faria sentido em 2010, quando "não-relacional" significava trocar de banco. Hoje ela se responde por dentro.

## Decisão

**Um Postgres, como fonte única da verdade. Nenhum segundo banco.**

O Postgres cobre todos os formatos acima sem abrir mão de transação, junção e integridade:

| Formato | Recurso do Postgres | Uso no Spark |
|---|---|---|
| Relacional | Tabelas, FK, transação | Contatos, negócios, produtos, usuários |
| Documento | **JSONB** + índice GIN (`jsonb_path_ops`) | Campos customizados, grafo de automação, árvore de página |
| Série temporal | **Partição declarativa por mês** | `events`, `messages` |
| Busca textual | **FTS** nativo + `pg_trgm` | Busca global |
| Vetor | `pgvector` | Busca semântica, quando existir |

Fora do Postgres, apenas duas coisas — e **nenhuma delas é fonte da verdade**:

| | Onde | Por quê não é banco |
|---|---|---|
| Fila, rate limit, sessão | **Valkey** | Efêmero. Perdê-lo custa reprocessamento, não dado |
| Mídia, anexo, HTML publicado | **R2 / Supabase Storage** | Bytes. O metadado fica no Postgres |

### As três razões, em ordem de peso

**1. O local-first exige um Postgres.** O Electric sincroniza por replicação lógica ([ADR-0018](0018-arquitetura-local-first.md)). Dado que mora num segundo banco **não sincroniza** — e volta a exigir ida à rede para ser lido. Ou seja: um segundo banco reintroduz exatamente a lentidão que a arquitetura inteira existe para eliminar. **Esta razão sozinha decide.**

**2. A identidade do contato é o produto.** Um lead que veio de formulário, respondeu no Instagram e virou negociação precisa ser resolvido numa transação. Espalhar contato, conversa e negócio entre bancos diferentes recria o problema que motivou o projeto — só que agora com dois sistemas para manter.

**3. Nenhum número justifica hoje.** Um segundo armazenamento é complexidade permanente: mais operação, mais consistência eventual, mais superfície de falha. Ele só entra com métrica na mão.

### Gatilhos explícitos para um segundo armazenamento

Registrados para que a decisão futura seja sobre número, não sobre gosto:

| Gatilho | O que entra | Por quê não antes |
|---|---|---|
| Busca textual degradando acima de ~5 M de registros | Motor de busca dedicado | FTS + `pg_trgm` cobre com folga abaixo disso |
| Relatório agregando > 100 M de eventos | OLAP (ClickHouse) via CDC | Partição mensal cobre muito antes disso |
| Busca semântica em conteúdo | `pgvector` — **ainda no mesmo Postgres** | Não é segundo banco |

## Alternativas consideradas

**Postgres + MongoDB** (relacional para CRM, documento para automação e páginas). Descartado pela razão 1: grafo de automação e árvore de página precisam sincronizar para o cliente, e o Electric só lê Postgres. Além disso, JSONB com GIN entrega o que o Mongo entregaria aqui, dentro da mesma transação.

**Postgres + Elasticsearch desde o início.** Descartado por prematuridade. Adiciona um sistema de indexação, uma consistência eventual e um custo mensal para resolver um problema que o FTS nativo cobre nos primeiros anos. Fica como gatilho.

**Postgres + ClickHouse para analytics desde o início.** Mesmo raciocínio. `events` particionada por mês responde relatório muito além do volume da Fase 3.

**Postgres + Redis como cache de leitura.** Descartado como padrão: com local-first, a leitura já é local — cache de leitura no servidor resolveria um problema que a arquitetura eliminou. Valkey fica só como transporte de fila.

**Banco por tenant.** Descartado; é o passo 4 do caminho de escala do [ADR-0021](0021-schema-estatico-campos-dinamicos.md), não a decisão de partida.

## Consequências

- Uma tecnologia de banco para aprender, operar, versionar e recuperar. Backup e PITR do Supabase cobrem tudo.
- Precisamos ser bons em Postgres — JSONB, GIN, partição, FTS, planos de execução. Isso é conhecimento que se acumula, não se descarta.
- `pg_stat_statements` ligado desde a Fase 1. Query lenta é problema de índice até prova em contrário.
- Toda decisão de "guardar fora do Postgres" precisa passar por um ADR novo, com o número que a justifica.
- Ganhamos transação e junção entre **todos** os domínios: um contato, sua conversa, seu negócio e sua página de origem em uma consulta.
