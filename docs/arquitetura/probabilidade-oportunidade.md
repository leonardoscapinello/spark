# Probabilidade de fechamento e inteligência do Spark

A regra pertence ao Spark. O núcleo `estimateOpportunity` é puro e não depende de SDK, rede, credenciais ou respostas de modelo generativo. Complementa o ADR-0032 sem alterá-lo.

## Entrega inicial

O modelo `opportunity-bayes-v1` estima o fechamento eventual, sem horizonte fixo, para negócios abertos. A taxa histórica de ganhos do funil usa suavização Beta(5,15): sem histórico, a hipótese inicial é 25%. Ganhos e perdas alteram automaticamente essa base. Negócios abertos não são classificados como perdas.

Ajustes heurísticos em log-odds incorporam score recente da pessoa, média dos scores dos demais contatos vinculados à empresa, histórico comercial da pessoa e da empresa e atividades atrasadas/concluídas. O contato focal não entra novamente na média da empresa; negócios da mesma pessoa não são contados novamente no histórico da empresa. A hipótese não é validada estatisticamente, e o percentual não é score dividido por dez. Pesos não são treinados automaticamente nesta versão.

A amostra histórica permanece restrita à organização e ao funil. Não há mistura de dados entre clientes do Spark. Pessoas/empresas relacionadas contribuem por suas relações comerciais. Não existe ainda um score próprio de empresa: o sinal atual é a média de scores de contatos com evidência e cálculo de até dois dias atrás.

O núcleo aceita duração típica de vendas, mas o coletor deixa esse sinal ausente até existir uma coorte com fechamento confiável. Tempo de resposta, tracking de páginas, Instagram e sinais sem integração não são inventados. As futuras integrações alimentam score e evidências sem colocar regras dentro de SDKs.

## Execução

Migration 0074 expande `deals` com resultado, versão, amostra e data; a coleção local existente sincroniza esses campos. Não são aceitos nos DTOs de escrita. A interface mostra “estimativa” ou “aguardando análise”. Probabilidade de passagem entre etapas continua separada.

`OPPORTUNITY_INTELLIGENCE_ENABLED=true` no worker inicia o consumidor PostgreSQL. Alterações do negócio, score do contato e atividades enfileiram análise. A fila é deduplicada por oportunidade. Alterações em pares da mesma empresa e resultados de outros negócios chegam no recálculo diário. Nenhuma chamada de IA roda em transação.

Cada réplica processa um negócio por vez, com locks na mesma ordem do CRM e SKIP LOCKED. Mais réplicas podem consumir a fila. O agregado de conversão é compartilhado por funil, invalidado por mudanças de resultado e renovado diariamente. Índices cobrem relações e pendências. Não houve benchmark de 300 mil leads, nem implantação nesta entrega. Monitorar atraso da fila, p95 de cálculo, contenção do agregado, falhas e carga no banco antes de aumentar concorrência. Após dez falhas, o trabalho fica parado com `last_error`; uma nova alteração o reativa.

## Aprendizado e auditoria

`opportunity_predictions` preserva a primeira previsão de cada dia UTC, com atributos, fatores e versão, antes do desfecho. O percentual atual pode mudar durante o dia; a amostra diária não é sobrescrita. Não criamos previsões retrospectivas fictícias.

Essas amostras permitem avaliar calibração, Brier score e discriminação contra eventos reais `deal.won`/`deal.lost` posteriores à previsão. Separar dados por tempo e identidade, tratar reaberturas e negócios ainda abertos, registrar horizonte e medir por funil antes de promover pesos aprendidos. A exportação e o treinamento supervisionado de oportunidades ainda não estão implementados. O aprendizado entregue é atualização da taxa empírica, não aprendizado autônomo de coeficientes.

## Provedores de IA

`IntelligenceProvider` é o contrato próprio para extração de evidências. `IntelligenceEvidenceSchema` valida categorias, confiança e referências; `validateIntelligenceEvidence` rejeita fontes inventadas. A aplicação atribui organização e identidade, nunca o fornecedor. O contrato não aceita percentual final, alteração de regra, SQL ou código.

Adaptadores futuros de OpenAI, Anthropic ou Gemini ficam no servidor. Nenhum fornecedor está conectado por esta entrega. Seleção/configuração por organização, timeout, orçamento, proveniência (fornecedor/modelo/versão) e fallback pertencem à orquestração. Falta de IA deve preservar o cálculo determinístico. Antes de uma observação externa influenciar o cálculo, implementar política de aceitação no core, evitar duplicação com sinais originais e medir sua contribuição. Trocar o provedor não altera o contrato nem os pesos do negócio.

## Ativação

Aplicar a migration 0074 depois da 0073, publicar API/web/worker compatíveis e habilitar `OPPORTUNITY_INTELLIGENCE_ENABLED`. O score precisa da ativação descrita em `score-comercial.md`; sem score recente, o cálculo usa os demais sinais. Desligar a flag pausa o consumidor e mantém a fila. Migrações e flag não foram aplicadas nesta implementação.
