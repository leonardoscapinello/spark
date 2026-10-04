# SLA em tempo útil e ciclos de atendimento

Estado: proposta de produto e implementação. Não representa funcionalidade já entregue.

## Comportamento solicitado

Todo SLA usa tempo útil e apresenta uma barra de consumo do prazo. O calendário é configurável no sistema, assim como os status e seus prazos. Encerrar e reabrir uma conversa não deve apagar o resultado do atendimento anterior.

## Calendário útil

Página **Configurações → Operação → Calendário útil**:

- Fuso horário da organização, independente do fuso do navegador.
- Dias da semana habilitados, início e fim do expediente e intervalo.
- Feriados por data ou período, com nome e recorrência anual opcional.
- Exceções de expediente reduzido, com horários explícitos.
- Prévia de um prazo: início, orçamento em horas úteis e vencimento calculado.

O mesmo cálculo atende atendimento e etapas do CRM. Um calendário ausente aparece como **Calendário não configurado**, sem assumir silenciosamente atendimento 24 horas ou SLA cumprido. Um calendário sem dias úteis não pode produzir um vencimento finito.

Validar intervalos ordenados, início anterior ao fim, fuso válido e exceções conflitantes. Fechamento tem precedência sobre expediente reduzido. Feriados recorrentes que atravessam o ano devem funcionar. O cálculo considera o fuso e alterações de horário de verão.

Exemplo de aceitação: expediente de segunda a sexta, 09h–18h, intervalo 12h–13h. Um prazo de 8 horas úteis iniciado sexta às 16h vence segunda às 16h. Se segunda for feriado, vence terça às 16h.

## Cronômetros configuráveis por objetivo

A política define os cronômetros; cada cronômetro pertence a um objetivo e ao ciclo de atendimento. Mudar de status não cria automaticamente um novo orçamento. Passagens são histórico; cronômetros são compromissos.

| Relógio | Início | Término |
|---|---|---|
| Primeira resposta do ciclo | Abertura ou reabertura | Primeira resposta pública da equipe; nota interna não conta |
| Próxima resposta | Primeira mensagem recebida ainda sem resposta, após a primeira resposta do ciclo | Próxima resposta pública enviada com sucesso pela equipe |
| Resolução do ciclo | Abertura ou reabertura | Encerramento do atendimento |
| Tempo em um conjunto de status | Primeira entrada em um dos status configurados | Objetivo configurado ou encerramento do ciclo |

Cada relógio possui orçamento, tempo útil consumido e resultado próprios. Cumprir a primeira resposta não significa cumprir a resolução. O prazo de um status não substitui o prazo total do ciclo.

No cronômetro de tempo em status, sair pausa o consumo e voltar retoma o saldo acumulado. As passagens continuam registradas separadamente para análise, sem renovar o compromisso a cada retorno.

Próxima resposta tem rodadas próprias: mensagens adicionais do cliente enquanto a equipe ainda não respondeu não movem o início nem o vencimento. Resposta em rascunho, nota interna e tentativa de envio que falhou não concluem a rodada. Respostas automáticas só contam quando a política declara isso explicitamente.

Um cronômetro opcional de acompanhamento pode contar durante a espera pelo usuário ou fornecedor, enquanto o de resolução fica pausado. Alertas de acompanhamento não alteram o orçamento da resolução.

## Status configuráveis

Página **Configurações → Operação → Status e SLA** permite criar, ordenar, editar e arquivar status. Cada status define:

- Nome e cor.
- Categoria operacional: ativo, espera ou encerrado.
- Participação nos cronômetros da política: contar, pausar ou concluir o objetivo.
- Prazo acumulado de permanência, quando a política incluir esse objetivo.
- Destino de abertura/reabertura, quando aplicável.

O nome é livre; o tipo operacional preserva o significado de ações como encerrar e reabrir. Esse tipo é diferente da categoria do atendimento (assunto/serviço). Renomear um status não muda sua identidade. Status arquivado permanece no histórico e não aceita novas entradas. Arquivar um status em uso exige indicar um destino para seus atendimentos.

