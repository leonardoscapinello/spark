# ADR-0027 — Catálogo de gatilhos: todo evento de domínio pode disparar automação

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

O [ADR-0009](0009-motor-de-automacao.md) define **como** uma automação executa. Faltava definir **o que** pode dispará-la — e o requisito é explícito: *"automações gerais que envolvem CRM, gatilhos como Instagram Direct, comentário em post, criação de negócio, criação de lead"*. É a operacionalização de "trazer o ManyChat integralmente" no lado de automação.

## Decisão

**Todo gatilho é um evento de domínio.** Não existe caminho paralelo de "gatilho de automação" — automação apenas **assina** o mesmo barramento de eventos que já alimenta `events` (timeline) e `analytics` ([ADR-0003](0003-backend-nestjs-fastify.md), padrão outbox). Isso preserva a fronteira de módulo: `automation` nunca lê tabela de `channels` ou `crm` diretamente.

```
core/schema/domainEvent.ts   → união discriminada, uma entrada por tipo
        │
        ├── quem emite: o módulo dono (channels, crm, forms, contacts…)
        └── quem assina: automation — casa evento × condição → cria automation_run
```

### Catálogo inicial

| Categoria | Gatilhos | Emitido por |
|---|---|---|
| Canal | mensagem recebida (por canal), **comentário em post**, resposta a story, menção, **DM iniciada** | `channels` |
| CRM | contato criado, **negócio criado**, negócio mudou de estágio, negócio ganho/perdido, atividade concluída | `crm` |
| Marketing | formulário enviado, página visitada, e-mail aberto/clicado, tag adicionada/removida, entrou em lista | `forms` · `campaigns` · `contacts` |
| Tempo | campo de data atingido, sem atividade há N dias, recorrência agendada | `scheduler` |
| Manual | adicionado à automação manualmente, chamada de API/webhook externo | qualquer um |

Condição de disparo é filtro de campo simples sobre o payload do evento (ex.: `canal = instagram AND contém_palavra_chave`), resolvido em `core/rules`, igual ao resto do domínio.

**Comentário em post e DM do Instagram exigem assinatura de webhook além da de mensageria** (campo `comments` da Graph API, não só `messages`) — registrado como requisito do módulo `channels` no roadmap, não é decisão nova de arquitetura.

## Alternativas consideradas

**Trigger como tabela própria, desacoplada de evento de domínio.** Descartado: duplicaria o que `events` já registra e criaria dois lugares para a mesma pergunta ("o que aconteceu com este contato?").

**Automação consultando outros módulos por polling.** Descartado: adiciona latência e carga desnecessária quando o evento já existe no outbox.

## Consequências

- Gatilho novo = adicionar um membro à união discriminada + garantir que o módulo dono já emite o evento. Nunca toca o interpretador de grafo.
- O catálogo acima é o inventário mínimo da Fase 2 (canais) e Fase 3 (automação) — cresce por ADR curto quando um gatilho novo não se encaixa nas categorias.
