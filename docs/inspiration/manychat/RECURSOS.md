# ManyChat — referência integral da automação

Referências M001 etc. apontam para [INDICE.md](INDICE.md). Conta de terceiros, fluxo publicado existente. Nenhum novo fluxo foi criado, atualizado/publicado ou executado deliberadamente. A ocorrência de autosave está em [OCORRENCIAS.md](../OCORRENCIAS.md).

## Regra de produto definida pelo usuário

O Spark deve seguir a experiência do ManyChat para a automação: canvas, cards, botões, cores, ícones, filtros, painéis, modais, integrações e forma de criar. A meta é permitir que uma pessoa sem conhecimento técnico monte um fluxo. A arquitetura interna do Spark continua própria; não é necessário expor termos técnicos ao operador para obter esse comportamento.

## Anatomia do editor e da versão publicada

**M001–015, M020, M038–040.** Navegação global estreita à esquerda, breadcrumb e título no topo, estado LIVE na versão publicada, editar e menu de ações. Canvas ocupa o restante; inspetor à esquerda detalha a seleção. Controles de zoom ficam à direita. Versão publicada tem aviso explícito, métricas e seletor de gatilho. Editor apresenta salvar/estado, desfazer/refazer, prévia, atualização e histórico; adicionar nó usa um botão azul de mais.

No canvas, o card resume o conteúdo que será executado. O painel lateral contém os detalhes, evitando transformar cada card em formulário extenso. A seleção tem contorno destacado. Mensagens mostram canal, conteúdo, variáveis, botões, espera pela resposta e conectores. Conexões curvas carregam a leitura do fluxo.

| Tipo | Sinal visual observado | Conteúdo do card |
| --- | --- | --- |
| Entrada “Quando…” | Blocos verdes no card inicial | Cada gatilho possui identificação própria |
| Mensagem | Ícone do canal, superfície branca | Texto, variáveis, botões, próximo passo e resultados |
| Condição | Cabeçalho turquesa e ícone de filtro | Regra resumida, saída correspondente e saída alternativa |
| Ação | Cabeçalho amarelo e raio | Uma ou várias operações em sequência |
| Atraso inteligente | Cabeçalho salmão e relógio | Duração, fila/resultado e continuação |
| Coleta de resposta | Bloco lilás com ícone de resposta | Tipo esperado e ação após resposta |

As conexões observadas usam verde para correspondência, vermelho para alternativa, amarelo para ação de resposta e cinza para continuação. Não depender só de cor: rótulo e posição da saída também explicam a condição.

O zoom foi acionado na versão publicada e ampliou os cards sem trocar de tela (M038). O deslocamento, seleção múltipla por Shift, arrastar nó, criar conexão, apagar conexão e organização automática **não foram validados por mutações**, apesar dos controles/instruções visíveis. Esses gestos precisam de um fluxo descartável autorizado para prova completa; não testar movendo nós da automação operacional de terceiro.

## Múltiplos gatilhos

**M002–003, M015–019, M040.** O mesmo card inicial contém dois gatilhos reais: intenção de mensagem recebida e link de WhatsApp. Ambos chegam ao mesmo grafo. No editor há “Novo gatilho”; o catálogo permite adicionar outra entrada. Na versão publicada, as métricas podem ser vistas para todos os gatilhos ou para cada um separadamente.

**Implicação Spark:** uma automação contém uma coleção de gatilhos, não um campo único. Cada gatilho deve ser identificável, configurável e ativável independentemente, com métricas por entrada. A forma exata de deduplicar dois eventos concorrentes não foi exposta pelo ManyChat e precisa de regra própria em `core`.

## Catálogo de gatilhos observado

| Categoria | Gatilhos |
| --- | --- |
| Instagram | Comentário em post/reel, resposta a story, mensagem direta, clique em anúncio, comentário em live, link de referência |
| WhatsApp | Mensagem recebida, anúncio que abre WhatsApp, link de WhatsApp |
| Contato | Criado, campo personalizado alterado, campo de sistema alterado, tag adicionada/removida, inscrição/remoção de sequência, data/hora |
| Hotmart | Abandono de carrinho, mudança de estado de pagamento |

Configurações detalhadas de cada gatilho novo não foram salvas nem integralmente abertas. Não inferir que todos compartilham palavra-chave, intenção de IA, janela ou payload. Um gatilho de comentário deve preservar a origem post/reel/live; um gatilho de contato não precisa de canal de mensagem.

