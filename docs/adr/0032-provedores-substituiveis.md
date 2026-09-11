# ADR-0032 — Contratos próprios e fornecedores coexistentes

**Status:** Aceito como direção arquitetural; implementação pendente
**Data:** 2026-09-11
**Complementa:** ADR-0016, ADR-0019 e ADR-0020
**Substitui parcialmente:** ADR-0028, na configuração exclusivamente por ambiente e na interpretação de troca sem migração de arquivos existentes. O adaptador S3 único permanece.

## Contexto

O usuário exige reaproveitamento de componentes e regras, futura operação em VPS e troca de armazenamento pela tela de integrações. Buffer deve poder coexistir com outro fornecedor de publicação, sem reescrever telas, automações e regras. Configurar um fornecedor novo não transfere arquivos, posts publicados ou agendamentos já entregues ao anterior.

## Decisão

### Contratos pertencem ao Spark

Cada domínio define suas operações e capacidades em contratos próprios. Regras, validações e políticas puras vivem em `packages/core`; adaptadores executam I/O no servidor. SDKs e formatos externos ficam dentro de cada adaptador. A aplicação resolve uma conexão para a operação e chama o contrato, sem condicionais de fornecedor espalhadas pelas telas ou nós de automação.

Não há uma interface universal para todos os serviços: armazenamento, publicação social, envio de e-mail e mensageria têm contratos distintos. Adicionar um fornecedor exige implementar e testar seu adaptador e disponibilizá-lo no deploy. Depois disso, conectar contas e selecionar o fornecedor é configuração, sem novo deploy. Uma URL arbitrária não instala uma integração.

### Configuração e coexistência

Postgres guarda conexões, versões de configuração e seleção ativa por organização, conta/canal e finalidade. Configuração de infraestrutura global é restrita ao administrador da instalação; conexão de uma organização exige a capacidade correspondente. Segredos são resolvidos somente no servidor, por referência a armazenamento protegido; não entram no sync, logs ou respostas de configuração.

A tela de integrações permite conectar, testar capacidades, ativar para novas operações, consultar dependências e desativar. Ativação usa transação e controle de versão para evitar duas alterações concorrentes se sobrescreverem. Cada nova operação captura a conexão e versão selecionadas no servidor. Operações já capturadas continuam no destino registrado, inclusive após reinício do worker. Não se depende de cache desatualizado para escolher o destino.

O fornecedor anterior permanece cadastrado enquanto houver dependências. Desativar novas escritas não apaga dados nem revoga automaticamente credenciais necessárias para leitura, cancelamento ou reconciliação. Rotação de segredo mantém a identidade do destino; mudar bucket, endpoint ou conta externa cria uma nova versão de destino.

### Arquivos

`packages/storage` é o único acesso aos bytes. O módulo de arquivos autoriza e registra intenção, destino, chave do objeto, organização, tamanho, tipo e estado. Upload assinado permanece vinculado ao destino escolhido quando foi iniciado. Finalização verifica o objeto nesse destino antes de disponibilizá-lo.

Trocar o armazenamento ativo direciona novos uploads ao destino novo. Downloads e exclusões usam o destino de cada arquivo, não o padrão atual. Migração de bytes é trabalho explícito e retomável: copiar, verificar integridade, trocar referência de forma atômica e só então programar remoção da origem. Não remover uma origem enquanto referências ou uploads pendentes dependerem dela.

O bucket guarda arquivos; a VPS executa API, workers e regras. Trocar bucket não move processos, banco ou código. S3 compatível continua sendo o contrato de armazenamento; outro protocolo requer adaptador próprio e avaliação arquitetural.

### Publicação social e resultados

O contrato social contempla publicar, consultar estado, cancelar/editar quando suportado e coletar métricas. Agendamento tem um único responsável por publicação: scheduler do Spark ou fornecedor externo, registrado explicitamente. Cada conta declara capacidades efetivamente verificadas: redes, formatos, operações e métricas. Recurso ausente retorna indisponibilidade tipada; a UI explica a limitação e nunca apresenta sucesso fictício.

Posts, contas sociais, agendamentos e métricas têm IDs internos. Vínculos externos registram conexão, conta e ID do fornecedor. O mesmo perfil social pode ter mais de uma conexão, mas cada publicação tem um destino de execução definido. Métricas preservam origem, janela de medição e definição; campos incompatíveis não são somados como se fossem equivalentes.

Ativar o fornecedor B mantém Buffer A cadastrado e direciona novas operações selecionadas para B. Posts existentes continuam vinculados a A. Agendamentos já enviados a A só são transferidos após cancelamento confirmado ou reconciliação que prove ausência do efeito. Se A ficar inacessível, histórico local permanece, mas recursos e dados exclusivos de A podem ficar indisponíveis.

Falha com resultado desconhecido não autoriza publicar novamente por B: pode duplicar um post que A já publicou. Tentativas compartilham identidade da operação; o adaptador usa idempotência externa quando disponível e reconcilia resultados ambíguos. Fallback só ocorre com capacidade equivalente e segurança demonstrada para aquela operação; caso contrário ela aguarda resolução explícita.

## Alternativas consideradas

- SDK do fornecedor em telas e automações: acopla o produto e multiplica a manutenção.
- Apagar a conexão antiga ao trocar: quebra referências e perde meios de reconciliar operações.
- Trocar apenas uma variável global: suficiente para bootstrap, insuficiente para coexistência e arquivos históricos.
- Fallback automático para qualquer erro: arrisca duplicar efeitos externos.
- Classes e herança para tudo: centralização depende de responsabilidade e contratos; funções puras e composição são preferidas quando bastam.

## Consequências

Fornecedores novos afetam principalmente seu adaptador e cadastro de capacidades. Uma capacidade inédita pode exigir evolução explícita do contrato e da UI; não prometemos compatibilidade total entre APIs distintas. Estado durável, reconciliação e manutenção de credenciais antigas têm custo operacional. A troca por configuração será considerada entregue somente após os critérios da especificação passarem, não pela existência deste ADR.
