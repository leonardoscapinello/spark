# Spark

Vocabulário do produto para acompanhar relações comerciais e atendimentos.

## Atendimento e prazos

**Conversa**: Histórico contínuo de comunicação com uma pessoa em um canal. Pode conter vários ciclos de atendimento.

**Ciclo de atendimento**: Período entre a abertura ou reabertura de um atendimento e seu encerramento. Um ciclo encerrado conserva seu resultado mesmo quando a conversa volta a ser atendida.

**Status de atendimento**: Estado configurável que representa onde um atendimento está no fluxo da equipe, como em atendimento ou aguardando cliente.

**Passagem por status**: Uma permanência contínua em determinado status dentro de um ciclo de atendimento. Retornar ao mesmo status constitui outra passagem.

**Catálogo de serviços**: Árvore de serviços e solicitações de atendimento da organização, compartilhada por equipes comerciais e de suporte.

**Categoria de atendimento**: Nó configurável do catálogo de serviços, em primeiro, segundo ou terceiro nível. Cada filha pertence a um único pai; o caminho representa a classificação do atendimento.

**Impacto**: Classificação configurável da extensão das consequências da solicitação.

**Urgência**: Classificação configurável da necessidade de rapidez no atendimento.

**Prioridade de atendimento**: Ordem de atendimento resultante da combinação de impacto e urgência. Participa da seleção da política de SLA.

**Matriz de prioridade**: Mapeamento configurável de cada combinação de impacto e urgência para uma prioridade.

**Política de SLA**: Conjunto versionado de compromissos de prazo, critérios de aplicação e regras dos cronômetros de um atendimento.

**Cronômetro de SLA**: Medição de tempo útil consumido para um objetivo dentro de um ciclo de atendimento. Pode atravessar várias passagens por status sem perder o consumo acumulado.

**Primeira resposta do ciclo**: Compromisso entre a primeira mensagem do cliente no ciclo e a primeira resposta pública válida da equipe. Novo contato após encerramento inicia outro compromisso.

**Atendimento total**: Compromisso entre abertura e encerramento do ciclo, descontando períodos não úteis e pausas configuradas.

**Rodada de resposta**: Período iniciado pela primeira mensagem do cliente ainda sem resposta e concluído pela resposta pública da equipe. Mensagens adicionais do cliente na mesma rodada não reiniciam seu prazo.

**Calendário útil**: Expediente, intervalos, fuso horário, feriados e exceções que determinam quando a equipe trabalha.

**SLA**: Compromisso de prazo para um objetivo do atendimento ou de outra operação. O prazo é medido em tempo útil segundo o calendário aplicável.

**Pausa de SLA**: Intervalo em que um relógio de SLA não consome seu orçamento de tempo, conforme a regra do status. É diferente de encerrar o atendimento.

## Campos e relações

**Entidade proprietária do campo**: Tipo de registro ao qual um campo e seus valores pertencem, independentemente da tela que os apresenta.

**Grupo de campos**: Conjunto nomeado e ordenado de campos da mesma entidade para organizar seu preenchimento e apresentação.

**Exigência contextual**: Regra que solicita ou exige um dado para uma ação específica de um processo, inclusive um dado de registro relacionado.

**Referência compartilhada**: Acesso ao mesmo dado de um registro por diferentes contextos, sem criar cópias do valor.

**Cópia entre campos**: Transferência explícita de um valor para outro campo e registro, produzindo um valor independente no destino.
