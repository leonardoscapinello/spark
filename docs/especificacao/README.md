# Contrato de produto e dados — Spark

Data: 11/09/2026. Status: proposta de fechamento para implementação, baseada no código atual, nos ADRs aceitos e no dossiê. Este documento distingue decisões existentes de propostas; não declara paridade completa com os produtos de referência.

## O papel de cada documento

| Fonte | Responsabilidade |
| --- | --- |
| [Dossiê](../inspiration/README.md) | Evidência do que as referências permitem fazer e de como apresentam isso |
| [ADRs](../adr/README.md) | Decisões arquiteturais aceitas; não reescrever silenciosamente |
| Este contrato | Comportamento que o Spark precisa entregar e critérios de aceitação |
| [Modelo de dados](modelo-de-dados.md) | Entidades, relações, invariantes e lacunas do schema atual |
| [Reaproveitamento e infraestrutura](reuso-e-infraestrutura.md) | Componentes e regras únicos; fornecedores coexistentes, armazenamento configurável e critérios de entrega |
| `packages/core` | Tipos, validações, regras e permissões executáveis |
| `packages/db` | Schema físico e migrations versionadas |

Especificação não substitui contrato executável. Ao implementar uma unidade, seus campos, eventos e transições devem aparecer em `core`, contratos/API, banco e coleções locais conforme sua responsabilidade.

## Direção de produto já definida

- CRM segue a organização e os fluxos do Pipedrive.
- Atendimento e componentes gerais seguem o Intercom, conciliados com os tokens e ADR visual vigente do Spark.
- Automação segue o ManyChat também na interface: canvas, cards, cores semânticas, painéis e múltiplos gatilhos.
- Contato, negócio, conversa e execução pertencem ao mesmo produto e compartilham identidade e histórico.
- Conexão Google deve contemplar Gmail e Google Docs com permissões por capacidade; e-mail genérico deve contemplar SMTP de saída e um mecanismo explícito de entrada.
- Instagram precisa de inventário por operação: DM, story, comentário, anúncio, live e demais eventos suportados. A disponibilidade depende da API e das permissões; não equivale a tudo que o aplicativo nativo oferece.

## O que o código já possui

O schema local contém organizações/tenants, usuários, grupos de permissão, contatos, identidades, pipelines, etapas, negócios, atividades e eventos. Há módulos de API e coleções locais para partes do CRM. Isso é evidência do repositório, não confirmação de que o mesmo schema está aplicado em produção.

Não constam do schema inspecionado as entidades de empresas clientes, catálogo de produtos, inbox/mensagens e motor de automação. A arquitetura de automação já foi escolhida nos ADRs 0009 e 0027; falta transformá-la em contratos implementáveis.

## Contratos a fechar por área

| Área | Comportamento necessário | Critério de aceitação da unidade |
| --- | --- | --- |
| Identidade | Um contato com múltiplas identidades; conflito de correspondência explícito | Evento repetido não cria contato duplicado; vínculo entre tenants é rejeitado |
| CRM | Empresa cliente, contato principal, participantes, responsável, seguidores, produtos e histórico | Abrir negócio mostra os vínculos corretos; mover etapa respeita pipeline e registra mudança |
| Produtos | Preço no negócio separado do catálogo; moeda, desconto, imposto e recorrência | Exemplos numéricos aprovados e testados em `core`, sem inferir fórmula do print |
| Inbox | Conexão, caixa de equipe, atendente, conversa, participantes, mensagem e nota interna | Resposta externa e nota interna têm destinos distintos; reprocessamento não duplica mensagem |
| Automação | Rascunho editável, versão publicada imutável, vários gatilhos e execução durável | Publicar nova versão não altera execução existente; espera sobrevive a reinício |
| Integrações | Estado da conexão, capacidades autorizadas e recuperação de falha | Permissão Docs negada não invalida Gmail autorizado; segredo não vai para coleção local |
| UI | Estados normal, selecionado, foco, vazio, carregamento, erro e indisponível | Cada tela referencia evidência e usa componentes/tokens do Spark |

## Ordem proposta de construção

1. Fechar identidade, empresa cliente, permissões dos vínculos e contrato de evento; completar o negócio do CRM sobre essa base.
2. Entregar uma fatia integrada: contato → negócio → conversa → mensagem recebida → timeline. Usar um canal de desenvolvimento controlado antes de depender de aprovação externa.
3. Entregar o primeiro fluxo: dois gatilhos independentes → condição → alteração no CRM → espera → atribuição humana, com versão, execução e erro observáveis.
4. Expandir o catálogo de nós e os canais usando os mesmos contratos.

Esta ordem organiza dependências; não remove o escopo completo pedido pelo usuário. O catálogo completo continua rastreado no dossiê. Não é necessário terminar cada canal para desenvolver o núcleo, mas identidade, isolamento e versionamento precisam estar definidos primeiro.

## Supabase: situação verificada nesta sessão

O usuário forneceu o projeto remoto e o acesso SQL foi confirmado em transação somente leitura. Projeto: `vrxjqqqsoqfaxzanebtf`. O schema `public` não possui tabelas; não há registro de migrations do Spark, role `app_user` ou publicação Electric. O banco tem `wal_level=logical`. O endpoint JWKS respondeu HTTP 200 com chave ES256. Consulte o [diagnóstico do ambiente remoto](supabase-diagnostico.md).

`packages/db/.env` e `apps/api/.env` continuam apontando para `localhost`. Nenhuma credencial foi adicionada aos documentos, arquivos de configuração ou Git. A inspeção não aplicou migrations nem alterou o ambiente remoto.

Antes de aplicar migrations remotas: identificar projeto e ambiente (desenvolvimento/homologação/produção), comparar migrations aplicadas, confirmar role de aplicação/RLS, configuração de Auth e replicação para Electric. Inspeção deve começar por metadados em modo somente leitura. Não usar `db:push` como substituto de migrations revisadas.

## Pendências que mudam a modelagem

- Um usuário pode participar de várias organizações? O schema atual vincula usuário a uma única organização e torna `supabase_user_id` globalmente único.
- Um negócio pode reunir várias conversas? Proposta: sim; uma conversa pode ser vinculada a mais de um negócio explicitamente, sem associação automática ambígua.
- O mesmo contato pode entrar simultaneamente na mesma automação por gatilhos diferentes? Proposta: política configurável, com padrão de impedir duas execuções ativas da mesma automação para o mesmo contato; precisa de validação de produto antes de virar regra.
- Como calcular e exibir o valor de negócio com recorrência, parcelas e impostos? Exige exemplos, não apenas escolha de colunas.
- Quem pode ver e-mails pessoais, caixas de equipe e documentos Google? Definir acesso antes da sincronização desses dados.

Essas pendências são decisões propostas, não autorizações para alterar banco remoto. Para mudança que contrarie um ADR aceito, escrever um ADR sucessor. O roadmap geral também precisa refletir as decisões mais recentes, pois ainda contém referências anteriores de atendimento e sincronização.
