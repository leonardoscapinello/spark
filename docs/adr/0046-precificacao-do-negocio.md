# ADR-0046 — Precificação do negócio: cascata, assinatura, parcelamento e cupons

**Status:** Aceito
**Data:** 2026-10-05
**Complementa:** ADR-0019 (núcleo compartilhado), ADR-0035 (dinheiro em coluna, centavos inteiros).

## Contexto

O valor do negócio era a soma dos itens, cada item com desconto e imposto em percentual. Não havia desconto do negócio, cupom, taxa, setup, cobrança recorrente nem parcelamento. Negociação real dobra todas essas alavancas, e o mesmo cálculo vai alimentar o checkout e o gateway de pagamento — onde a empresa controla os próprios juros de parcelamento e os cupons pré-configurados.

Referências estudadas: Stripe (assinatura com um intervalo; cupom com duração uma vez / N ciclos / para sempre; desconto da fatura depois do desconto de item), HubSpot Quotes (descontos, taxas e impostos do orçamento inteiro, em % ou valor fixo; único e recorrente separados), Pipedrive (desconto em % ou valor por item; cobrança única ou recorrente com duração), Salesforce CPQ (cascata de preço: cada camada mostra o que tirou ou somou).

## Decisão

1. **Uma regra só, em `packages/core`:** `dealPricing` calcula a cascata e `installmentQuote`/`installmentOptions` o parcelamento. Servidor, telas e o futuro checkout chamam as mesmas funções. Tudo em inteiros: centavos, milésimos de quantidade, pontos-base.
2. **Duas correntes de cobrança:** itens **únicos** e itens **recorrentes**. O negócio tem **uma** assinatura (intervalo mensal, trimestral, semestral ou anual; N ciclos ou sem fim) — como no Stripe, um intervalo por assinatura.
3. **Cascata por corrente, em ordem fixa:** subtotal dos itens (já com desconto e imposto de cada item) → descontos do negócio (percentuais sobre o subtotal, sem compor) → cupons (sobre o que sobrou) → piso em zero → taxas (setup, serviço; percentuais sobre o valor já descontado). Item aceita desconto em % **ou** em valor.
4. **Ajuste recorrente pode durar N ciclos** (cupom "3 meses com 20%"); o total do contrato soma ciclo a ciclo.
5. **Valor do negócio = valor total do contrato:** total único + soma dos ciclos da assinatura. Assinatura sem fim é avaliada pelo prazo de referência do negócio (12 meses por padrão). Juros de parcelamento **não** entram no valor do negócio: são custo financeiro, mostrados à parte.
6. **Parcelamento só na corrente única** (a recorrente é cobrada por ciclo). Política configurável: máximo de parcelas, "sem juros até N", juros mensais compostos (Tabela Price) a partir daí, parcela mínima e desconto à vista. A primeira parcela absorve a diferença de centavos.
7. **Cupom é cadastro, não texto livre:** código único por organização, % ou valor, corrente (única ou recorrente) e duração em ciclos, validade, subtotal mínimo e limite de usos. No negócio o cupom vira um ajuste com a foto dos valores do momento — mudar o cupom depois não reescreve negócio fechado.

## Alternativas consideradas

- **Reaproveitar `discount_rules` do catálogo como cupom:** são regras automáticas sem código nem duração; misturar os dois conceitos deixaria a regra automática e o cupom digitado com o mesmo comportamento. Ficam separados.
- **Vários intervalos de cobrança por negócio** (mensal e anual juntos): complica a cascata e a cobrança no gateway sem caso real hoje. Um intervalo por assinatura, como o Stripe.
- **Juros na fórmula simples (taxa × parcelas):** não é como gateways e financeiras cobram; a Tabela Price é o padrão do mercado brasileiro.
- **Imposto depois dos descontos do negócio:** exigiria ratear o desconto entre itens com alíquotas diferentes. O imposto continua no item; descontos do negócio incidem sobre o subtotal já tributado.

## Consequências

Funil, relatórios e checkout passam a ler o mesmo número. O valor digitado à mão deixa de valer quando o negócio tem itens. A tela do negócio ganha cascata, assinatura e simulador de parcelas; Configurações ganham Cupons e Parcelamento. Novas tabelas e colunas entram só por expansão (ADR de migração expand/contract).
