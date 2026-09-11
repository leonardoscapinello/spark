# Feedback e janelas de trabalho

Monte `Toaster` uma única vez na raiz. `notify({ title, description, tone, actions }, { id, duration })` apresenta um toast usando a mesma `Notification` da lista. Um ID estável permite atualizar uma mensagem; `dismissNotification(id)` a dispensa. Ações são conteúdo fornecido pelo consumidor. Para uma mensagem persistente, use duração infinita e mantenha o botão de dispensar.

`NotificationList` recebe itens e callbacks `onRead`/`onDismiss`. Estado, persistência, entrega e sincronização das notificações pertencem à aplicação.

`ModalContent` aceita tamanhos `default`, `wide` e `workspace`. `ModalColumns` distribui `ModalColumn` conforme o espaço disponível, empilhando em viewports estreitos. Cabeçalho e rodapé permanecem fora da rolagem do conteúdo. As colunas recebem componentes reais; não implementam regras do CRM.

`ActionModal` recebe abertura controlada e `onConfirm` síncrono ou assíncrono. Enquanto pendente bloqueia confirmação repetida e fechamento pela interface. Falhas mantêm a janela aberta com opção de tentar novamente. O callback é responsável por validar e persistir antes de resolver. Os exemplos do catálogo são locais e não alteram dados reais.

O popover existente permanece a base de ações e formulários compactos. O catálogo inclui um exemplo de edição com botões explícitos.
