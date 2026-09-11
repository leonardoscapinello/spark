# Pipedrive — CRM

Evidências numeradas estão em [INDICE.md](INDICE.md). Referências como P020 correspondem ao prefixo do arquivo na pasta `capturas`.

## Kanban e pipelines

**P020–025, P029.** O quadro apresenta seis etapas, nome e soma por coluna, cards densos e rolagem horizontal. Cada card combina título, pessoa/organização, valor, avatar do proprietário e indicador de atividade atrasada. Títulos longos são truncados. O clique no card abre a página completa do negócio. Não foi executada movimentação de negócio entre etapas.

O menu do quadro oferece ações e configuração; a ordenação contempla próxima atividade, título, valor, pessoa, organização, fechamento esperado, criação, atualização, atividades feitas/pendentes, quantidade de produtos, proprietário e último e-mail enviado/recebido. O seletor de filtro separa favoritos, proprietários e filtros salvos, com pesquisa.

O construtor de filtros tem grupos **todas as condições** e **qualquer condição**, seleção de entidade e campos, nome, visibilidade privada, opção de guardar colunas e prévia. O catálogo do negócio inclui valores recorrentes ACV/ARR/MRR. Operadores completos por tipo, composição aninhada e persistência do filtro não foram exercitados.

O editor de pipeline expõe nome, probabilidade por negócio, nome e probabilidade de cada etapa, regra de apodrecimento por dias, adicionar/remover/reordenar etapas e salvar/cancelar. Foi aberto e cancelado. A capacidade de editar existe na UI; impacto da exclusão de etapa com negócios e mudança de pipeline com histórico ainda não foi testado.

**Proposta Spark:** preservar a informação e densidade dos cards e a navegação por negócio; aplicar a superfície visual geral do Intercom. Ordenação, filtro e movimentação precisam operar sobre as coleções locais. A mutação de etapa deve ter transição validada em `core`, histórico e recuperação quando falhar.

## Detalhe do negócio

**P001–004, P016–019.** Cabeçalho com título, etapa, ganho/perdido, proprietário e seguidores. Corpo com coluna de informações e área de atividades/histórico. O resumo inclui valor, pessoa, organização, produtos, participantes, etiquetas, previsão de fechamento, sequência e projeto. Seções podem ser expandidas separadamente.

| Entidade/controle | Comportamento observado | Consequência para o Spark |
| --- | --- | --- |
| Proprietário/owner | Seletor de usuário com salvar/cancelar | Um responsável pelo negócio, separado de participante e atendente da conversa |
| Seguidores/followers | Lista de seguidores, adicionar e deixar de seguir | Relação de acompanhamento distinta da atribuição; entrega de notificações não validada |
| Pessoa | Nome, etiquetas, telefone, e-mail e dados relacionados | Contato reutilizado pelo CRM e inbox |
| Participantes | Lista própria, adicionar e ver todos | Vários contatos envolvidos no mesmo negócio |
| Organização | Endereço, site, LinkedIn, setor, faturamento e funcionários | Vínculo empresarial separado da pessoa |
| Detalhes personalizados | Estado vazio com instrução para adicionar ou arrastar campos | Agrupamento configurável de campos, sem schema dinâmico |

Não confundir proprietário do negócio, seguidor, participante, proprietário do contato, atendente e equipe de atendimento. A UI dos produtos pesquisados usa relações distintas; o Spark deve explicitar a relação em cada seletor.

## Atividades e histórico

**P007–015.** As abas do negócio são Atividade, Notas, Agendamento de reunião, Ligação, WhatsApp, E-mail, Arquivos, Documentos e Fatura. O histórico possui filtros por tipo e alterações; a área de foco destaca pendências e atrasos.

| Aba | O que o usuário pode configurar/ver | Limite da observação |
| --- | --- | --- |
| Atividade | Ligação, reunião, tarefa, prazo, e-mail e almoço; início/fim, prioridade, local, vídeo, descrição, livre/ocupado, notas, responsável e vínculos a negócio/lead/projeto/pessoas/organização | Formulário aberto; não salvo |
| Notas | Editor rico, fundo amarelo, nota fixada, comentários e menu contextual | Edição e persistência não exercitadas |
| Agendamento | Disponibilidade geral ou horários específicos; gerenciar disponibilidade | Popover aberto; não publicada página de agendamento |
| Ligação | Computador/telefone, número, copiar, integração padrão `callto`, parceiros e iniciar ligação | Nenhuma chamada executada |
| WhatsApp | Conectar conta, histórico associado a pessoa e negócio, modelos e inbox de vendas | Conexão ausente |
| E-mail | Convite para conexão da caixa de correio | Mensagem não composta/enviada |
| Arquivos | Selecionar arquivo ou arrastar para upload | Sem upload |
| Smart Docs | Preenchimento com dados, assinatura eletrônica, templates, acompanhamento e conexão de armazenamento | Provedor não conectado |
| Fatura | Integração com QuickBooks, instalar/saiba mais | App não instalado |

