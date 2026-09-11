# Intercom — atendimento e widget

Referências I001 etc. apontam para [INDICE.md](INDICE.md). A conta está em avaliação Essential e contém conversas demonstrativas; recursos bloqueados não foram tratados como disponíveis.

## Inbox e conversa

**I001–014, I026–032.** A área principal combina navegação global, navegação de caixas, lista de conversas, conversa selecionada e painel de detalhes. As três colunas funcionais são lista/conversa/detalhes; a navegação fica à esquerda delas. Separadores indicam redimensionamento.

Caixas e agrupamentos incluem suas conversas, menções, criadas por você, todas, não atribuídas, spam, equipes, membros, visualizações personalizadas e grupos relacionados ao Fin. O cabeçalho filtra estado e muda lista/tabela. Seleção na tabela abre um painel de conversa sobre a lateral; a tabela continua como contexto por baixo.

O cabeçalho da conversa reúne prioridade, atribuição, mais ações, ticket, adiar e encerrar. Atribuição distingue usuário, não atribuído e Fin; equipes são outra dimensão. Adiar oferece hoje, amanhã, segunda, semana, mês e data personalizada. Menus vistos não foram aplicados à conversa.

Responder e comentário interno são modos explícitos, com atalhos R/N. Comentário usa fundo amarelo. O botão de envio/anotação permanece desabilitado sem conteúdo. Cmd+K abre paleta com comandos da conversa. O menu mais oferece participantes, mesclar, nova conversa, exportar texto/PDF, eventos e fuso do cliente.

Estados de conversa: aberta, fechada e adiada. Estados de ticket apresentados: enviado, em andamento, aguardando cliente e resolvido. Converter para ticket abriu seleção/tipos de ticket; a conversão não foi aplicada.

## Painel do contato

**I009–013.** Abas Detalhes e Copiloto; blocos de atributos da conversa, dados do usuário, conversas recentes, notas, tags, etiquetas de conversa, segmentos, visualizações de página e aplicativos. Atributos incluem ID, título por IA, empresa, marca, assunto e pontuação CX. Dados pessoais incluem nome, empresa, tipo, localização, responsável, e-mail e identificador.

Tags do contato e etiquetas da conversa aparecem separadas. Tickets de acompanhamento, backoffice e conversas laterais exibiram restrições de plano. Campos e blocos são configuráveis, mas o efeito de edição e permissões por equipe não foi validado.

## Tabela, colunas e visualizações

**I028–032.** Cabeçalhos de usuário, empresa, título, atividade, descrição, prioridade, espera, última atividade, SLA, estado, equipe, atendente e tags; conteúdo com rolagem horizontal. O botão de adicionar coluna fica na extremidade direita. Catálogo amplo com campos de conversa, tickets, anexos, canal, criação, IA, SLAs e integrações. A árvore registra as opções encontradas; o catálogo virtualizado não garante que todas foram renderizadas de uma vez.

Nova visualização abre modal com nome, ícone e critérios para conversas/tickets. O filtro anunciou 93 atributos; parte fica atrás de carregamento virtual. A visualização não foi salva. A experiência desejada no Spark é configurar a tabela sem perder o contexto da seleção, com colunas e filtros como preferências explícitas.

## Equipes, macros e atribuições

**I015:** criar inbox de equipe levou a bloqueio do plano. Não há evidência do formulário completo de criação.

**I042–045:** macros em lista com pesquisa, pastas, filtros, exportação de uso/conteúdo, nome, editor rico com variáveis, ações e disponibilidade por público/contexto. Contextos observados: iniciar conversa, responder e adicionar anotação. Exemplos existentes incluem encerramento, bug, cobrança e pedido de recurso. Não foram alterados.

Atribuições mostram destinatário padrão quando workflow não atribui, autoatribuir ao responder ou manter não atribuído/equipe, presença de colegas, transferência ao Fin, ausência automática, motivos de ausência e reatribuição ao despertar quando responsável está ausente/no limite. Gestão de carga tem bloqueio de plano. Nenhuma política foi modificada.

## Widget de chat

**I016–023.** Configuração por web/widget, destaque, SDK móvel, conversas, geral, instalação e segurança. Conteúdo configurável para visitantes e usuários identificados. Espaços: início, tickets, ajuda, notícias e tarefas; acesso direto à conversa e controle de exibição do launcher. Prévia acompanha a configuração.

Tema sistema/claro/escuro, configurações por modo, cor principal, logotipo e marcas (parte bloqueada). Launcher à direita e afastamentos lateral/inferior; a tela informa posição inferior direita fixa no mobile. Não foi instalado widget em página externa.

Conversas: chamadas para ação, equipe/Fin, expectativa de resposta, horário de expediente, apresentação e aviso especial. Geral: novas conversas por visitantes, múltiplas conversas, busca de ajuda obrigatória, contato após avaliação negativa de artigo, respostas a conversas/tickets fechados, chamadas, idiomas e privacidade.

