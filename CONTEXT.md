# Spark

Vocabulário do produto para acompanhar relações comerciais e atendimentos.

## Atendimento e prazos

**Conversa**: Histórico contínuo de comunicação com uma pessoa em um canal. Pode conter vários ciclos de atendimento.

**Ciclo de atendimento**: Período entre a abertura ou reabertura de um atendimento e seu encerramento. Um ciclo encerrado conserva seu resultado mesmo quando a conversa volta a ser atendida.

**Status de atendimento**: Estado configurável que representa onde um atendimento está no fluxo da equipe, como em atendimento ou aguardando cliente.

**Passagem por status**: Uma permanência contínua em determinado status dentro de um ciclo de atendimento. Retornar ao mesmo status constitui outra passagem.

**Categoria de atendimento**: Classificação configurável do assunto ou serviço solicitado, como suporte técnico ou financeiro.

**Prioridade de atendimento**: Classificação configurável da urgência de um atendimento, com uma ordem explícita entre seus níveis.

**Política de SLA**: Conjunto versionado de compromissos de prazo, critérios de aplicação e regras dos cronômetros de um atendimento.

**Cronômetro de SLA**: Medição de tempo útil consumido para um objetivo dentro de um ciclo de atendimento. Pode atravessar várias passagens por status sem perder o consumo acumulado.

**Rodada de resposta**: Período iniciado pela primeira mensagem do cliente ainda sem resposta e concluído pela resposta pública da equipe. Mensagens adicionais do cliente na mesma rodada não reiniciam seu prazo.

**Calendário útil**: Expediente, intervalos, fuso horário, feriados e exceções que determinam quando a equipe trabalha.

**SLA**: Compromisso de prazo para um objetivo do atendimento ou de outra operação. O prazo é medido em tempo útil segundo o calendário aplicável.

**Pausa de SLA**: Intervalo em que um relógio de SLA não consome seu orçamento de tempo, conforme a regra do status. É diferente de encerrar o atendimento.
