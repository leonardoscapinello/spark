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
| Primeira resposta do ciclo | Primeira mensagem recebida do cliente no novo ciclo | Primeira resposta pública da equipe; nota interna não conta |
| Próxima resposta | Primeira mensagem recebida ainda sem resposta, após a primeira resposta do ciclo | Próxima resposta pública enviada com sucesso pela equipe |
| Atendimento total (resolução do ciclo) | Abertura ou reabertura | Encerramento do atendimento |
| Tempo em um conjunto de status | Primeira entrada em um dos status configurados | Objetivo configurado ou encerramento do ciclo |

Os dois compromissos essenciais são **primeira resposta** e **atendimento total**. Próxima resposta e permanência em status são objetivos adicionais configuráveis. O total acompanha o ciclo inteiro, descontando apenas períodos fora do calendário útil e pausas configuradas; responder não encerra esse relógio.

Uma mensagem recebida após o encerramento inicia um novo ciclo e um novo compromisso de primeira resposta. Mensagens durante um ciclo aberto não viram outra primeira resposta por simples passagem de tempo. Inatividade só encerra um ciclo quando houver uma regra explícita de encerramento. Na abertura manual ou proativa, o relógio de primeira resposta aguarda a primeira mensagem do cliente; o total começa na abertura.

Cada relógio possui orçamento, tempo útil consumido e resultado próprios. Cumprir a primeira resposta não significa cumprir a resolução. O prazo de um status não substitui o prazo total do ciclo.

No cronômetro de tempo em status, sair pausa o consumo e voltar retoma o saldo acumulado. As passagens continuam registradas separadamente para análise, sem renovar o compromisso a cada retorno.

Próxima resposta tem rodadas próprias: mensagens adicionais do cliente enquanto a equipe ainda não respondeu não movem o início nem o vencimento. Resposta em rascunho, nota interna e tentativa de envio que falhou não concluem a rodada. Respostas automáticas só contam quando a política declara isso explicitamente.

Um cronômetro opcional de acompanhamento pode contar durante a espera pelo usuário ou fornecedor, enquanto o de resolução fica pausado. Alertas de acompanhamento não alteram o orçamento da resolução.

## Status configuráveis

Página **Configurações → Operação → Status e SLA** permite criar, ordenar, editar e arquivar status. Cada status define:

- Nome e cor.
- Tipo operacional: ativo, espera ou encerrado.
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

## Catálogo de serviços do atendimento

O catálogo é compartilhado pelos atendimentos da organização, incluindo equipes comerciais e de suporte. Uma categoria comercial pertence ao atendimento; não transforma o catálogo em classificação de negócios ou etapas do CRM. Equipe, categoria e pipeline são conceitos distintos.

Categorias formam uma árvore de até três níveis: **N1 → N2 → N3**. N1 representa a família de serviços; N2 detalha o serviço; N3 detalha a solicitação. Exemplo: Suporte → Acesso → Recuperação de senha. A administração permite expandir os nós e gerenciar as filhas no contexto do pai.

No atendimento e no editor de regras, selecionar N1 filtra N2; selecionar N2 filtra N3. Alterar um ancestral limpa descendentes incompatíveis. Selecionar diretamente uma filha por busca preenche seus ancestrais. Não é possível combinar ramos distintos. Classificações parciais em N1 ou N2 são válidas; uma regra que exige N3 não corresponde a um atendimento classificado apenas até N2.

Cadastros têm identificadores estáveis, ordem e arquivamento. Nomes podem ser alterados sem perder vínculos. Arquivar um pai retira sua subárvore de novas seleções; referências existentes permanecem legíveis. Mover categorias entre pais requer prévia das classificações e políticas afetadas, aplicação consistente e auditoria, preservando o caminho histórico.

## Impacto, urgência e matriz de prioridade

Impactos, urgências e prioridades são cadastros configuráveis da organização, com nome, descrição, ordem e arquivamento. Impacto expressa a extensão da consequência; urgência expressa a necessidade de rapidez. **Impacto × urgência determina a prioridade**, por uma matriz editável, sem fórmula ou enumeração fixa no código.

A matriz mostra impactos nas linhas e urgências nas colunas; cada célula seleciona uma prioridade ativa. Publicar uma versão exige preencher todas as combinações ativas. Criar ou arquivar níveis exige revisar a matriz antes de ativar a alteração. Versões anteriores continuam identificáveis no histórico.

Sem impacto ou urgência informados, mostrar **Prioridade não definida**: somente regras de SLA sem filtro de prioridade podem corresponder. Não assumir uma prioridade silenciosamente. Alterar impacto ou urgência recalcula a prioridade e a política aplicável, preservando o tempo consumido. Mudanças administrativas da matriz seguem a mesma regra de versionamento das políticas: novos ciclos por padrão; aplicação aos abertos com prévia e auditoria.

## Categoria, prioridade e seleção de política

O editor de políticas apresenta **N1, N2, N3, prioridade, primeira resposta, atendimento total e calendário**, além dos objetivos adicionais e ações dos status. Categoria vazia significa escopo geral; prioridade vazia significa todas as prioridades. Filtrar N2 ou N3 inclui seus ancestrais automaticamente. Todos os oito escopos abaixo são permitidos.

