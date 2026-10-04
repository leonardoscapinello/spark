# Campos personalizados, grupos e relações entre módulos

Estado: proposta de produto. Não representa funcionalidade entregue. Complementa [SLA e ciclos de atendimento](sla-e-ciclos-de-atendimento.md).

## Propriedade e apresentação

Um campo pertence a uma entidade; um módulo apresenta entidades relacionadas. Ver um campo em duas telas não cria dois valores. Pessoa e empresa são cadastros compartilhados por Atendimento, CRM e Marketing, conforme permissões. Usuário interno, que acessa o sistema, é distinto da pessoa/contato atendida. Essa distinção é proposta para resolver o termo “usuário”; confirmar a abrangência antes de implementar seus campos.

| Contexto administrativo | Proprietário do valor |
|---|---|
| Pessoas/contatos | Pessoa compartilhada |
| Empresas | Empresa compartilhada |
| CRM/Vendas | Negócio |
| Atendimento | Conversa ou ciclo de atendimento, conforme duração do dado |
| Usuários internos | Usuário interno, se esse cadastro estiver no escopo confirmado |
| Marketing | Entidade concreta, como campanha ou participação da pessoa em campanha; definir antes da implementação |
| Atividades | Atividade, preservando o suporte existente |

No Atendimento, diferenciar atributos duradouros da conversa dos atributos da solicitação atual, que pertencem ao ciclo. Novo ciclo não herda automaticamente os valores do anterior; herança deve ser explícita. Dados pessoais continuam vinculados à mesma pessoa. Marketing não deve virar um recipiente genérico sem definir a que registro o valor pertence.

## Administração e grupos

Uma central de **Campos e grupos** permite selecionar contexto e entidade, pesquisar, criar grupos, ordenar grupos e campos, editar definições e arquivar. A lista informa nome, tipo, entidade proprietária, grupo, locais de uso e regras vinculadas. O editor separa definição, apresentação, validação e exigências do processo.

O Atendimento oferece acesso contextual a **Gerenciar campos e grupos**, com entidade pré-selecionada e permissão administrativa. O mesmo vale para os demais contextos. Um grupo organiza campos da mesma entidade e tem nome e ordem próprios. A tela de atendimento pode apresentar grupos distintos de Atendimento, Pessoa e Empresa sem misturar seus proprietários. Remover um grupo exige mover os campos; não apaga valores.

Ao criar, a entidade proprietária fica explícita. Depois de haver valores, trocar proprietário ou tipo incompatível exige migração explícita; nunca reinterpretar os dados silenciosamente. Arquivamento preserva histórico e mostra automações e regras afetadas antes de publicação. Novos campos não alteram retroativamente resultados encerrados.

## Validação e exigências contextuais

Separar três perguntas: a quem pertence o dado, onde ele aparece e em qual ação ele é exigido. Tipo e formato pertencem à definição do campo. Obrigatoriedade/importância pode depender do processo: funil e etapa no CRM; categoria, status e ação no Atendimento; evento definido para cada outra entidade.

Exemplo legítimo: exigir CPF da **pessoa vinculada** para avançar um negócio para Contrato. O CPF continua sendo da pessoa. A regra bloqueia essa transição específica, sem exigir CPF em todo atendimento nem copiar o CPF para cada negócio. A referência deve aparecer como “Pessoa vinculada → CPF”. Se houver várias pessoas, a regra precisa indicar o papel, como pessoa principal; nunca escolher arbitrariamente.

Regras de preenchimento global na criação da entidade, quando suportadas, devem ser separadas e explícitas. Não converter automaticamente o atual booleano `required` em uma exigência para todos os módulos. Migração deve preservar o comportamento existente até uma reconfiguração deliberada.

Campo importante sinaliza pendência; campo obrigatório bloqueia a ação configurada. API, importação e automações aplicam as mesmas validações do domínio. Ausência de vínculo e falta de permissão têm resultado claro. Uma regra não deve tornar uma ação impossível por exigir um dado que ninguém autorizado no processo pode preencher.

## Dados compartilhados e automações

A mesma pessoa e a mesma conversa podem ser apresentadas em Atendimento e CRM por relações explícitas. Vincular conversa a negócio não duplica mensagens e não concede acesso automaticamente. Uma pessoa pode ter vários negócios e conversas: a pessoa em comum não identifica sozinha o destino de uma escrita.

Distinguir **referência compartilhada**, que exibe o valor atual do mesmo registro, de **cópia**, que grava um valor independente no destino. Copiar é útil para transferência operacional ou fotografia histórica; não deve ser necessário para exibir o mesmo dado pessoal em outro módulo.

Uma automação de cópia configura:

- Evento e condições, campo de origem e campo de destino por identidade estável.
- Relação que resolve o registro de destino; na presença de vários, seleção explícita ou operação deliberada sobre todos.
- Política de sobrescrita: apenas se vazio ou substituir; origem vazia pode ser ignorada ou limpar por opção explícita.
- Compatibilidade, conversão e validação final do destino, inclusive opções de seleção, moeda e datas.
- Permissões, isolamento por organização, auditoria e resultado visível de sucesso ou falha.
- Idempotência em reentregas, prevenção de ciclos entre automações e tratamento de edição concorrente.

Exemplo: ao vincular um negócio a um atendimento, copiar “Negócio → Produto contratado” para “Ciclo de atendimento → Produto da solicitação”, apenas se vazio. O vínculo determina o negócio e o ciclo; não usar o último negócio da pessoa por conveniência. A cópia não é sincronização bidirecional contínua.

## Base existente e limites

`CUSTOM_FIELD_ENTITIES` contempla pessoa, empresa, negócio, conversa e atividade. A definição atual tem `required` global e não possui grupo. Há regras de compatibilidade e conversão em `customFieldMapping`; isso não comprova entrega de gatilhos, execução, relações ou auditoria de automações. Usuários internos, entidades de marketing e ciclo não estão nessa enumeração.

A evolução usa tabelas estáticas e definições configuráveis, sem gerar schema em runtime. Regras ficam em `packages/core`, gravações autorizadas na API e leituras operacionais nas coleções locais. Grupos, definições, regras e valores precisam de isolamento por organização e permissões coerentes nos dois caminhos de leitura.

## Critérios de entrega

1. Gestão de campos e grupos por entidade, com acesso contextual pelo Atendimento e pelos demais módulos suportados.
2. Dado de pessoa/empresa editado em um contexto aparece no outro por referência ao mesmo registro, respeitando permissões.
3. Exigência de etapa ou status afeta apenas a ação configurada; referências a entidades relacionadas são explícitas e resolvidas sem ambiguidade.
4. Campos do ciclo preservam o histórico ao reabrir o atendimento; herança é configurada.
5. Cópia automatizada valida tipos, relações, sobrescrita, permissões, duplicidade e ciclos; falhas são visíveis.
6. Arquivar ou alterar campo/grupo apresenta dependências e preserva valores existentes.
7. Confirmar significado de Usuários e entidades de Marketing antes de implementar esses cadastros; não tratá-los como já existentes.
8. Migração compatível e verificações do repositório aprovadas antes de declarar entrega.
