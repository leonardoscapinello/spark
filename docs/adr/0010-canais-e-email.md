# ADR-0010 — Canais de mensagem diretos na Meta, e-mail no Amazon SES

**Status:** Substituído por [ADR-0016](0016-canais-email-e-publicacao.md)
**Data:** 2026-09-10

## Contexto

O Spark substitui o ManyChat (WhatsApp, Instagram, Messenger), o ActiveCampaign (e-mail) e o Buffer (publicação social). Nenhuma dessas ferramentas tem tecnologia proprietária de transporte: **todas são camadas sobre as mesmas APIs públicas** — Meta Cloud API, provedores de SMTP, APIs de cada rede social. O que elas vendem é a interface e a orquestração. É exatamente isso que estamos construindo.

Pesquisando o ManyChat, a limitação mais citada é reveladora e serve de guia: *"não existe um inbox de time onde vários vendedores vejam e respondam as conversas de WhatsApp"* e *"não existe CRM nativo com estágios, lead scoring e pipeline"*. É precisamente a lacuna que o Spark existe para fechar — não vale a pena reconstruir o ManyChat, vale construir o que falta nele.

## Decisão

### Mensageria: integração direta com a Meta

**WhatsApp Cloud API, Instagram Messaging API e Messenger Platform, direto**, sem intermediário (sem Twilio, sem 360dialog, sem ManyChat).

- Webhook único de entrada por canal → validação de assinatura → enfileira e responde `200` em milissegundos. **Nunca processar dentro do handler do webhook**: a Meta reenvia e desabilita endpoints lentos.
- Deduplicação por ID de mensagem da Meta — reenvio é normal, não é exceção.
- Janela de 24 h modelada explicitamente no domínio, com o relógio guardado por conversa. É ela que decide se uma resposta pode ser livre ou precisa de template.
- Templates versionados no nosso banco, com o status de aprovação da Meta sincronizado.

**Dois fatos operacionais que precisam entrar no planejamento agora:**

1. **A WABA precisa ser registrada no Brasil.** Desde o início de 2026, a Meta mantém restrição de mensageria transfronteiriça envolvendo o Brasil: uma WABA registrada fora não consegue enviar para números brasileiros. Não é um detalhe de configuração — é uma decisão de estrutura societária a validar antes do desenvolvimento.
2. **O custo dominante do produto é mensagem, não infraestrutura.** No Brasil, template de *marketing* custa ~US$ 0,0625 e template de *utility* ~US$ 0,0080 — uma diferença de ~8×. Utility dentro da janela de 24 h aberta é gratuito.

A consequência arquitetural do item 2 é direta: **a classificação de template é uma decisão de custo, e o produto precisa ajudar o usuário a acertá-la.** O construtor de campanha deve mostrar o custo estimado antes do envio e alertar quando um template classificado como marketing poderia ser utility. Isso é feature de primeira linha, não relatório futuro.

### E-mail: Amazon SES

**SES para envio, US$ 0,10 por 1.000 e-mails** — cerca de 4× mais barato que Resend e 10× mais barato que Postmark no mesmo volume.

- Eventos (entrega, bounce, reclamação, abertura, clique) via SNS → nosso webhook → fila. Lista de supressão própria, alimentada por bounce e reclamação, **verificada antes de todo envio**.
- Infraestrutura de reputação: SPF, DKIM, DMARC, `List-Unsubscribe` com `One-Click` (RFC 8058). IP dedicado com aquecimento gradual só quando o volume justificar (acima de ~100 mil/mês).
- Domínio de envio **separado** do domínio corporativo. Uma campanha ruim não pode derrubar a entregabilidade do e-mail da empresa.
- Rastreamento de abertura e clique é nosso, por redirecionamento assinado — não usar o do SES, que não dá o controle de atribuição que precisamos.

O trade-off assumido: SES é o mais barato e o que exige mais operação — sair do sandbox, configurar DNS, gerir reputação. Cabe em nós porque teremos time técnico dedicado.

### Publicação social

APIs oficiais de cada rede: Meta Graph (Instagram, Facebook), LinkedIn, TikTok, YouTube, Threads, Pinterest.

**X (Twitter) fica fora do escopo inicial** — o custo da API não se justifica frente ao uso esperado. Reavaliar sob demanda.

Modelagem: um `post` com múltiplos `post_targets` (um por canal), cada um com seu próprio ciclo de vida — porque a publicação falha por canal, e a métrica volta por canal.

### Sobre bibliotecas não oficiais de WhatsApp

Existe a rota Baileys / Evolution API, muito usada no Brasil: conecta como WhatsApp Web, sem custo por mensagem e sem aprovação de template. Ela **viola os Termos de Serviço do WhatsApp** e expõe o número a banimento sem aviso nem recurso.

Para uma ferramenta interna que sustenta o atendimento da empresa, perder o número principal é um incidente sem plano de recuperação. **Não adotamos.** Registro aqui porque a opção vai ser levantada em algum momento e a decisão precisa estar documentada.

## Alternativas consideradas

**Twilio / 360dialog / Infobip como BSP.** Onboarding mais simples e suporte. Descartado por margem: cobram por mensagem *acima* do preço da Meta, num produto cujo custo variável dominante já é mensagem. Falar direto com a Cloud API elimina essa camada.

**Manter o ManyChat como camada de canal.** Descartado: pagaríamos por assinatura e continuaríamos sem inbox de time e sem CRM — que é justamente o que motiva o projeto.

**Resend/Postmark no lugar do SES.** DX muito melhor, dashboards prontos. Descartado por custo em volume de marketing. Reconsiderar apenas para e-mail transacional crítico (recuperação de senha, convite), onde volume é baixo e entregabilidade individual importa mais que preço.

## Consequências

- Precisamos passar pela **App Review da Meta** para as permissões de mensageria. É um processo com prazo e possibilidade de reprovação — colocar no caminho crítico do cronograma, não no fim.
- Ficamos expostos a mudanças de política da Meta. Mitigação: a camada `channels` isola o resto do sistema atrás de uma interface própria de mensagem.
- Ganhamos margem: sem intermediário, pagamos o preço de tabela da Meta e da AWS.
- Entregabilidade de e-mail passa a ser responsabilidade nossa. Isso exige alguém acompanhando taxa de bounce e reclamação semanalmente — não é automático.
- Simulador de custo de campanha vira requisito de produto por decisão arquitetural.