**Aguardando cliente** pode pausar o prazo geral e ainda ter prazo próprio de acompanhamento. Isso evita confundir pausa de resolução com ausência de acompanhamento. Uma mensagem recebida pode tirar o atendimento da espera, conforme regra explícita; não deve redefinir seu status indiscriminadamente.

## Reabertura e histórico

Conversa, ciclo e passagem por status são registros distintos. Fechar encerra o ciclo atual e sua passagem. Reabrir cria outro ciclo na mesma conversa, preservando mensagens, consumo e resultados anteriores.

Regra confirmada com o usuário: retorno a status dentro do mesmo ciclo preserva o consumo acumulado. Uma edição de responsável, prioridade ou texto não inicia outro ciclo nem zera cronômetros.

Pausa é configurável por cronômetro e status, com espera pelo cliente ou fornecedor como exemplos. A pausa não restaura orçamento consumido. Um prazo já vencido continua vencido durante a pausa; a interface exibe também que a contagem está pausada.

Exemplo: um SLA de resolução de 8 horas úteis consumiu 3 horas em atendimento. Passa a aguardar o cliente, estado configurado para pausar esse cronômetro. Quando o cliente responde, restam 5 horas úteis. Se o atendimento for encerrado e mais tarde reaberto, o novo ciclo recebe o orçamento da política aplicável naquele momento; o anterior conserva seu resultado.

Aberturas manuais, mensagens recebidas, retomadas de adiamento e automações devem usar a mesma regra de transição. Repetir uma transição já aplicada não cria outro ciclo nem outra passagem. Transições concorrentes precisam ser serializadas por conversa.

## Barra de progresso

- Barra representa **tempo útil consumido**: cresce de 0% a 100%.
- Verde enquanto há margem; amarelo ao se aproximar do limite; vermelho no vencimento. Proposta inicial: atenção a partir de 80%.
- Texto complementa a cor: “3 h de 8 h úteis · restam 5 h”, por exemplo.
- Ao vencer, barra permanece cheia e o texto mostra o excedente em tempo útil.
- Fora do expediente, a barra não avança e informa quando a contagem retoma.
- Pausa por status tem indicação própria, distinta de estar fora do expediente.
- Ao encerrar o relógio, o resultado fica congelado: cumprido ou vencido. O calendário avançar não altera o resultado.
- Sem prazo configurado não se exibe uma barra fictícia em 0%.
- Leitores de tela recebem consumo, orçamento e estado. A leitura não depende só da cor.

O atendimento mostra a barra compacta na lista e os relógios pertinentes no detalhe. Etapas do CRM usam o mesmo componente e o mesmo cálculo de tempo útil.

## Alterações de configuração

Versões de calendário e política usadas por um ciclo/passagem devem continuar identificáveis. Resultados encerrados não são recalculados retroativamente quando alguém altera expediente, feriado ou prazo.

Padrão proposto: novas versões de configuração valem para novos ciclos. Aplicar uma versão a atendimentos em andamento deve ser uma ação explícita, com prévia do impacto e auditoria.

## Categoria, prioridade e seleção de política

Status, categorias e prioridades são cadastros da organização, com identificadores estáveis, nomes, ordem e arquivamento. A administração não depende de listas fixas no código. Referências históricas sobrevivem ao arquivamento.

Página **Configurações → Operação → Políticas de SLA**:

- Critérios de aplicação por categoria e prioridade; escopo por equipe/canal quando necessário.
- Calendário aplicável.
- Orçamento em minutos/horas úteis para cada objetivo habilitado.
- Ação de cada status em cada cronômetro.
- Limite de atenção usado na barra e nos avisos.
- Prévia de quais atendimentos uma regra alcança e simulação de entrada, pausa, resposta e encerramento.

Uma política padrão pode cobrir os casos sem regra específica. Regras específicas usam precedência explícita; publicar critérios ambíguos com mesma precedência deve ser recusado. Sem correspondência e sem padrão, mostrar **Sem política de SLA**, nunca informar um prazo inventado.