Instalação apresenta snippet e caminhos para frameworks/CMS, incluindo React, Angular, Vue, Ember, WordPress, Google Tag Manager e Shopify. Identificação autenticada e visitante anônimo têm caminhos distintos. Configuração de API/identidade não foi ativada.

A captura I001 é o widget de suporte **da própria Intercom dentro do produto**, não um widget do workspace instalado pelo pesquisador. As prévias das configurações são outra evidência e precisam continuar identificadas como prévias.

## Canais

**I024–025, I034–041.** Catálogo: Messenger, e-mail, telefone, WhatsApp, Instagram/Facebook, SMS, Switch, Slack, Discord e Telegram. Ausência de Google Business Messages/TikTok nesse catálogo não demonstra impossibilidade universal por integrações externas.

WhatsApp apresenta números empresariais, consumo, Fin, perfil e templates, janela de 24 horas, passagem do web chat para WhatsApp, regra para nova conversa após período e criação de lead versus correspondência por telefone. Sem número conectado; nenhum envio foi feito.

Facebook e Instagram exibem bloqueio. O texto do Instagram menciona DMs, respostas a stories, atribuição e transformação em lead/usuário. Isso não constitui cobertura de comentários/reels/live; esses gatilhos estão documentados no ManyChat.

## E-mail

**I034–039.** Adicionar endereço solicita e-mail e configuração de encaminhamento. O canal tem endereço próprio do workspace. A interface observada não apresentou autorização Gmail OAuth nesse fluxo.

| Grupo | Opções observadas |
| --- | --- |
| Respostas | Auto-resposta, precedência do workflow, auto-resposta recebida como spam, nova conversa ao responder conversa fechada |
| Remetente | Endereço do workspace, membro da equipe ou endereço de entrada |
| Encadeamento | Incluir histórico, preencher só remetente em vez de todos em Para/CC, dividir quando muda assunto |
| Entrada | Converter e-mail em ticket, escolher tipo padrão, detectar cliente em encaminhamento, endereços ignorados e confiáveis |
| Identidade | Assinatura padrão e domínio visual de links |
| Notificações | Entregabilidade, atualizações de conversa/ticket e template |
| Mídia | Arquivos hospedados como link ou anexo; interface indica 20 MB por e-mail para anexos; remover hyperlinks de entrada |

O editor de notificação mostra fundos do template/corpo, borda, fonte, links, tamanhos de título/parágrafo/texto pequeno e prévia móvel. Os valores desse editor pertencem ao **e-mail enviado**, não à tipografia da interface Intercom. Houve criação implícita de modelo e acionamento acidental de teste durante a navegação: detalhes em [ocorrências](../OCORRENCIAS.md). Não alegar sessão inteiramente sem alterações.

## Tickets, contatos, conhecimento e relatórios — coleta adicional

**I046–049:** tipos de ticket são agrupados em cliente, rastreador e backoffice. Cliente acompanha uma solicitação; rastreador reúne conversas de um problema comum; backoffice permite colaboração interna. Tipo existente tem categoria, descrição, compartilhamento com cliente, preenchimento de título/descrição por IA, estados e atributos. Os exemplos de atributos incluem plataforma e causa raiz.

Os estados têm etiqueta interna e etiqueta visível ao cliente, notificação e tipos conectados. Exemplo: “Waiting on customer” internamente e “Waiting on you” para o cliente. Categorias: enviado, andamento, aguardando cliente e resolvido; a categoria resolvido pode conter mais de um estado, como “Won't fix”. SLAs estão bloqueados pelo plano e a tela informa configuração por workflows.

**I050–051:** contatos possuem segmentos, filtros, tabela de dados e ações coletivas anunciadas. Perfil reúne qualificação, notas, tags, empresa, eventos, páginas vistas, perfis externos, conversas, séries, segmentos, preferências de assinatura e problemas de e-mail/SMS. A tabela contém contatos de demonstração; não foi importada base real.

**I052–053:** conhecimento separa artigos públicos/internos, conversas, macros, sites, snippets e documentos; cada fonte alimenta Fin, Copiloto ou central de ajuda. Integrações oferecidas incluem Zendesk, Guru, Notion, Confluence, Salesforce, Box, Document360, Freshdesk, Shopify e GitHub. Nenhuma sincronização/upload foi iniciada.

**I054–056:** visão geral de relatórios mostra volume por canal, tempo de fechamento, primeira resposta, tratamento, Fin, CX e CSAT, com período, filtros e fuso. Catálogo possui 27 relatórios, incluindo artigos, entregabilidade, chamadas, conversas, Copiloto, desempenho de equipe/pessoa, eficácia, Fin, e-commerce, workflows, leads, monitores, CX, responsividade, SLAs, tags, tickets e ciclo de vida. Existem exportação de dados e agendamento no menu; não foram executados. Valores vazios em gráficos demonstrativos não significam zero desempenho real.

Outbound mostra mensagens por canal, séries e modelos iniciais, mas não foi criada mensagem. Essa área é catálogo/estado inicial, sem cobertura de segmentação, agenda e envio.
