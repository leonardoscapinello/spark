# Seletores temporais

`DatePicker`, `TimePicker` e `DateTimePicker` são controlados por `value`/`onValueChange`. Vazio é string vazia. Contratos: data `YYYY-MM-DD`, hora `HH:mm` (24 horas), data com hora `YYYY-MM-DDTHH:mm`. São valores locais de calendário, não instantes UTC. Fuso, horário de verão, restrições de agendamento e conversão para timestamp pertencem ao módulo responsável/core.

O diálogo compartilha foco, fechamento e rolagem com Modal. Alterações ficam em rascunho até Aplicar; Cancelar não altera o valor; Limpar envia vazio. A grade usa React DayPicker com localização pt-BR. O relógio acompanha os seletores de horas/minutos e é decorativo, sem gesto de arrastar. O calendário e o relógio reorganizam-se pelo espaço disponível.

`ProgressComparison` recebe medidas já calculadas e um máximo comum. Barras agrupadas e sobrepostas têm legendas e nomes acessíveis individuais. Apenas a largura visual é limitada ao intervalo; a legenda preserva o valor original. Valores não finitos são exibidos como ausência de dados.