## Nós e ações

**M020–025.** O catálogo de nós mostra gatilho, mensagem por canal (Instagram/WhatsApp/e-mail), iniciar automação, etapa de IA, ação, condição, randomizador, atraso inteligente e comentário.

| Categoria de ação | Operações encontradas |
| --- | --- |
| Dados do contato | Adicionar/remover tag, preencher/limpar campo, consentimento Instagram, opt-out WhatsApp, opt-in/out e-mail |
| Automação | Campo do bot, inscrever/remover sequência, solicitação HTTP, evento de conversão, público personalizado Instagram, pausar automações |
| Atendimento | Marcar conversa aberta/fechada, atribuir, notificar responsáveis |
| Anúncios | Meta Conversions API |
| Google Sheets | Inserir linha, procurar por valor e atualizar linha |

Um card de ações contém múltiplas operações; a automação observada adiciona e remove tags na mesma etapa. O fluxo também chama uma integração externa. O endereço real não deve ser copiado para exemplos, código ou documentação compartilhada.

## Condições e campos

**M004, M008, M026–031.** Regras por qualquer/todas, saída correspondente e alternativa. O seletor distingue recomendados, gerais, campos de sistema, campos de canal e personalizados. Condição de tag e campo preenchido foram vistas no fluxo publicado.

Campos gerais incluem origem de opt-in, anúncio/API, sequência, horário atual e segmento. Campos de sistema incluem nome, sobrenome, nome completo, e-mail, telefone, inscrição, ID e tipo da última resposta. Instagram expõe última interação/visualização, janela, seguidores, username, consentimento, segue a conta, verificação e transferência comercial. WhatsApp expõe interação, visualização, ID e consentimento. E-mail tem consentimento próprio.

Gestão de campos separa campos de usuário e do bot, busca, pastas e arquivados. O modal de criação tem nome, tipo, descrição e pasta; tipos texto, número, data, data/hora, booleano e array. Foi cancelado. O Spark deve distinguir metadados dos campos, valores por contato e variáveis de execução, sem geração de schema em runtime.

## Mensagens, espera e transferência humana

**M005–014.** A mensagem pode solicitar e-mail, pausar aguardando resposta, executar ação na resposta, tratar ausência de resposta e continuar. Mensagens com botões possuem saídas próprias. Variáveis aparecem destacadas dentro do texto.

Atraso inteligente aceita segundos/minutos/horas/dias ou campo numérico, com limite exibido de 365 dias. Há janela de envio pelo fuso do contato e fallback para o fuso da conta. Não presumir execução por timer no navegador: essa é uma espera durável do produto.

O fluxo observado combina coleta de e-mail → chamada externa → espera → checagem de campo → tags → mensagem com botões. Um caminho abre atendimento humano; outro encerra a conversa. É a evidência mais direta da integração entre automação, dados e inbox.

## Gestão de automações e atendimento

**M032–037, M039.** Lista com pastas, pesquisa, filtros por gatilho/status, grade/lista, execução, CTR, modificação, status ativo e gatilhos individuais. Menu da automação publicada: duplicar, converter canais e apagar. Não foi acionada nenhuma dessas operações.

Sequências, regras e automações básicas são superfícies separadas. No Instagram, automações básicas incluem iniciadores de conversa, menções a story, menu principal, novos seguidores (beta indisponível na conta) e resposta padrão. TikTok mostrou estado não conectado.

Configuração de inbox permite abrir com qualquer mensagem ou só por ação explícita; excluir conversas automatizadas fechadas, pausa de automações durante atendimento, reatribuição, visibilidade por agente, som e respostas prontas. Valores e textos operacionais de terceiros não foram modificados.

## Jornadas que a implementação deverá demonstrar

Estas são propostas de aceitação para o Spark, não testes concluídos do ManyChat:

