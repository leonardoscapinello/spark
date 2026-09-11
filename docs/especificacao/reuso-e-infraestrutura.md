# Reaproveitamento e infraestrutura substituível

Direção definida pelo usuário em 11/09/2026. Complementa o [contrato de produto](README.md) e detalha o [ADR-0032](../adr/0032-provedores-substituiveis.md). Este documento especifica comportamento; não declara a infraestrutura implementada.

## Uma responsabilidade, uma implementação

| Responsabilidade | Dono | Como reaproveitar |
| --- | --- | --- |
| Cálculo, validação e autorização | `packages/core` | UI, API e worker importam a mesma regra; servidor valida toda escrita |
| Botão, campo, modal, tabela e outros componentes | `packages/ui-web` | Composição e propriedades para conteúdo, ícone, ação, tamanho, variante e estado |
| Cor, tipografia, espaçamento, borda e sombra | `packages/tokens` | Componentes consomem tokens; telas não inventam valores |
| Upload e acesso a bytes | `packages/storage` | Um contrato; módulo de arquivos controla permissão e metadados |
| Publicação social | Módulo `social` | Contrato Spark, adaptadores por fornecedor e capacidades por conexão |
| Fluxo com banco, fila e chamadas externas | Serviço do módulo responsável | Orquestra regras puras e adaptadores; não replica fórmulas |

Antes de criar uma função ou componente, localizar o dono existente. Ampliar a implementação compartilhada quando for a mesma responsabilidade. Não extrair abstrações genéricas apenas por semelhança visual ou para antecipar todo fornecedor possível.

## Componentes e regras

Botões com aparência diferente são variantes explícitas do componente, com estados e tokens definidos. Alterar uma variante atualiza todos os seus consumidores no próximo build distribuído. Texto, ícone e ação pertencem ao uso; estilos recorrentes pertencem ao componente. Exceções de layout não devem redefinir a aparência do botão por tela. A referência geral continua sendo Intercom; o construtor de automações segue ManyChat.

O exemplo de desconto já tem uma função `applyDiscount` em `packages/core/src/money/discount.ts`. Consumidores devem chamá-la, e não copiar sua fórmula. Centralização reduz divergências, mas não elimina bugs: casos de domínio precisam de testes. Valores históricos aprovados devem preservar o cálculo e os dados usados; uma regra nova não recalcula silenciosamente contratos antigos. API e workers precisam de atualização coordenada; clientes antigos são tratados pela compatibilidade do contrato.

Classes são úteis para objetos com estado e adaptadores, quando necessário. Funções puras são adequadas para cálculos. Interfaces e composição permitem substituir implementações sem fazer telas dependerem de fornecedor. Não exigimos uma classe para cada coisa.

## Modelo lógico adicional, ainda sem migration

| Registro | Dados e invariantes necessários |
| --- | --- |
| Conexão de integração | Escopo, fornecedor, conta externa, estado, capacidades verificadas e referência de segredo |
| Versão de destino | Conexão e configuração de destino imutável; endpoint/bucket ou identidade da conta conforme o serviço |
| Seleção ativa | Finalidade, conta/canal quando aplicável, conexão/versão e revisão para concorrência; uma seleção por escopo |
| Arquivo e intenção de upload | Organização, destino, chave, tamanho, MIME, verificação e estado; intenção nasce antes de assinar o upload |
| Publicação e vínculo externo | ID interno, conta social, conexão/versão, ID externo, responsável pelo agendamento e estado |
| Operação externa e tentativas | ID estável do efeito, destino capturado, estado, resultado, tentativas e reconciliação; tentativa não é nova publicação |
| Observação de métrica | Publicação/conta, origem, definição, janela e instante de coleta; ausência não equivale a zero |

São extensões ao [modelo de dados](modelo-de-dados.md), a reconciliar com as entidades de conexões e execuções antes de criar schema físico. Não criar uma segunda fonte de verdade para agendamentos ou efeitos. Configuração global e configuração por organização devem ter escopos e políticas explícitos, sem expor segredos aos clientes.

## Critérios de entrega

1. Dois botões em módulos diferentes usam a mesma variante; mudar seu token altera ambos. Interações, foco e estados pertencem ao componente compartilhado.
2. O mesmo exemplo monetário produz o resultado definido em `core` nos consumidores; servidor rejeita entrada inválida mesmo se o cliente não validar.
3. Iniciar upload em A, ativar B e finalizar o upload inicial mantém o arquivo em A. Próximo upload vai para B e ambos podem ser baixados após reiniciar os processos.
4. Falha ao testar B preserva A ativo. Alterações concorrentes de seleção detectam conflito. Usuário sem capacidade não consegue trocar destinos pela API.
5. Conectar fornecedor social B mantém Buffer A e seu histórico. Novas publicações usam B conforme seleção, sem alterar o contrato das telas ou do nó de automação.
6. Timeout após possível publicação não provoca uma segunda publicação por fallback. Agendamento externo não é reenviado antes de resolver cancelamento/estado anterior.
7. Uma métrica ou formato não suportado aparece como indisponível. Contratos dos adaptadores são testados com os mesmos cenários aplicáveis e com as diferenças declaradas.
8. Reiniciar API/worker não perde intenção persistida nem espera agendada. Concorrência, timeouts, retentativas limitadas e limites por fornecedor são configuráveis; falhas permanecem observáveis e recuperáveis.

## Situação encontrada

`Button` já existe com variantes `primary`, `secondary`, `ghost`, tamanhos e estado de carregamento. A regra compartilhada de desconto também existe. Isso não comprova que todos os consumidores atuais já seguem integralmente os contratos.

`packages/storage/src/index.ts` é somente um esqueleto. Troca de destino pela UI, roteamento versionado e os critérios acima ainda precisam ser implementados. O ADR-0016 já prevê Buffer e driver direto; este contrato amplia a coexistência e explicita recuperação e limites. Capacidades reais de cada API devem ser verificadas na implementação, sem tratar o catálogo histórico do ADR como garantia atual.

VPS executa serviços; bucket guarda bytes; Postgres mantém dados e estado durável. Cada um pode evoluir pelo seu contrato, mas mover banco, Auth ou processos exige seu próprio procedimento de implantação/migração. A tela de integrações não substitui esses procedimentos.
