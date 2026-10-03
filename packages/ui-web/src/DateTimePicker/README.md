# Seletores temporais

`DatePicker`, `TimePicker` e `DateTimePicker` são controlados por `value`/`onValueChange`. Vazio é string vazia. Contratos: data `YYYY-MM-DD`, hora `HH:mm` (24 horas), data com hora `YYYY-MM-DDTHH:mm`. São valores locais de calendário, não instantes UTC. Fuso, horário de verão, restrições de agendamento e conversão para timestamp pertencem ao módulo responsável/core.

A folha é um popover sólido (papel segurado, raio 32) ancorado no gatilho de escolha compartilhado. Data fecha ao escolher o dia; data e hora fica em rascunho até Confirmar (coluna de horários de 30 em 30 minutos, com o horário atual incluído quando cai fora do passo); hora tem colunas de hora e minuto (passo 5) e «Agora». Limpar envia vazio. A grade usa React DayPicker com localização pt-BR. Dentro de um `InlineField`, o gatilho vira o miolo da caixa do campo.

`ProgressComparison` recebe medidas já calculadas e um máximo comum. Barras agrupadas e sobrepostas têm legendas e nomes acessíveis individuais. Apenas a largura visual é limitada ao intervalo; a legenda preserva o valor original. Valores não finitos são exibidos como ausência de dados.