Recomendação para mudança de categoria/prioridade durante um ciclo: selecionar a nova política e reaplicar o orçamento mantendo o consumo acumulado dos objetivos equivalentes. Se passaram 3 horas úteis e a nova prioridade permite 2 horas, o prazo já está vencido em 1 hora. Nunca conceder outras 2 horas silenciosamente.

A migração entre políticas vincula objetivos por identidade estável. Para um objetivo recém-adicionado, a política declara seu marco de início (abertura do ciclo ou evento de ativação), e a prévia mostra o efeito. Objetivos removidos ficam no histórico com motivo; resultados concluídos não são reescritos. Trocar uma política não zera o relógio.

## Estado de cada cronômetro

Guardar separadamente o estado de execução (contando, pausado, concluído, cancelado com motivo) e o resultado de prazo (no prazo ou vencido). Também distinguir pausa operacional de intervalo sem expediente.

Contar usa apenas a interseção dos intervalos ativos do cronômetro com os intervalos do calendário útil. O prazo é o orçamento menos esse consumo. As transições registram ator/origem, instante, status e versão de política, permitindo explicar cada resultado posteriormente.

As mudanças legítimas de orçamento ficam auditadas. Reinício acontece por novo ciclo ou por nova rodada de um objetivo recorrente, como próxima resposta; uma simples ida e volta entre status nunca renova esse compromisso.

## Base existente e lacunas verificadas

- Há `business_hours`, `holidays`, endpoints de escrita e coleções locais. Falta a página de configuração e o acesso de leitura para usuários apenas de atendimento.
- `operatingMillisecondsBetween`, em `packages/core`, já calcula expediente, intervalo e exceções. Precisa dos contratos de validação, precedência e casos de borda acima.
- O atendimento calcula primeira resposta com minutos corridos fixos por prioridade. Ainda não usa o calendário útil.
- Os status atuais são fixos: `open`, `snoozed`, `closed`.
- As prioridades atuais também são fixas: `normal`, `priority`; falta o cadastro de categorias e a seleção de política por categoria/prioridade.
- Reabrir limpa `resolvedAt`, mas não cria ciclo nem reinicia a primeira resposta.
- Existe `SlaProgress` no design system; a tela de atendimento hoje usa um sinal textual.
- A indisponibilidade atual do Electric é um bloqueio separado para validar sincronização ponta a ponta. Criar SLA não resolve essa conexão.

## Contrato de implementação

Regras de consumo e transição ficam em `packages/core`; dados consultáveis ficam em tabelas relacionais estáticas com isolamento por organização. A interface lê coleções locais. A API grava transição, ciclo, passagem e auditoria na mesma transação.

Status configuráveis são dados, sem criação de schema em runtime. As categorias atuais podem permanecer como contrato operacional durante uma migração compatível. Instantes históricos desconhecidos não devem ser inventados no preenchimento de dados antigos.

O servidor decide a política aplicável e os carimbos de entrada/saída. O navegador calcula a apresentação a partir dos registros sincronizados, usando a mesma regra do core. Um temporizador visual não grava no banco a cada minuto.

## Critérios de entrega

1. Administrador configura expediente, fuso, intervalos e feriados na interface.
2. Administrador cria status, categorias, prioridades e políticas; configura prazo e pausa por cronômetro sem alteração de código.
3. Os três relógios usam o calendário útil e mostram barras coerentes.
4. Reabertura conserva o ciclo encerrado e inicia um novo ciclo.
5. Retorno a status retoma o consumo do mesmo ciclo; troca de categoria/prioridade mantém o consumo e aplica a regra explícita de orçamento.
6. Mensagens, ações manuais e automações respeitam as mesmas regras.
7. Testes cobrem fim de semana, intervalo, feriado, virada do ano, fuso, pausa antes/depois do vencimento, primeira/próxima resposta, várias mensagens antes de uma resposta, encerramento, reabertura, idas e voltas de status, concorrência, seleção ambígua de política e alteração de configuração.
8. Migração compatível, permissões, sincronização e `pnpm check` aprovados antes de declarar a funcionalidade entregue.
