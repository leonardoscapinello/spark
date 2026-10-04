# Classificação e SLA

Impacto, urgência e prioridade usam três níveis: Alto (vermelho), Médio (amarelo) e Baixo (verde). O consumo de SLA usa verde no prazo, amarelo no percentual de alerta e vermelho ao atingir o limite.

| Impacto / Urgência | Alto | Médio | Baixo |
|---|---|---|---|
| Alto | Alto | Alto | Médio |
| Médio | Alto | Médio | Baixo |
| Baixo | Médio | Baixo | Baixo |

A matriz é editável. Impacto indica a consequência para o negócio; urgência indica quanto a demanda pode esperar.

Na tela de SLA, cada linha contém categoria N1/N2/N3, impacto, urgência, prioridade automática e prazos de primeira resposta e atendimento total em minutos úteis. Sem impacto e urgência, o prazo é geral para a categoria. Com ambos, o prazo pertence à combinação, mesmo que outro par produza a mesma prioridade.

A busca começa na categoria mais específica e recua até a regra geral. Dentro da categoria, procura o par, depois uma regra anterior por prioridade, depois a regra geral. Regras existentes por prioridade continuam válidas.

Cada categoria pode preencher impacto e urgência ao ser selecionada no atendimento. Os padrões pertencem à categoria exata, sem herança. Sem padrão, o campo fica vazio; ajustes manuais são permitidos. Alterações de configuração não reclassificam atendimentos retroativamente. Reclassificação preserva o tempo consumido.


## Base preenchida e expansão automática

A tela de SLA cruza o catálogo ativo com todos os pares ativos de impacto e urgência. Uma nova categoria ou nível aparece sem criar políticas duplicadas. O campo “Origem do prazo” distingue regra própria, herança de categoria superior e regra geral. “Ajustar prazo” grava somente a exceção daquela linha; desabilitá-la restaura a herança. A busca inclui o caminho inteiro e os níveis. A paginação limita a tabela a 40 linhas.

Prazos gerais editáveis, definidos com o usuário:

| Prioridade | Primeira resposta | Atendimento total |
|---|---|---|
| Alto | 2 h úteis | 6 h úteis |
| Médio | 2 h úteis | 16 h úteis |
| Baixo | 2 h úteis | 24 h úteis |

Sem classificação: 2 h para resposta e 16 h para atendimento total. Alerta em 80% do tempo consumido. São metas iniciais de atendimento, não um compromisso de concluir um projeto inteiro de consultoria nesse prazo. Exceções de serviço podem ter 36 h ou outros valores.

Expediente inicial: segunda a sexta, 9h–12h e 13h–18h, America/Sao_Paulo. Incluídos os nove feriados nacionais de data fixa, anuais. Feriados locais, móveis e pontos facultativos dependem da operação e não foram presumidos. Referência: [calendário federal de 2026](https://agenciagov.ebc.com.br/noticias/202512/confira-o-calendario-oficial-de-feriados-nacionais-e-pontos-facultativos-em-2026).

O bootstrap `apps/api/scripts/bootstrap-service.mts` recebe organização e usuário responsável, roda sob contexto da organização e registra auditoria. Cria ausências, preenche apenas padrões vazios do catálogo inicial e preserva cadastros e prazos existentes. Catálogo, níveis, matriz e padrões estão em `packages/core/src/inbox/servicePresets.ts`. Não é executado ao abrir telas.