1. Criar automação vazia, adicionar gatilho Instagram e outro gatilho de contato, ver ambos no card inicial.
2. Adicionar mensagem pelo conector e pelo botão global; pesquisar o catálogo sem perder a seleção.
3. Arrastar card, navegar pelo fundo e ampliar; conexões continuam presas às saídas corretas.
4. Abrir o card, editar no painel, fechar e reabrir preservando o rascunho; estado de salvamento é explícito.
5. Criar condição com duas regras, alternar todas/qualquer e conectar as duas saídas.
6. Coletar resposta, tratar expiração, esperar e continuar mesmo após fechar o navegador.
7. Atribuir conversa a pessoa/equipe, pausar bot e retomar com contexto.
8. Validar campos ausentes e conexões inválidas antes de publicar; indicar o card com problema.
9. Publicar uma versão e continuar editando rascunho sem alterar execução em curso.
10. Ver execução por gatilho e por nó, falha de integração, tentativa e dados resultantes sem expor segredo.

## Aprofundamento: biblioteca e configuração Instagram

**M041–050.** O construtor básico publicado mostra navegação linear de passo inicial e etapas anexadas, detalhe da etapa selecionada e métricas. É uma segunda forma de consultar o mesmo fluxo, sem reconstruir a automação. No canvas, selecionar condição abre o inspetor e mantém visível o grafo.

Filtro de automações por gatilho separa Instagram, WhatsApp, eventos de contato e externos. O filtro de estado oferece estados variados ou presença de gatilhos ativos. A lista também possui modo grade. Os catálogos de filtro e de criação não são idênticos: o filtro observado mostra um subconjunto de tipos, e não deve definir sozinho tudo o que é possível criar.

Na configuração Instagram aparecem resposta padrão, menu principal persistente, iniciadores de conversa, automações de opt-in/out, menção em story e novos seguidores. Opt-in/out possuem palavras de sistema descritas pela interface como não editáveis. Novos seguidores está em beta e requer atualização de permissões na conta observada. A tela informa conexão por Instagram OAuth e oferece Meta for Business para acesso a mais funcionalidades. Nenhuma reconexão ou alteração de permissão foi executada.

O grupo WhatsApp de automações básicas, expandido em M046, mostra iniciadores de conversa e resposta padrão ativos. Aplicativos instalados está vazio (M049). Catálogo externo e instalação não foram acionados.

## Medidas do canvas e painel

Viewport de referência 1800 × 921 CSS px, DPR 2. Rail: 64 px. Cabeçalho: 60 px. Inspetor: x=64, y=60, largura=380, altura=861. Área principal começa em x=64, com fundo `#f5f5f5`; o painel é branco e projeta sombra horizontal `12px 0 24px -5px rgba(132,146,166,.16)`.

Fonte computada nos elementos DOM: `InterVariable, Helvetica, Arial, sans-serif`, corpo majoritariamente 14 px. Cabeçalho do painel de condição: 380 × 60 px, fundo `rgb(157,239,225)` / `#9defe1`. Controles têm raios de 6 e 10 px, conforme o elemento; não presumir um único raio para o canvas inteiro. O grafo é desenhado em canvas: a tipografia e cores exatas dos cards desenhados exigem análise visual própria, não são comprovadas pela medição CSS do inspetor.

M050 registra viewport desktop reduzido a 1069 × 921 durante a abertura de DevTools. O painel continua com 380 px e reduz o espaço restante para o grafo. Não classificar como captura de telefone/tablet. A emulação móvel do ManyChat não foi concluída porque o acesso nativo à janela deixou de devolver sua árvore; o viewport permaneceu 1069 px.

## Gestos confirmados pela documentação oficial

Complemento documental consultado em 11/09/2026; estes gestos **não foram executados na automação de terceiro**. A [documentação do Flow Builder](https://help.manychat.com/hc/en-us/articles/14281166306332-How-to-build-a-Manychat-automation) descreve:

- Duplo clique no canvas abre escolha de etapa.
- Clicar no ponto de conexão e escolher outra etapa cria ligação.
- Shift com clique ou arrasto de área seleciona vários nós.
- Cmd/Ctrl+C e V copiam/colam; Alt com arrasto duplica um nó.
- Cmd/Ctrl+Z desfaz; com Shift, refaz.
- Hover no nó revela duplicar e excluir.
- O conector inicial pode ser arrastado para trocar a primeira etapa.
- Há organização automática do grafo e alternância entre leitura linear e visual.

O mesmo guia descreve randomizador com até seis caminhos e percentuais configuráveis, reutilização por iniciar outra automação e limitação de passos consecutivos sem pausa. Esses limites são do fornecedor e não definem automaticamente os limites do Spark. Preservar a distinção entre evidência documental e captura autenticada.
