# Integrações — requisitos do Spark e evidências

Atualizado durante a coleta de 11/09/2026. Separar desejo de produto, capacidade observada na UI e disponibilidade da API do provedor.

## Gmail, Google Docs e SMTP

O usuário definiu conexão Google por OAuth, inbox Gmail, acesso ao Google Docs e alternativa de e-mail por SMTP. São capacidades de uma integração Google, com permissões específicas por serviço; login Google isolado não concede automaticamente acesso ao Gmail e aos documentos.

Gmail usa escopos de OAuth distintos: `gmail.readonly` lê mensagens, `gmail.send` permite envio e `gmail.modify` permite leitura e alterações sem exclusão permanente imediata. Escopos restritos têm requisitos de verificação próprios. O conjunto final depende das operações do Spark. [Escopos oficiais Gmail](https://developers.google.com/workspace/gmail/api/auth/scopes).

O Google permite combinar permissões de APIs diferentes e consultar os escopos efetivamente concedidos. **Proposta:** uma conexão Google com capacidades visíveis e autorização incremental para Gmail e documentos. Permissão negada para Docs não deve impedir uma conexão Gmail já autorizada. [OAuth Google](https://developers.google.com/identity/protocols/oauth2).

SMTP resolve envio; a entrada precisa de Gmail API, IMAP ou encaminhamento. Gmail suporta IMAP/POP/SMTP com OAuth 2.0. O formulário de provedor genérico deve separar envio e recebimento, servidor, porta, segurança, autenticação, remetente e estado da conexão. Essas são propostas Spark, não um formulário SMTP observado no Intercom. [Protocolos Gmail](https://developers.google.com/workspace/gmail/imap/imap-smtp).

Para Google Docs ainda falta validar o fluxo específico de escolher/criar/associar documentos e seus escopos. O Smart Docs do Pipedrive mostrou dependência de armazenamento conectado, mas não demonstrou a experiência após OAuth. Não registrar essa parte como concluída.

O catálogo oficial do Docs inclui `documents`, `documents.readonly` e `drive.file`. Este último limita acesso aos arquivos usados com o app e é recomendado pelo Google para acesso por arquivo; os dois primeiros abrangem documentos do usuário. **Proposta:** usar seleção de documentos e acesso por arquivo quando isso satisfizer a jornada, mantendo a capacidade Google Docs explícita na conexão. A decisão final depende de criar, editar, ler ou apenas vincular. [Escopos oficiais Google Docs](https://developers.google.com/workspace/docs/api/auth?hl=en).

## Matriz de canais

| Canal | Evidência nesta sessão | Requisito Spark / lacuna |
| --- | --- | --- |
| Web chat | Intercom: configuração e prévia do widget | Instalar, identificar contato, entregar mensagem e retornar resposta ainda não testados |
| Gmail | Requisito do usuário; documentação OAuth oficial | Sincronização, threads, anexos, labels e recuperação de conexão |
| E-mail genérico | Intercom: encaminhamento, remetente, assinatura, anexos e tickets | SMTP de saída e mecanismo explícito de entrada |
| Instagram | Intercom: DM/story bloqueado; ManyChat: gatilhos comentários/reels/story/DM/anúncio/live/referral | Validar elegibilidade, permissões, mídia, janela e origem por evento |
| WhatsApp | Configuração Intercom e fluxo publicado ManyChat | Número, templates, janela, opt-in, status e associação ao contato |
| Facebook Messenger | Catálogo Intercom bloqueado e canal em ManyChat | Conexão e eventos não exercitados |
| TikTok | ManyChat não conectado | Validar conta/região e catálogo após conexão |
| Google Meu Negócio | Não observado como inbox | Google Business Messages foi encerrado; não planejar um conector para a API extinta |
| Google Docs | Requisito do usuário e entrada Smart Docs desconectada | Definir documentos selecionados, associação e operações necessárias |

Google Business Messages foi descontinuado em 31/07/2024. A integração com Perfil da Empresa pode ter outros objetivos, mas não deve prometer a antiga caixa de mensagens. [Aviso oficial Google](https://developers.google.com/business-communications/business-messages/resources/release-notes/update-on-gbm?hl=pt-br).

ManyChat informa que TikTok exige conta Business e tem restrições regionais; a conta observada não está conectada. Não transportar automaticamente o catálogo Instagram para TikTok. [Conexão TikTok no ManyChat](https://help.manychat.com/hc/en-us/articles/17928990909084-How-to-connect-TikTok-to-Manychat).

## Instagram: escopo funcional a fechar

O usuário pediu todos os aspectos. O inventário deve manter linhas separadas para DM, resposta a story, menção, comentário em post/reel, comentário em live, anúncio, referral, botões, anexos, reações, consentimento, transferência humana e eventos de leitura/entrega. A UI observada comprova somente os itens identificados no capítulo ManyChat e o anúncio de DM/story do Intercom. Restrições e payloads de API ainda precisam de validação por operação; não presumir equivalência com o aplicativo nativo Instagram.

## Modelo unificado proposto

Um contato pode ter várias identidades de canal. Uma conversa pertence a uma conexão/canal e se associa ao contato; pode se vincular a um negócio. Proprietário do negócio e atendente da conversa não são o mesmo campo. Um evento recebido pode iniciar uma automação, alterar dados e abrir/atribuir uma conversa; essa transição deve manter origem e histórico.

Propostas para a implementação: deduplicar eventos por identificador do provedor; manter rascunho separado da versão publicada; registrar execução e erro por nó; evitar ciclos de automação disparados pelas próprias atualizações; conciliar consentimento e janela do canal; armazenar segredos no servidor; refletir estado e mensagens nas coleções locais. Não são garantias inferidas dos sistemas pesquisados.
