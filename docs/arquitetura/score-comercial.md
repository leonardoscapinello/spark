# Motor de score comercial

Implementação inicial: índice de interesse comercial 0–1.000, não probabilidade de compra. Pesos iniciais são hipóteses substituíveis. Nenhum dado financeiro externo é consultado. A configuração não aprende sozinha em produção.

## Limites e invariantes

- Regra pura em `packages/core/src/scoring`: contagens diárias limitadas, decaimento exponencial por meia-vida e janela de expiração. Soma ponderada limitada a 0–1.000. Uma entrada duplicada é descartada pela chave de origem no Postgres antes da agregação.
- Objetivo e horizonte pertencem à versão. Cada regra tem identificador, sinal, pontos positivos/negativos, teto, ocorrências máximas/dia, meia-vida e janela até 365 dias.
- Criar contato/enviar campanha não comprova interesse. Vendas ganhas/perdidas são resultados para avaliação futura, não entradas no modelo inicial.
- Sinais adicionais vêm do endpoint autenticado. Ação `contact.add_score` passa a registrar uma contribuição limitada e rastreável, com chave do job de automação. Não escreve mais o resultado.
- O campo legado `score` de criação/edição é ignorado. Só o worker atualiza a projeção calculada. Valores antigos não são multiplicados por dez: ficam identificados como não calculados até a primeira avaliação.
- `general` é o contexto apresentado na ficha. Outros contextos podem ser ativados via API e recebem somente sinais explicitamente destinados a eles; não existe atribuição automática a produtos. Limite inicial: 32 contextos ativos por organização.

## Versões e treinamento

`POST /v1/scoring/models` cria candidato imutável. `POST /v1/scoring/preview` simula sem gravar resultados. `POST /v1/scoring/models/:id/activate` ativa uma versão (ou restaura uma antiga) e agenda recálculo paginado, sem atualizar 300 mil contatos no request. Administração exige `settings:manage`.

`POST /v1/scoring/signals` exige `contacts:write`; recebe contactId, key idempotente, signal, scope, occurredAt. A origem deve usar um identificador estável do fato, nunca um UUID novo a cada retentativa. Mesmo key com conteúdo diferente é rejeitado. Eventos nativos do domínio entram automaticamente, incluindo formulários, mensagens e atividades. Não enviamos texto de mensagens nem dados pessoais a IA externa.

Snapshots retêm contribuições/features, versão, instante real do cálculo, evidência e valor. O script `packages/db/scripts/export-score-training.mjs` exporta amostras maduras e marca venda posterior dentro do horizonte da versão, sem nome, email ou conteúdo de conversa. Mantém contact_id para divisão por pessoa; tratar o arquivo como dado interno.

Treinamento futuro: separar cronologicamente com janela de embargo de pelo menos o horizonte, agrupar por pessoa para impedir vazamento, comparar lift/conversão por faixa e estabilidade por oferta, avaliar em sombra e promover explicitamente. O export inicial usa qualquer negócio ganho da pessoa; ele NÃO serve como rótulo por produto sem uma associação adicional de oferta. Negócio perdido não prova que a pessoa nunca comprará. Dados incompletos de vendas distorcem os rótulos.

A versão inicial executável é `rules-v1`. Armazenamento mantém artefato versionado; adicionar regressão/modelo treinado exige um novo discriminante e avaliador validado no core. Nenhum LLM muda pesos automaticamente.

## Execução e escala

Postgres é a fonte da verdade: transação registra sinal, agrega contagem e marca pessoa para cálculo. `apps/scheduler` despacha em lotes de 500 com SKIP LOCKED e lease; BullMQ/Valkey transporta os jobs; `apps/worker` calcula com concorrência controlada. Lease expirado é recuperável; jobs velhos são ignorados. Eventos concorrentes marcam novo cálculo depois do commit do worker. Scheduler não sobrepõe ciclos.

Worker lê somente agregados dos sinais utilizados nas regras, até 365 dias por sinal/contexto. Não varre os eventos da organização a cada cálculo. Ficha lê coleção local de snapshots, restrita à pessoa, organização e 90 dias, nunca o histórico da base inteira.

Reavaliação diária em UTC distribuída entre 00:00 e 01:00. Snapshot do dia é atualizado a cada cálculo; dias anteriores ficam preservados. Mesmo score produz snapshot novo no dia seguinte. Não inventamos dias de indisponibilidade. Comparação semanal usa exatamente D-7 e mesma versão com evidência; após troca de modelo, comparação fica indisponível até existir referência compatível. Calendário/fuso configurável não está implementado nesta versão.

Tabela de snapshots particionada mensalmente. Sem descarte automático: definir retenção com o produto antes de remover dados de treinamento. 300 mil pessoas geram até 109,5 milhões de snapshots/ano/contexto. Essa é capacidade projetada, NÃO um benchmark comprovado do ambiente atual. Antes de produção nesse volume, medir p95 de atraso da fila, ingestão, cálculo, crescimento, WAL/Electric e recuperação de falhas. Avaliação por regras não faz chamadas de IA por contato.

## Ativação e operação

1. Aplicar migration 0073 com worker de score desativado. Não recria schema em runtime; manutenção de partições segue o mecanismo de events/messages já existente.
2. Subir API/worker/scheduler novos. Definir `SCORING_ENABLED=true` em worker e scheduler, `SCORE_CONCURRENCY` conforme orçamento de conexões (padrão 8).
3. Monitorar `score_jobs`: available_at/leased_at, attempts, last_error. Após 10 leases malsucedidos, intervenção: corrigir causa e reativar modelo para recálculo em lotes. Nunca limpar sinais para tentar novamente.
4. Rollback operacional: desativar SCORING_ENABLED; ingestão permanece durável. Reativar versão antiga pela API quando necessário. Não apagar snapshots/modelos para fazer rollback.

Não há replay automático dos eventos anteriores à instalação. Histórico e sinais começam na ativação da estrutura; uma importação de fatos antigos deve preservar chave original e data, e não inventar medições passadas.
