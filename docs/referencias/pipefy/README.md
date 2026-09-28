# Pipefy → experiência de negócios no Spark

Estudo visual realizado em 27/09/2026 no [pipe fornecido](https://app.pipefy.com/pipes/307319173), usando apenas navegação e abertura de painéis. Nenhum card ou configuração do Pipefy foi salvo ou alterado.

## O que foi observado

| Tela | Interação e lição para o Spark |
| --- | --- |
| [Kanban](01-kanban.png) | Nome e contagem no cabeçalho, identificação colorida, informações de contexto no card e criação perto da etapa. |
| [Card em três colunas](02-card-tres-colunas.png) | Esquerda: identificação, etiquetas, abas, dados iniciais e histórico. Centro: formulário da fase atual. Direita: destinos disponíveis. O quadro permanece visível ao fundo. |
| [Destinos permitidos](03-destinos-permitidos.png) | Um painel sobre o card configura explicitamente para onde ele pode seguir ou voltar. Salvar é separado de marcar as opções. |
| [Editor de campos](04-editor-campos-fase.png) | Tipos de campo ao lado da prévia da fase, com edição contextual. Texto, anexo, responsável, data, moeda, seleção e conexões fazem parte do formulário observado. |
| [Opções da fase](05-opcoes-da-fase.png) | Nome, descrição, criação nesta fase, responsável e prazo. O Spark preserva sua própria semântica de ganho, perda e arquivo. |
| [Etiqueta](06-etiquetas-cores.png) | Nome e cor são propriedades da etiqueta, não do card. Um catálogo reutilizável garante consistência. |
| [Novo card](07-criacao.png) | Na configuração estudada, o formulário inicial é uma coluna. As três colunas pertencem à ficha do card já criado. O Spark aplica a distribuição em três áreas também à criação, conforme solicitado. |

## Aplicação no Spark

- **Quadro:** cards com espaçamento, título em até duas linhas, menu discreto e botão de adicionar com alvo confortável. Etiquetas próprias do negócio são sincronizadas em `deal_tags`.
- **Criação:** pessoas/empresa à esquerda, dados comerciais no centro, etapa à direita. Criar pessoa ou empresa abre um formulário sobre o negócio; salvar vincula o registro e retorna ao rascunho.
- **Ficha rápida:** mantém o quadro montado. Resumo e histórico ficam à esquerda, campos da etapa no centro, destinos à direita. Há acesso explícito à **página completa** do negócio.
- **Página completa:** continua existindo e compartilha as regras e os campos por etapa. Produtos, atividades, notas, pessoas, empresa e histórico permanecem disponíveis.
- **Campos:** uma definição por organização; associações por pipeline e etapa. A mesma definição pode aparecer em vários lugares com níveis diferentes: opcional, importante ou obrigatório. Campo opcional não gera pendência. Obrigatório segue a regra existente de saída/avanço.
- **Configuração:** acessível pelo cabeçalho da etapa e pela ficha. Permite reutilizar campos, criar uma definição, selecionar cor, definir prazo e controlar destinos de ida e volta.
- **Relacionamentos:** fichas completas sobrepostas para editar dados, adicionar canais e vincular pessoas à empresa. Mesclagem exige escolher a duplicata e confirmar qual cadastro prevalece; a origem é arquivada e seus dados conflitantes são preservados.

## Decisões de interação

Superfícies de conteúdo sólidas, tokens do Studio, títulos e ações com hierarquia clara. Modais usam o primitivo Base UI existente para foco, Escape e retorno ao elemento de origem. Não se cria um sistema paralelo de animação: as transições existentes explicam a entrada/saída dos painéis e respeitam movimento reduzido.

Ganho e perda continuam resultados do negócio. Arquivamento é independente do resultado. As colunas de resultado permanecem no final e não são reordenáveis.

## Resultado no Spark

- [Criação em três colunas](08-spark-criacao.png). O cadastro de pessoa/empresa abre por cima e retorna ao rascunho.
- [Ficha rápida](09-spark-ficha-rapida.png). À esquerda, abas de resumo, histórico e pessoas; centro com campos da etapa; direita com destinos permitidos e etiquetas. O botão “Abrir página completa” mantém o acesso à ficha integral.
- Campo pertence ao catálogo da organização. Sua associação por pipeline/etapa define se é opcional, importante ou obrigatório; os valores pertencem ao negócio. A mesma definição pode participar de várias etapas sem duplicação.
- Cinco cards identificados com “Teste CRM” foram distribuídos pelas etapas abertas do funil de demonstração, sem substituir os negócios existentes. A etapa Novo recebeu azul e o campo Origem do negócio como importante para exemplificar a configuração.
- A mesclagem de pessoas preserva a ficha de destino, preenche lacunas, transfere canais e vínculos e arquiva a origem com registro do evento. Valores conflitantes permanecem preservados na ficha arquivada; participações históricas de campanhas não são duplicadas.
