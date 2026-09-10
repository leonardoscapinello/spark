# ADR-0014 — Construir o núcleo, copiar os modelos de dados

**Status:** Aceito
**Data:** 2026-09-10

## Contexto

Existem projetos open source maduros que cobrem pedaços grandes do escopo:

- **[Chatwoot](https://www.chatwoot.com)** — inbox omnichannel, muito maduro, com anos de produção. Ruby on Rails.
- **[Twenty](https://twenty.com)** — CRM open source (AGPL-3.0), construído em **NestJS + React** — a mesma stack que escolhemos.
- **[Listmonk](https://listmonk.app)** — envio de newsletter em alta performance. Go.

A pergunta legítima: por que não montar o Spark colando essas peças e economizar meses?

## Decisão

**Construímos o núcleo. Estudamos os modelos de dados deles e copiamos o que for bom.**

O raciocínio é o mesmo que justifica o projeto existir. O valor do Spark não está em ter um inbox, um CRM e um disparador de e-mail — está em eles compartilharem **uma identidade de contato e uma linha do tempo**. Integrar três sistemas com três bancos, três modelos de contato e três regimes de autenticação reconstrói exatamente o problema que estamos tentando resolver, agora com o custo adicional de manter três aplicações de terceiros.

Some a isso: Chatwoot é Rails e Listmonk é Go — adotá-los quebra [ADR-0001](0001-typescript-ponta-a-ponta.md) e traz duas linguagens e dois ecossistemas de deploy para um time pequeno.

**Restrição de licença, que precisa ser dita com clareza:** Twenty é AGPL-3.0. Copiar código dele para o Spark contamina o Spark com AGPL — o que, se um dia o produto for oferecido a clientes externos, obriga a abrir o código inteiro. **Não copiamos código.** Ler o schema para entender como eles modelaram objetos customizados é legítimo e recomendado; copiar arquivo não é. A distinção precisa ser respeitada por todo mundo no time.

**O que fazemos com eles:**

| Projeto | Como usamos |
|---|---|
| Chatwoot | Referência de modelagem de conversa, atribuição, times e SLA. Anos de aprendizado de produto embutidos no schema. |
| Twenty | Referência para campos customizados e objetos customizados — a parte mais difícil de modelar num CRM. |
| Listmonk | Referência de arquitetura de envio em alta taxa e de gestão de lista/supressão. |
| Novu | Referência para o modelo de preferência e canal de notificação. |

**O que adotamos de fato como dependência:** bibliotecas, não aplicações. React Flow para os construtores visuais, MJML para renderização de e-mail, BullMQ, Drizzle. Peças, não plataformas.

## Alternativas consideradas

**Chatwoot como motor de atendimento atrás da nossa UI.** Foi a alternativa mais séria — economizaria meses no módulo mais trabalhoso. Descartada por três motivos: o contato do Chatwoot seria um segundo registro de contato ao lado do nosso; o Rails traz outra stack de deploy e outra linguagem; e a automação precisaria atravessar a fronteira dos dois sistemas em tempo real, que é o caminho mais quente do produto.

**Fork do Twenty como base do CRM.** Tentador pela stack idêntica. Descartado pela licença AGPL (o fork inteiro fica AGPL) e porque a arquitetura de objetos customizados dele é uma decisão profunda que herdaríamos sem ter escolhido.

**Comprar em vez de construir (HubSpot, Salesforce, GoHighLevel).** Continua sendo a resposta correta para a maioria das empresas. Descartada porque a premissa do projeto é ter a ferramenta própria. Vale registrar honestamente: **este projeto é de 12 a 18 meses para 3–4 devs até substituir as quatro ferramentas com qualidade**. A economia de assinatura (~US$ 1.500/mês para 20 usuários) não paga isso sozinha — o retorno vem de o Spark virar produto vendável ou de a unificação gerar receita que as quatro ferramentas separadas não geram. Se nenhuma dessas duas coisas for verdade, a decisão certa é comprar.

## Consequências

- Assumimos o cronograma completo, sem atalho de terceiros. O roadmap por fases ([roadmap.md](../arquitetura/roadmap.md)) existe para que haja valor entregue em cada etapa, e não só no fim.
- Ganhamos controle total do modelo de dados — o ativo central do produto.
- Precisamos de disciplina de licença no time: ler é permitido, copiar não é. Vale uma linha explícita no `CONTRIBUTING.md`.
- Cada módulo grande começa com uma sessão de leitura do schema equivalente open source. Estudar antes de modelar economiza retrabalho de meses.
