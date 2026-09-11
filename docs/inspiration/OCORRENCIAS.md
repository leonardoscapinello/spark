# Ocorrências da coleta

## ManyChat: indicador de salvamento ao sair de um seletor

Durante a inspeção do editor existente, foram abertos os catálogos de gatilhos, nós, ações e campos de condição. Não houve digitação, seleção de uma nova ação/campo nem alteração deliberada do grafo. Ao fechar o seletor de condição com Escape, a UI apresentou “Salvando…”. A navegação voltou à versão publicada; não foi acionado Atualização, teste ou envio.

Não é possível afirmar que nenhum estado de editor foi persistido. A lista consultada depois ainda indicava modificação da automação original há sete dias e os gatilhos ativos, mas isso não prova ausência de rascunho. A ocorrência foi informada ao usuário. A coleta posterior ficou na visualização publicada e em configurações sem gravação deliberada. Não entrar novamente no editor operacional para testar drag, conexão ou publicação.

## Intercom: modelo criado implicitamente e teste acionado por engano

No catálogo de e-mails de notificação havia “E-mail de notificação — Padrão” e botão Configuração. Abrir esse botão levou a `/notification-templates/new` e depois a um recurso com ID, título “New Custom Email Template” e editor preenchido com placeholders. Não houve digitação ou clique deliberado em Salvar.

Após capturar o editor, uma tentativa de clicar Cancelar por índice da árvore atingiu Enviar e-mail de teste: os índices haviam mudado. A UI mostrou “Enviando…” e depois retornou ao botão normal. Não foi informado destinatário, e a interface observada não confirmou destinatário ou entrega. O envio deve ser considerado acionado; não afirmar que falhou ou não saiu.

O editor foi então cancelado usando o nome exato do botão. O catálogo voltou exibindo “Personalizado” e Editar. Portanto houve persistência aparente do modelo mesmo sem Salvar. Não foi tentada exclusão/reversão sem conhecer o efeito do controle sobre o modelo padrão. As capturas I038–039 registram editor e estado final. O usuário foi informado no momento da ocorrência.

A partir desse ponto, controles com efeitos externos não devem ser acionados por índices que possam ter sido invalidados por uma captura. Preferir localizadores por nome e nunca usar envio como parte de exploração visual.

## Emulação responsiva Pipedrive

A tentativa P026 de viewport 390 × 844 não modificou o layout, que permaneceu desktop. Esse arquivo não comprova mobile. P027 usou emulação nativa de dispositivo 440 × 956, com layout reportado de largura 980. P028 usou iPad Pro 1024 × 1366. O modo de dispositivo e DevTools foram fechados após a captura.

## Medições e emulação adicionais

As primeiras medidas Intercom não atravessavam o Shadow DOM da área de conversas e incluíam alguns elementos ocultos. Uma coleta adicional no DOM aberto do componente, com filtro de visibilidade ancestral, mediu os painéis efetivos. O capítulo visual distingue os arquivos e seus limites.

Intercom foi capturado em viewport efetivo 1024 × 1366 e 440 × 956; DevTools foi fechado depois. Ao tentar repetir no ManyChat, o acesso nativo deixou de devolver elementos da janela. O viewport permaneceu 1069 × 921 (desktop com espaço reduzido). A tentativa de fechar via atalho do tab não restaurou os 1800 px, portanto não afirmar restauração completa dessa última janela.
