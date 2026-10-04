# @spark/ui-web

Design system web sobre Base UI (ADR-0020).

## Classificação e formulários administrativos

- **Impacto:** círculo com exclamação; **urgência:** relógio; **prioridade:** bandeira. Use `ClassificationValue` em tabelas e detalhes e `classificationKind` nas opções de `Select`. Não use chips com bolinhas para essas dimensões.
- Cor complementa o nome e o ícone: **Baixo verde, Médio amarelo, Alto vermelho**. Preserve cores configuradas pelo usuário; não deduza a cor pelo texto. Valor ausente tem cor neutra e texto “Não definida”.
- **Valor calculado continua sendo campo.** Use `ClassificationValue` com `fieldLabel` para prioridade automática. Ele reutiliza `Field`, `Label` e `Input readOnly`: mesma altura, largura, tipografia e recuo dos demais campos, sem seta de seleção ou aparência desabilitada. Não estique um chip no lugar de um campo.
- Rótulos permanecem visíveis. Agrupe controles relacionados sob um título curto; uma frase explica o efeito quando necessário. Em status, “Contagem do SLA” reúne “Continuar contando” e “Pausar contagem”; a ação ao receber mensagem fica separada.
- Entrada deve tolerar formatação previsível. `ColorPicker` aceita hexadecimal com ou sem `#`, ignora espaços externos e normaliza o prefixo. Não apresente erro enquanto o usuário ainda digita; valide ao sair e preserve o rascunho para correção.
- Cores do consumo de SLA representam o prazo, não a prioridade: verde no prazo, amarelo no limite de alerta configurado e vermelho ao atingir o prazo.

Exemplos no Storybook: **Campos/Classificação**, incluindo formulário completo, valor automático e estado sem classificação. Novas telas devem consumir esses componentes; aparência e semântica visual ficam no design system.

## Filtros de tabela

Colunas filtráveis declaram `filterValue`, um texto ou `null` para vazios. O menu no cabeçalho oferece busca, seleção múltipla e limpeza. Valores dentro da coluna se combinam com OU; colunas diferentes se combinam com E. O filtro ativo fica visível e há limpeza global. Nunca extraia valores de nós React.

Passe o conjunto completo de linhas e `pageSize` para tabelas paginadas: a tabela filtra e ordena antes de paginar. Assim, opções e resultados abrangem todas as páginas. Exemplo no Storybook: Dados/Tabela/FiltrosPorColuna.

### Detalhes do atendimento

Em painéis estreitos, nomes e categorias usam a largura inteira, com rótulo acima. Use `Select wrapValue` para valores longos: a seleção deve ser legível sem depender de tooltip. Separe classificação e SLA em seções; não repita a prioridade manual como se fosse a prioridade calculada. `SlaProgress` aceita `status` e `detail` para separar o nome do prazo, seu estado e os tempos em horas/minutos úteis. Não comprima tudo numa linha com reticências. Exiba apenas o ciclo selecionado; o histórico é acessado pelo seletor de ciclo.
