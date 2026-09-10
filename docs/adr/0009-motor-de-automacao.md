# ADR-0009 — Motor de automação: estado em Postgres, execução em BullMQ

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

Este é o componente mais difícil do produto e o que decide se ele funciona ou não. Uma automação real se parece com:

> Contato entrou no segmento "Carrinho abandonado"
> → espera 1 hora
> → envia template de WhatsApp
> → espera resposta por até 24 h
>   → se respondeu: cria negócio e atribui a um vendedor
>   → se não respondeu: espera 2 dias → envia e-mail → espera 3 dias → aplica tag "frio"

Do ponto de vista técnico isso é uma **execução durável**: um processo de longa duração, com esperas de dias, que precisa sobreviver a deploy, reinício e falha; retomar exatamente de onde parou; nunca executar o mesmo passo duas vezes; e continuar rodando corretamente enquanto a automação é editada por baixo dele.

Duas armadilhas a evitar desde o início:

1. **Fila com jobs atrasados de dias.** Um `delay` de 3 dias no BullMQ mantém o job na memória do Redis. Com centenas de milhares de contatos em espera, o Redis vira o gargalo e o ponto único de perda de dado.
2. **Editar a automação afeta quem já está rodando.** Se o grafo é mutável, mudar um nó reescreve o histórico de execuções em curso — e ninguém consegue explicar ao cliente por que aquele contato recebeu aquela mensagem.

## Decisão

**O Postgres guarda o estado e o tempo. O BullMQ só transporta trabalho pronto para executar agora.**

### Modelo de dados

```
automations              (id, org_id, nome, status, versao_ativa_id)
automation_versions      (id, automation_id, versao, grafo jsonb)   ← IMUTÁVEL
automation_runs          (id, version_id, contact_id, status,
                          no_atual, contexto jsonb, iniciado_em)
automation_run_steps     (run_id, no_id, tentativa, resultado, em)  ← auditoria + idempotência
automation_timers        (run_id, disparar_em, reivindicado_em)     ← o relógio
```

`automation_versions.grafo` é **imutável**. Publicar uma edição cria uma nova versão; execuções em andamento terminam na versão em que começaram. É isso que torna o comportamento explicável meses depois.

### O relógio

Toda espera vira uma linha em `automation_timers`. O `apps/scheduler` roda a cada poucos segundos:

```sql
UPDATE automation_timers
   SET reivindicado_em = now()
 WHERE id IN (
   SELECT id FROM automation_timers
    WHERE disparar_em <= now() AND reivindicado_em IS NULL
    ORDER BY disparar_em
    FOR UPDATE SKIP LOCKED
    LIMIT 500
 )
RETURNING run_id, id;
```

`FOR UPDATE SKIP LOCKED` é o coração da decisão: permite **N schedulers em paralelo sem coordenação e sem entrega dupla**, e escala para milhões de timers pendentes com um índice em `(disparar_em) WHERE reivindicado_em IS NULL`. Os `run_id` retornados vão para o BullMQ, que executa **um passo** e devolve o controle.

Esperar 3 dias custa uma linha em disco. Executar custa um job de segundos. É a separação que dá a economia.

### Idempotência

Toda ação com efeito externo (enviar e-mail, disparar template, chamar webhook) grava em `automation_run_steps` com chave única `(run_id, no_id, tentativa)` **antes** de executar, e usa chave de idempotência no provedor quando ele suporta. Reprocessar um job nunca reenvia uma mensagem.

### Consistência com o resto do sistema

Eventos de domínio saem por **padrão outbox**: o caso de uso grava o evento na mesma transação da mudança de negócio, e um relay publica no BullMQ. Sem isso, um crash entre o `COMMIT` e o `enqueue` perde a automação em silêncio — e esse bug é invisível até virar prejuízo.

### O que roda no BullMQ

Trabalho de segundos, não de dias: processar webhook recebido, executar um passo de automação, enviar um e-mail, publicar um post social, sincronizar integração, calcular segmento.

Filas separadas por criticidade e latência (`webhooks`, `automation`, `email`, `social`, `sync`), cada uma com sua concorrência, para que um lote de 100 mil e-mails não atrase a resposta de uma conversa.

## Alternativas consideradas

**Temporal.** É o padrão-ouro de execução durável, e resolveria isto de forma superior. Descartado por operação: exige um cluster próprio (com banco próprio), tem curva de aprendizado real com replay determinístico, e o Temporal Cloud parte de ~US$ 100/mês. Reconsiderar quando o motor de automação passar a ser o gargalo de engenharia — provavelmente não antes de 18 meses.

**Inngest.** A melhor experiência de desenvolvimento das opções. Descartado por um fato eliminatório: **não é auto-hospedável** — é um serviço proprietário. Enviar cada passo de automação de dados de clientes para um terceiro é um risco de LGPD e um custo variável que não controlamos.

**Trigger.dev (Apache 2.0, auto-hospedável).** Alternativa legítima e a mais próxima de ser escolhida. Descartada por um motivo específico: nosso caso não é "rodar código durável genérico", é **interpretar um grafo que o usuário desenhou na tela**. O grafo já precisa existir como dado em Postgres para ser editado, versionado e auditado. Ter o estado no Postgres *e* num orquestrador externo cria duas fontes de verdade sobre a mesma execução.

**Só BullMQ com jobs atrasados.** Descartado pela armadilha (1) do contexto.

**pg-boss (fila dentro do Postgres, sem Redis).** Menos uma peça de infra e uma opção honesta. Descartado: em volume de webhook, colocar a fila no mesmo Postgres que guarda o dado de negócio faz as duas cargas competirem pelo mesmo recurso — exatamente no momento de pico.

## Consequências

- Escrevemos e mantemos o interpretador de grafo. É o código mais crítico do repositório: cobertura de teste alta e revisão obrigatória por dois devs.
- A tabela de timers precisa de vigilância: índice parcial correto, `autovacuum` agressivo, e alerta em `disparar_em` muito atrasado (é o sinal precoce de que o motor parou).
- Ganhamos auditoria completa de graça. "Por que esse contato recebeu isso?" se responde com um `SELECT` em `automation_run_steps` — e essa pergunta vai ser feita toda semana.
- Editar automação com execuções em andamento tem semântica clara e explicável. É requisito de produto, não detalhe técnico.
- A porta para o Temporal fica aberta: como o estado já está normalizado em Postgres, migrar o executor depois não exige remodelar o domínio.
