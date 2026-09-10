# Custos e infraestrutura

Valores de setembro de 2026, em USD/mês. Fontes ao final.

## A conclusão que muda o desenho do produto

**Infraestrutura não é o custo relevante deste projeto. Mensagem é.**

No Brasil, um template de *marketing* no WhatsApp custa **US$ 0,0625** e um de *utility* custa **US$ 0,0080** — cerca de **8× de diferença**. Utility dentro da janela de 24 h aberta é gratuito.

Uma campanha de 20 mil mensagens:

| Classificação | Custo |
|---|---|
| Marketing | **US$ 1.250** |
| Utility | **US$ 160** |
| Utility dentro da janela de 24 h | **US$ 0** |

Isso é mais do que toda a infraestrutura do ano. A consequência arquitetural está em [ADR-0010](../adr/0010-canais-e-email.md): **o simulador de custo antes do envio é feature de primeira linha**, e o construtor de campanha precisa alertar quando um template classificado como marketing poderia ser utility.

---

## Fase 1 — MVP interno (~10 usuários)

| Item | Especificação | Custo |
|---|---|---|
| Supabase Pro | inclui US$ 10 de crédito de compute; Micro cabe | 25 |
| VPS São Paulo | 4 vCPU / 8 GB (Vultr ou DigitalOcean) | 48 |
| Redis/Valkey | container na mesma VPS | 0 |
| Resend | ~50 mil e-mails | 20 |
| Reoon | validação de lista, ~20 mil endereços | 20 |
| Cloudflare | DNS, CDN, R2 (plano gratuito) | 0 |
| Sentry + Grafana Cloud | planos gratuitos | 0 |
| GitHub Actions | 2.000 min/mês incluídos | 0 |
| Domínio | rateio anual | 2 |
| **Total** | | **~US$ 115** |

## Fase 2 — Produção (~50 usuários, canais ativos)

| Item | Especificação | Custo |
|---|---|---|
| Supabase Pro + compute Small | banco maior, egress maior | 45–70 |
| VPS API | 4 vCPU / 8 GB | 48 |
| VPS Workers | 4 vCPU / 8 GB (separada) | 48 |
| Resend | 500 mil e-mails | 200 |
| Buffer | plano pago, para o driver de publicação | 12 |
| Reoon | validação contínua | 20 |
| Cloudflare R2 | ~200 GB de mídia | 10 |
| Sentry Team | | 26 |
| EAS Build | plano Production | 30 |
| Assinatura de código | Apple 99/ano + Azure Trusted Signing ~120/ano | 18 |
| **Subtotal infra** | | **~US$ 415–440** |
| WhatsApp | **variável** — ver tabela acima | 0–1.500+ |

## Fase 3 — Escala (~200 usuários, offline-first)

| Item | Custo |
|---|---|
| Supabase Pro + compute Large + réplica de leitura | 150–250 |
| 3 VPS (API ×2 + workers) | 150 |
| Amazon SES 2 M + IP dedicado (Resend fica no transacional) | 250 |
| PowerSync | 100–300 |
| R2 + observabilidade paga | 80 |
| **Subtotal infra** | **~US$ 700–1.000** |

Neste ponto vale reavaliar duas coisas: com a conta do Supabase acima de ~US$ 200, autogerir Postgres passa a ser competitivo ([ADR-0005](../adr/0005-postgres-supabase-drizzle.md)); e acima de ~500 mil e-mails/mês o adaptador SES entra para as campanhas em massa ([ADR-0016](../adr/0016-canais-email-e-publicacao.md)).

### Resend ou SES — o gatilho

| Volume/mês | Resend | SES | Diferença |
|---|---|---|---|
| 100 mil | 40 | 10 | 30 |
| 500 mil | 200 | 50 | 150 |
| 2 milhões | 650 | 200 | 450 |

Até 500 mil, a diferença não paga o tempo de engenharia de sair do sandbox do SES, montar SNS, painel de eventos e gestão de reputação. Acima disso, paga. O adaptador em `packages/email` torna a troca uma mudança de configuração.

---

## Comparação com as quatro ferramentas substituídas

Para 20 usuários, valores aproximados de lista:

| Ferramenta | Custo/mês |
|---|---|
| Pipedrive Advanced (20 assentos) | ~1.000 |
| ActiveCampaign Pro (25 mil contatos) | ~300 |
| ManyChat Pro | ~99 |
| Buffer Team | ~120 |
| **Total** | **~US$ 1.520** |

*Nota: o Buffer permanece como integração ([ADR-0016](../adr/0016-canais-email-e-publicacao.md)), num plano pago mais barato. Ele deixa de ser a interface e passa a ser um driver de transporte.*

Infraestrutura do Spark na Fase 2: **~US$ 430**. Economia aparente de ~US$ 1.090/mês.

**Mas a conta honesta inclui a engenharia.** O Spark é um projeto de **12 a 18 meses para 3–4 desenvolvedores** até substituir as quatro ferramentas com qualidade equivalente. A economia de assinatura sozinha não paga isso.

O retorno vem de uma destas duas coisas — e vale decidir **qual delas** antes de começar:

1. **O Spark vira produto vendável.** A economia interna é bônus; a receita vem de terceiros. Nesse caso, [ADR-0004](../adr/0004-contrato-openapi-primeiro.md) (API pública) e [ADR-0014](../adr/0014-construir-vs-adotar-open-source.md) (licenças limpas) já estão certos para isso.
2. **A unificação gera receita que as quatro ferramentas separadas não geram** — automação cruzando canais, resposta mais rápida, atribuição de ponta a ponta.

Se nenhuma das duas for verdade, a decisão economicamente correta é continuar assinando as quatro. Isso está registrado para que a escolha seja consciente.

---

## Escolha de região — e por que Hetzner ficou de fora

Hetzner custa 3–5× menos que Vultr e DigitalOcean, e **não tem região no Brasil**. Colocar a VPS na Europa ou nos EUA adiciona 110–130 ms a cada ida e volta até o Postgres em São Paulo.

Para um inbox de atendimento usado o dia inteiro, isso é a diferença entre "instantâneo" e "travando". A economia de ~US$ 40/mês não compra isso de volta. Some a residência de dado sob a LGPD e a decisão fica fácil.

**Postgres e compute na mesma região, sempre.** É a regra que não se quebra.

---

## Fontes

- [Supabase Pricing](https://supabase.com/pricing) · [análise 2026](https://makerkit.dev/blog/saas/supabase-pricing)
- [WhatsApp API — preços Brasil 2026](https://ominiflow.com/whatsapp-api-pricing/brazil) · [categorias e mudanças](https://blueticks.co/blog/whatsapp-business-pricing-marketing-messages-2026)
- [Amazon SES — custo real 2026](https://www.emailplatformreview.com/blog/amazon-ses-pricing-official-2026/) · [SES vs Resend vs Postmark](https://www.buildmvpfast.com/blog/resend-vs-ses-vs-postmark-transactional-email-deliverability-saas-2026)
- [Comparativo de VPS 2026](https://cloudmart.dev/blog/cheapest-vps-2026) · [Hetzner vs DO vs Vultr](https://www.bitdoze.com/digitalocean-vs-vultr-vs-hetzner/)
- [Supabase self-hosted vs cloud](https://selfhost.dev/blog/supabase-self-hosting/)
- [Reoon Email Verifier](https://www.reoon.com/email-verifier/) · [Buffer API para desenvolvedores](https://buffer.com/made-for/developers)
