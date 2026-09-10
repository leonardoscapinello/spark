# ADR-0016 — Canais oficiais, e-mail com Resend + Reoon, publicação com driver duplo

**Status:** Aceito
**Data:** 2026-09-10
**Substitui:** [ADR-0010](0010-canais-e-email.md)

## Contexto

O ADR-0010 definiu Meta direto para mensageria, SES para e-mail e APIs oficiais para publicação social. Três definições novas revisam parte disso:

1. **Todos os caminhos são oficiais.** Meta, WhatsApp, TikTok, YouTube — API oficial em todos. A rota Baileys/Evolution está descartada em definitivo.
2. **Buffer entra como integração**, não só como ferramenta a substituir.
3. **Resend para envio e Reoon para validação de e-mail** entram na pilha.

## Decisão

### Mensageria — inalterada

**WhatsApp Cloud API, Instagram Messaging e Messenger Platform, direto na Meta**, sem BSP intermediário. Webhook responde em milissegundos e enfileira; dedupe por ID da Meta; janela de 24 h modelada no domínio; templates versionados com o status de aprovação sincronizado.

Continuam valendo os dois fatos operacionais do ADR-0010, e o primeiro segue bloqueante:

- **A WABA precisa ser registrada no Brasil** — WABA estrangeira não alcança número brasileiro.
- **Template de marketing custa ~8× o de utility** (US$ 0,0625 contra US$ 0,0080), e utility dentro da janela de 24 h é gratuito. O simulador de custo antes do envio continua sendo feature de primeira linha.

### Publicação social — dois drivers atrás de uma interface

O módulo `social` expõe uma interface única e tem **duas implementações**:

```
social/
├── drivers/
│   ├── direct/   Meta Graph · TikTok · YouTube · LinkedIn
│   └── buffer/   GraphQL do Buffer — 11 canais numa integração
└── (a aplicação não sabe qual driver está sendo usado)
```

**Por que os dois, e não um:**

O Buffer expõe hoje uma API GraphQL que cobre Instagram, Facebook, LinkedIn, TikTok, X, Threads, Bluesky, Pinterest, YouTube, Google Business Profile e Mastodon — **onze canais com uma única integração**, incluindo agendamento, edição, mídia e métricas. Construir isso direto significa onze fluxos de OAuth, onze formatos de mídia, onze esquemas de erro e onze mudanças de API para acompanhar.

A divisão que faz sentido:

| Situação | Driver |
|---|---|
| Canal estratégico, com necessidade de recurso específico ou métrica profunda | **Direto** — Meta, TikTok, YouTube, LinkedIn |
| Canal secundário, de cauda longa, ou ainda não construído | **Buffer** |
| Um canal direto quebra ou tem API instável | **Buffer**, como reserva |
| Fase 5 ainda não chegou e já queremos publicar pelo Spark | **Buffer**, desde já |

Isso tem um efeito de cronograma que vale registrar: **dá para entregar publicação social muito antes da Fase 5**, ligando o driver Buffer, e ir substituindo canal por canal com o driver direto conforme cada um justifique o esforço.

**Restrição a verificar antes de depender do Buffer:** a chave de API do Buffer é gerada no painel da própria conta e o OAuth 2.0 para aplicações de terceiros ainda não está liberado. Para uso interno com a conta da empresa isso basta; se o Spark virar produto vendável, o driver direto precisa cobrir os canais principais.

### E-mail — Resend agora, SES quando o volume justificar

**`packages/email` expõe uma interface de envio com dois adaptadores.** Trocar de provedor é mudar configuração, não código.

| Provedor | Papel | Custo |
|---|---|---|
| **Resend** | Padrão: transacional **e** campanha, até ~500 mil/mês | ~US$ 40 por 100 mil |
| **Amazon SES** | Válvula de escape para volume alto | ~US$ 10 por 100 mil |

Começar no Resend é a decisão certa mesmo custando 4× mais por mensagem, e o motivo é honesto: **a diferença de US$ 30/mês em 100 mil e-mails não paga o tempo de engenharia para sair do sandbox do SES, configurar SNS, montar painel de eventos e gerir reputação na mão.** Esse tempo, na Fase 1, vale mais aplicado no produto.

O gatilho de migração é explícito: **acima de ~500 mil e-mails/mês**, quando a diferença passa de US$ 150/mês, o adaptador SES é ligado para campanhas em massa e o Resend fica com o transacional.

O que continua sendo nosso, independente do provedor: SPF, DKIM, DMARC, `List-Unsubscribe` com One-Click, **lista de supressão própria verificada antes de todo envio**, rastreamento de abertura e clique por redirecionamento assinado, e domínio de envio separado do domínio corporativo.

### Validação de e-mail — Reoon

**Reoon Email Verifier**, a ~US$ 1 por 1.000 endereços, em três pontos do fluxo:

1. **Na importação de lista** — modo em lote, antes de qualquer contato entrar no banco. É aqui que ele paga por si mesmo.
2. **Na captura em formulário** — modo rápido, ~0,5 s, síncrono, para barrar erro de digitação na hora.
3. **Como nó de automação** — revalidar contatos inativos antes de uma reativação.

A economia é indireta e grande: bounce alto queima reputação de domínio, e reputação queimada derruba a entrega de **tudo**, inclusive do transacional. US$ 1 por mil endereços é barato perto de recuperar um domínio.

**Limitação conhecida, a tratar no produto:** o Reoon marca domínios *catch-all* mas não dá pontuação de confiança, e em lista B2B isso pode ser 10–30% dos contatos. Esses endereços não devem ser tratados nem como válidos nem como inválidos — precisam de um estado próprio (`indeterminado`) e de uma política de envio separada. Modelar isso desde a primeira migration da tabela de contatos.

## Alternativas consideradas

**Só Buffer para tudo o que é social.** Descartado: perde acesso a recursos específicos de canal e a métricas profundas nos canais que mais importam, e cria dependência total de um terceiro para uma função central do produto.

**Só integração direta, sem Buffer.** Descartado por custo de construção e de manutenção nos canais de cauda longa, e por adiar em meses a entrega de publicação social.

**Só SES desde o início** (a decisão do ADR-0010). Revista: o custo de operação na Fase 1 é maior que a economia.

**Validação caseira** (sintaxe + MX + SMTP probe). Descartado: derruba reputação de IP, é bloqueado pelos provedores grandes, e não detecta *catch-all* nem descartável. É exatamente o tipo de coisa que não vale construir.

## Consequências

- Uma interface a mais em `social` e outra em `email`. O custo é pequeno e a liberdade de trocar provedor é grande.
- Publicação social pode ser antecipada para uma fase anterior à 5, via driver Buffer. **Vale reavaliar o roadmap com isso.**
- Dependemos do Buffer nos canais secundários. O risco é contido, porque o driver direto pode assumir qualquer canal a qualquer momento.
- Precisamos acompanhar taxa de bounce e reclamação semanalmente desde o primeiro envio, independentemente do provedor.
- O estado `indeterminado` de validação de e-mail precisa existir no modelo de dados desde o começo.
