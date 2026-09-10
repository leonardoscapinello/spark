# ADR-0013 — Observabilidade: OpenTelemetry + Sentry + Grafana

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

Boa parte do que o Spark faz é **assíncrona e invisível**: um webhook chega, vira evento, dispara automação, que espera dois dias, que envia um e-mail, cujo bounce volta por outro webhook.

Quando alguém perguntar *"por que este contato não recebeu a mensagem?"* — e vão perguntar toda semana — sem rastreamento distribuído a resposta é um dia de leitura de log.

## Decisão

**OpenTelemetry como instrumentação, com backends trocáveis.**

- **Traces:** contexto propagado de ponta a ponta — do webhook recebido, pela fila BullMQ, até a chamada externa. **O `trace_id` viaja dentro do payload do job**; sem isso o rastro morre na borda da fila, que é justamente onde ele importa.
- **Métricas:** profundidade e idade de fila, taxa de erro por integração, latência p95 por endpoint, **atraso de timer de automação** (o indicador precoce mais importante do sistema — ver [ADR-0009](0009-motor-de-automacao.md)), custo de mensagem por organização.
- **Logs estruturados** em JSON (`pino`), sempre com `org_id`, `trace_id` e `user_id`. Nunca com conteúdo de mensagem, e-mail ou telefone — LGPD.

**Backends:** Sentry para erro e sessão de usuário (o plano gratuito atende o começo); Grafana Cloud para métrica e trace (o plano gratuito também atende). Ambos falam OTLP, então trocar depois é mudar um endpoint, não reinstrumentar.

**Auditoria é separada de log.** `audit_log` é uma tabela no Postgres, append-only, com quem fez o quê, em qual organização, quando e de onde. Ela é requisito de LGPD e de confiança do cliente, não ferramenta de depuração — e por isso não pode viver num serviço de log com retenção de 30 dias.

### Alertas que existem desde o dia um

| Alerta | Por quê |
|---|---|
| Timer de automação atrasado > 5 min | O motor parou. É o pior incidente possível e o mais silencioso. |
| Fila crescendo por > 10 min | Worker morto ou integração fora. |
| Taxa de erro de webhook Meta > 1% | Risco de a Meta desabilitar o endpoint. |
| Taxa de bounce de e-mail > 5% | Risco de reputação; agir antes do bloqueio. |
| Erro de conexão com Postgres | Pool esgotado ou Supavisor saturado. |
| Disco da VPS > 80% | Ver [ADR-0011](0011-infra-vps-docker-dokploy.md). |

## Alternativas consideradas

**Datadog / New Relic.** Melhores produtos da categoria. Descartados por custo — a precificação por host e por volume de log fica desproporcional a esta fase.

**Stack ELK auto-hospedada.** Descartada: o Elasticsearch consome mais recursos que toda a nossa aplicação e vira um segundo sistema para operar.

**Só Sentry.** Descartado: cobre erro muito bem, mas não dá métrica de fila nem trace através de job assíncrono — que é exatamente onde a nossa complexidade mora.

## Consequências

- Instrumentar dá trabalho e precisa entrar junto com cada módulo. Instrumentação retroativa nunca acontece.
- A propagação de contexto pela fila é um detalhe fácil de esquecer e caro de descobrir faltando. Deve estar no wrapper de job desde o primeiro worker.
- Disciplina de não logar PII precisa ser verificada por lint e por revisão de código, não por confiança.
- Uma métrica de custo por organização desde cedo permite responder "quanto custa este cliente?" — pergunta que aparece no primeiro mês em que a fatura do WhatsApp chegar ([ADR-0010](0010-canais-e-email.md)).
