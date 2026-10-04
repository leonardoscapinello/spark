# Matriz de prioridade — consultoria de negócios e IA

Base inicial cadastrada em 4 de outubro de 2026. É uma política operacional proposta para esta consultoria, editável na administração; não é uma matriz obrigatória de ITIL nem uma promessa contratual de prazo.

## Decisão e fundamento

Adotamos três impactos, três urgências e cinco prioridades. As nove combinações cabem em uma tabela e tornam a triagem explicável. Mais níveis neste início criariam distinções difíceis de sustentar sem histórico. A categoria identifica o serviço; impacto e urgência identificam a condição concreta daquele atendimento. Um cliente grande, um contrato valioso ou a palavra “urgente” não determinam prioridade sozinhos.

A Atlassian apresenta matrizes como exemplos adaptáveis, e não uma tabela universal. Seu manual de resposta recomenda documentar a severidade de modo que as equipes avaliem consequências de forma consistente. A documentação de ServiceNow também calcula prioridade a partir de impacto e urgência. A tabela abaixo e os exemplos de IA são nossa adaptação operacional.

- [Atlassian: construir uma matriz de impacto e urgência](https://support.atlassian.com/jira-service-management-cloud/docs/how-do-i-create-a-matrix-using-impact-and-urgency-values/)
- [Atlassian: processo de resposta a incidentes](https://www.atlassian.com/incident-management/handbook/incident-response)
- [ServiceNow: priorização por impacto e urgência](https://www.servicenow.com/docs/r/yokohama/it-service-management/prioritise-problems.html)

## Matriz cadastrada

| Impacto / urgência | Alta | Média | Baixa |
|---|---|---|---|
| Alto | P1 — Crítica | P2 — Alta | P3 — Normal |
| Médio | P2 — Alta | P3 — Normal | P4 — Baixa |
| Baixo | P3 — Normal | P4 — Baixa | P5 — Planejada |

A prioridade nunca diminui ao aumentar impacto ou urgência. P1 exige os dois eixos altos; isso protege a capacidade de resposta a uma emergência. Impacto baixo não significa automaticamente que o atendimento pode esperar: urgência alta resulta em P3. Um programa estratégico de grande alcance, sem dano atual ou prazo iminente, pode ser alto impacto e baixa urgência, também P3.

## Critérios de impacto

### Alto — operação crítica

Processo essencial indisponível ou comprometido, perda financeira relevante, clientes afetados em escala, exposição de dados ou agente executando ações indevidas com dano material. Um único usuário ou cliente pode representar alto impacto se controla uma operação crítica. Ex.: integração de pedidos parada ou agente realizando cobranças incorretas.

### Médio — operação parcial

Uma equipe, etapa ou entrega relevante está prejudicada, com efeito limitado e controlável. O restante da operação continua e não há evidência de dano crítico. Ex.: automação de qualificação de leads falhando em parte dos casos ou painel necessário à equipe indisponível.

### Baixo — efeito localizado

Efeito restrito, sem comprometer processo essencial, segurança ou entrega relevante. Inclui dúvidas, ajustes de apresentação e melhorias sem dano atual. Ex.: orientação para usar um assistente ou ajuste de texto em relatório interno.

## Critérios de urgência

### Alta — ação imediata

A demora amplia o dano agora, não existe alternativa segura, ou há compromisso crítico iminente comprovado. Ex.: agente enviando mensagens erradas em produção ou fechamento de pedidos bloqueado sem alternativa. Urgência deve ser sustentada por consequência e prazo; insistência do solicitante não basta.

### Média — espera limitada

Há alternativa temporária segura, mas ela tem custo, capacidade ou duração limitada; a demanda precisa avançar na próxima janela útil. Registre até quando o contorno funciona e o prazo da entrega. Ex.: executar manualmente uma rotina enquanto a integração é corrigida.

### Baixa — pode ser programada

A demanda pode esperar uma janela combinada sem ampliar dano relevante; existe alternativa sustentável ou o trabalho ainda é planejamento. Ex.: diagnóstico de IA, treinamento futuro ou melhoria sem bloqueio atual. Um projeto estratégico pode ter impacto alto e urgência baixa.

## Tratamento por prioridade

### P1 — Crítica

Mobilizar o responsável técnico e a liderança de atendimento; priorizar contenção e restauração segura, com comunicação ativa. Usar quando impacto e urgência forem altos. Em IA, interromper ações prejudiciais e acionar revisão humana. Não implica plantão 24/7 nem prazo contratado automaticamente.

### P2 — Alta

Tratar antes da fila normal. Designar responsável, confirmar o contorno e acompanhar até estabilização. Abrange impacto alto com urgência média ou impacto médio com urgência alta. Escalar se o dano aumentar ou o contorno deixar de ser seguro.

### P3 — Normal

Atender pela fila regular conforme o SLA aplicável e a data acordada. Abrange alto impacto sem urgência, efeito médio com espera limitada e efeito localizado que precisa de ação imediata. Confirmar evidências antes de elevar a prioridade.

### P4 — Baixa

Programar na capacidade disponível, observando o compromisso combinado e o SLA. Adequada para impacto médio com urgência baixa ou impacto baixo com urgência média. Não deixar sem responsável ou acompanhamento.

### P5 — Planejada

Organizar em agenda ou backlog com responsável e próxima revisão. Usar para impacto e urgência baixos, como dúvidas sem bloqueio e pequenas melhorias. Baixa prioridade não significa ausência de resposta ou encerramento automático.

## Roteiro de triagem

1. Identificar o serviço e o caminho N1 → N2 → N3, o ambiente afetado e se é incidente, solicitação ou entrega de projeto.
2. Registrar o que parou ou pode causar dano, quem foi afetado e a consequência concreta. Avaliar processo crítico, não apenas quantidade de pessoas.
3. Registrar quando começou, prazo externo comprovado e o que acontece se a resposta atrasar.
4. Confirmar se há alternativa segura, quem consegue executá-la e por quanto tempo ela sustenta a operação.
5. Selecionar impacto e urgência. A aplicação calcula a prioridade pela matriz; não há prioridade padrão silenciosa se faltar classificação.
6. Indicar responsável e próxima comunicação. Reavaliar quando o alcance, a consequência, o prazo ou a viabilidade do contorno mudarem.

Esses passos são orientação operacional. A descrição do nível orienta a equipe; não é um motor que interpreta automaticamente mensagens ou comprova evidências. As informações podem ser registradas na conversa ou nota interna disponível. A automação existente calcula a prioridade a partir dos dois níveis selecionados.

## Exemplos para calibrar a equipe

| Situação e evidência | Impacto | Urgência | Resultado |
|---|---|---|---|
| Agente produzindo cobranças indevidas para clientes, sem contenção | Alto | Alta | P1 |
| Integração de pedidos interrompida, procedimento manual seguro por poucas horas | Alto | Média | P2 |
| Qualificação automática de uma equipe parou e uma entrega crítica está iminente | Médio | Alta | P2 |
| Resposta incorreta isolada em ambiente de testes, sem publicação e sem prazo próximo | Baixo | Baixa | P5 |
| Painel operacional parcial falhou, equipe tem relatório manual temporário | Médio | Média | P3 |
| Treinamento de uma equipe agendável, sem operação bloqueada | Baixo | Baixa | P5 |
| Planejamento estratégico de IA para toda a operação, sem entrega iminente | Alto | Baixa | P3 |
| Ajuste localizado necessário para uma apresentação que começa agora | Baixo | Alta | P3 |

O mesmo sintoma muda de classificação conforme o contexto. Uma resposta incorreta de IA em teste não equivale a instruções erradas enviadas a clientes. Exposição de dados ou execução indevida pode ter alto impacto mesmo com uma pessoa afetada. Interromper a ação prejudicial é uma medida de contenção; a avaliação e o encaminhamento ao responsável não devem esperar a resolução definitiva.

## Relação com SLA e catálogo

Prioridade organiza o tratamento; o SLA estabelece compromissos de tempo. Os níveis não criam plantão, cobertura fora do expediente nem garantias de resolução. Os prazos devem refletir equipe, calendário útil, dependências e contrato. Não cadastramos prazos arbitrários nesta etapa.

O catálogo e a prioridade selecionam a política existente: categoria mais profunda primeiro; dentro do mesmo caminho, prioridade específica antes da regra para todas as prioridades. Uma política de N3 para todas as prioridades vence uma política geral de P1. Ao criar exceções, use o simulador para conferir que o prazo escolhido corresponde ao compromisso pretendido.

Trocar impacto ou urgência pode trocar a política aplicável, mas não deve apagar tempo já consumido no ciclo. Reabrir um atendimento encerrado inicia outro ciclo, preservando o anterior. Regras de pausa pertencem aos status e devem ser decididas por relógio. Não confundir “aguardando fornecedor” com impacto ou urgência baixos: a dependência não elimina a consequência para o cliente.

Projetos longos precisam de marcos e cronograma próprios. O SLA do atendimento mede a interação/solicitação; não deve prometer concluir uma implantação inteira em poucas horas.

## Acompanhamento inicial

Revisar a calibração após as primeiras quatro semanas: distribuição entre prioridades, casos reclassificados, tempo de primeira resposta, consumo de tempo útil, atrasos por dependência e motivos de escalonamento. São recomendações de acompanhamento, não relatórios novos implementados nesta entrega. Se quase tudo virar P1/P2, revisar os critérios e a triagem antes de ampliar prazos ou criar mais níveis. Se urgência aumentar durante a espera, registrar a evidência e reclassificar sem apagar o histórico.

## Local de manutenção

Em Administração → Atendimento → Matriz de prioridade, cada célula pode ser alterada e os critérios aparecem abaixo da tabela. Em Impacto, urgência e prioridade, edite os nomes, critérios, cores e habilitação. No atendimento, os critérios dos níveis selecionados aparecem junto à classificação. Tudo é configuração da organização; os nomes e combinações não estão fixados no cálculo do sistema.

## Padrões de classificação das categorias

Cada categoria de N1, N2 ou N3 pode configurar impacto e urgência padrão, inclusive apenas um dos dois ou nenhum. Ao trocar a categoria de um atendimento, aplicam-se exatamente os padrões da categoria escolhida: campos não configurados ficam vazios e não herdam de ancestrais. Limpar a categoria também limpa essa classificação. A equipe pode ajustar impacto e urgência em seguida; ações como troca de status não reaplicam os padrões.

A matriz calcula a prioridade a partir do par aplicado. Se faltar um nível ou combinação, a prioridade fica sem classificação. Categoria e prioridade selecionam a política de SLA pelas regras de precedência descritas acima. Atualizar o padrão de uma categoria não altera retroativamente os atendimentos. No catálogo, as colunas de impacto, urgência e prioridade calculada mostram o efeito esperado. Os padrões são opcionais e o catálogo previamente cadastrado permanece sem classificação automática até que sejam configurados.
