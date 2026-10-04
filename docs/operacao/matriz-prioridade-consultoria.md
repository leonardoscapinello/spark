# Classificação e SLA

Impacto, urgência e prioridade usam três níveis: Alto, Médio e Baixo.

| Impacto / Urgência | Alto | Médio | Baixo |
|---|---|---|---|
| Alto | Alto | Alto | Médio |
| Médio | Alto | Médio | Baixo |
| Baixo | Médio | Baixo | Baixo |

A matriz é editável. Impacto indica a consequência para o negócio; urgência indica quanto a demanda pode esperar.

Na tela de SLA, cada linha contém categoria N1/N2/N3, impacto, urgência, prioridade automática e prazos de primeira resposta e atendimento total em minutos úteis. Sem impacto e urgência, o prazo é geral para a categoria. Com ambos, o prazo pertence à combinação, mesmo que outro par produza a mesma prioridade.

A busca começa na categoria mais específica e recua até a regra geral. Dentro da categoria, procura o par, depois uma regra anterior por prioridade, depois a regra geral. Regras existentes por prioridade continuam válidas.

Cada categoria pode preencher impacto e urgência ao ser selecionada no atendimento. Os padrões pertencem à categoria exata, sem herança. Sem padrão, o campo fica vazio; ajustes manuais são permitidos. Alterações de configuração não reclassificam atendimentos retroativamente. Reclassificação preserva o tempo consumido.