## Produtos e impacto financeiro

**P005–006, P034–035.** O catálogo estava vazio. O formulário do produto inclui nome, código, categoria, unidade, frequência, preços em moedas diferentes, imposto e visibilidade. Vincular produtos ao negócio abre uma composição de itens: preço, quantidade, desconto percentual ou absoluto, imposto, data inicial, frequência e habilitação da linha. Há controles para imposto incluso/excluso, desconto adicional, subtotal, imposto total e total, além de produtos/parcelas.

Frequências vistas: pagamento único, semanal, mensal, trimestral, semestral e anual. A UI expõe TCV e métricas recorrentes e sinaliza que desconto adicional não se aplica ao recorrente. Isso demonstra que o valor de um negócio pode ser composto por itens e cronograma, além de valor digitado. **Não foi validada a fórmula efetiva**, arredondamento, prorrata, conversão cambial ou atualização do valor após salvar. Não inferir a regra monetária só pela aparência do formulário.

Para a futura especificação Spark, faltam exemplos controlados com: dois produtos; desconto em linha e global; imposto incluso/excluso; parcela; produto recorrente; produto desativado; troca de moeda e edição após ganho. Os testes devem produzir resultados calculados por `core`, usando o tipo monetário do projeto.

## Contatos e campos

**P030–032.** Tabela de pessoas com nome, organização, e-mail, telefone, negócios abertos/fechados, próxima atividade e proprietário. Configuração de colunas com busca e inclusão de campo personalizado. O seletor mostrava 8 colunas de um limite de 200.

Criar campo apresenta nome, grupo, tipo, permissões de edição, exibição nos formulários e regras de obrigatório/importante. Tipos vistos: texto curto, texto longo, opção única, múltiplas opções, autocomplete, número, dinheiro, usuário, organização, pessoa, telefone, horário, intervalo de horário, data, intervalo de data e endereço. O modal foi cancelado.

## Atividades globais e leads

**P036–039.** Atividades em tabela e calendário semanal; filtros por tipo, pendentes, atrasadas, hoje, amanhã, semana, próxima semana, período e todas. Sincronização de calendário não conectada.

A caixa de leads vazia explica qualificar antes de converter em negócio. Adicionar lead inclui pessoa/organização, título, valor/moeda, etiqueta, proprietário, previsão de fechamento, canal e identificador de origem, visibilidade e dados de contato. Conversão e deduplicação não executadas.

**P033:** o menu geral também lista projetos, campanhas, marketplace, automações, pulse, sequências, atribuição automática, documentos, importar, exportar e restaurar. Esses itens são inventário de navegação, não cobertura funcional concluída.

## Responsividade

P027 registra emulação iPhone 16 Pro Max com dispositivo 440 × 956, mas o layout reportou 980 px de largura: é uma página desktop reduzida, não prova de reorganização móvel. P028 registra iPad Pro 1024 × 1366. P026 foi uma tentativa de override que não alterou o viewport e está classificada como evidência inválida de mobile. Não copiar esse comportamento como meta de qualidade móvel do Spark.

## E-mail: inbox global

**P040:** Sales Inbox sem conexão, com inbox, rascunhos, saída, enviados e arquivo desabilitados. A tela anuncia sincronização bidirecional, associação de e-mails com negócios/leads, templates, rastreamento de aberturas/cliques, escrita/resumo por IA, inbox de equipe, atribuição e privacidade configurável. O início da conexão solicita endereço. Esses recursos foram vistos na apresentação do produto, não em funcionamento após autenticação.

## Produtos: confirmação documental

A [documentação oficial de vinculação](https://support.pipedrive.com/en/article/how-can-i-link-products-to-a-deal), consultada em 11/09/2026, confirma que preço personalizado ao associar produto afeta somente aquele negócio, e não altera o preço do catálogo. Cada negócio usa uma moeda para seus produtos. Imposto é informado manualmente. No modo inclusivo, preço e valor do negócio incluem imposto; no exclusivo, a documentação informa que preço e valor do negócio excluem imposto, enquanto o total da composição apresenta a parcela tributária. Portanto, **total exibido na composição e valor usado pelo negócio não devem ser presumidos equivalentes em todos os modos**. É necessário validar um exemplo salvo antes de implementar a fórmula definitiva no Spark.