O requisito é selecionar do mais específico para o menos específico. Para o caso concorrente entre profundidade da categoria e prioridade, a **recomendação de desempate** é profundidade primeiro, prioridade depois; essa escolha não foi explicitamente definida pelo usuário:

| Ordem de busca | Categoria | Prioridade |
|---|---|---|
| 1 | N1 + N2 + N3 | Específica |
| 2 | N1 + N2 + N3 | Todas |
| 3 | N1 + N2 | Específica |
| 4 | N1 + N2 | Todas |
| 5 | N1 | Específica |
| 6 | N1 | Todas |
| 7 | Geral | Específica |
| 8 | Geral | Todas |

Somente ancestrais do caminho do atendimento participam da busca; nunca categorias irmãs. Por essa recomendação, uma regra de N3 sem prioridade vence uma de N2 com prioridade. A simulação deve mostrar a regra vencedora, sua posição e os motivos de descarte das demais.

Recomendação: selecionar uma política completa, sem misturar silenciosamente prazos de linhas distintas. Cada linha declara os dois objetivos essenciais e seus orçamentos; objetivos desabilitados precisam ser explícitos. Bloquear duas políticas ativas para o mesmo caminho e prioridade. Uma política geral pode cobrir os casos sem regra específica. Sem correspondência e sem padrão, mostrar **Sem política de SLA**, nunca um prazo inventado. Equipe e canal não entram implicitamente nesse desempate.

A política também configura calendário, ação de cada status por cronômetro, limite de atenção da barra e simulação de entrada, pausa, resposta e encerramento.

Recomendação para mudança de categoria/prioridade durante um ciclo: selecionar a nova política e reaplicar o orçamento mantendo o consumo acumulado dos objetivos equivalentes. Se passaram 3 horas úteis e a nova prioridade permite 2 horas, o prazo já está vencido em 1 hora. Nunca conceder outras 2 horas silenciosamente. Segmentos anteriores preservam o calendário e a versão usados; a nova configuração governa os segmentos seguintes.

A migração entre políticas vincula objetivos por identidade estável. Para um objetivo recém-adicionado, a política declara seu marco de início (abertura do ciclo ou evento de ativação), e a prévia mostra o efeito. Objetivos removidos ficam no histórico com motivo; resultados concluídos não são reescritos. Trocar uma política não zera o relógio.

## Organização administrativa proposta

A navegação deve explicitar o domínio configurado e manter as regras próximas do seu contexto:

- **Atendimento:** Catálogo de serviços; Status; Impactos e urgências; Prioridades e matriz; Políticas de SLA.
- **CRM → Funis e etapas:** busca e seleção de funil, suas etapas e **Regras da etapa** no detalhe da etapa selecionada. Campos obrigatórios/importantes, condições de transição e prazos ficam nesse contexto, substituindo a entrada solta “O que cada etapa exige”.
- **Organização → Calendário útil e feriados:** configuração compartilhada pelas operações.
- **Organização → Equipes:** equipes comerciais e de suporte, responsáveis e permissões.
- **Campos personalizados:** campos organizados por entidade; o cadastro do campo é separado da sua exigência em uma etapa específica.

Esses destinos substituem os nomes provisórios “Operação” das seções anteriores. Muitos funis não devem produzir uma lista única e extensa de todas as etapas. O contexto selecionado precisa permanecer visível e pesquisável. Catálogo usa árvore; matriz usa grade; SLA usa tabela de escopos com editor e simulador. Permissões administrativas são separadas da leitura operacional necessária para classificar e atender.

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
2. Administrador gerencia catálogo de três níveis, status, impactos, urgências, prioridades, matriz e políticas sem alteração de código. Seletores filtram descendentes e impedem caminhos inválidos.
3. Primeira resposta e atendimento total, assim como objetivos adicionais habilitados, usam calendário útil e mostram barras coerentes. Novo contato após encerramento inicia novo ciclo; mensagens adicionais no ciclo não renovam a primeira resposta.
4. Reabertura conserva o ciclo encerrado e inicia um novo ciclo.
5. Retorno a status retoma o consumo do mesmo ciclo; troca de categoria/prioridade mantém o consumo e aplica a regra explícita de orçamento.
6. Mensagens, ações manuais e automações respeitam as mesmas regras.
7. Testes cobrem fim de semana, intervalo, feriado, virada do ano, fuso, pausa antes/depois do vencimento, primeira/próxima resposta, várias mensagens antes de uma resposta, encerramento, reabertura, idas e voltas de status, concorrência, seleção ambígua de política e alteração de configuração.
8. Testes cobrem os oito escopos de seleção, conflito entre profundidade e prioridade, classificação parcial, ausência de política, duplicidade, matriz incompleta e recálculo sem reiniciar consumo.
9. Administração organiza catálogo, matriz e SLA em Atendimento; regras das etapas ficam no contexto do funil e da etapa.
10. Migração compatível, permissões, sincronização e `pnpm check` aprovados antes de declarar a funcionalidade entregue.
