import { money, toCents, type Money } from "../money/index.js";
import type { DealProduct } from "../schema/dealProduct.js";

/** As três parcelas de um item, todas em centavos inteiros. */
export interface DealProductTotals {
  /** Preço × quantidade, antes de desconto. */
  gross: Money;
  /** Quanto o desconto tirou. */
  discount: Money;
  /** Imposto sobre o valor já descontado. */
  tax: Money;
  /** O que entra no valor do negócio: bruto − desconto + imposto. */
  net: Money;
}

type Line = Pick<DealProduct, "quantityMilli" | "unitAmount" | "discountBasisPoints" | "taxBasisPoints">;

/**
 * Conta um item. Tudo inteiro, arredondando uma vez por parcela — somar
 * frações de centavo item a item é como uma fatura fecha com um centavo de
 * diferença do que o cliente viu na tela.
 *
 * Quantidade vem em milésimos (1500 = 1,5) e desconto/imposto em pontos-base
 * (1250 = 12,5%), pelo mesmo motivo do dinheiro: percentual em ponto flutuante
 * não fecha conta.
 */
export function dealProductTotals(line: Line): DealProductTotals {
  const unit = toCents(line.unitAmount);
  const gross = Math.round((unit * line.quantityMilli) / 1000);
  const discount = Math.round((gross * line.discountBasisPoints) / 10_000);
  const taxable = gross - discount;
  const tax = Math.round((taxable * line.taxBasisPoints) / 10_000);
  return { gross: money(gross), discount: money(discount), tax: money(tax), net: money(taxable + tax) };
}

/** Valor do negócio: a soma líquida dos itens. Sem itens, zero. */
export function dealProductsTotal(lines: readonly Line[]): Money {
  return money(lines.reduce((total, line) => total + toCents(dealProductTotals(line).net), 0));
}

/** As mesmas parcelas somadas — o resumo que a tela mostra no rodapé da lista. */
export function dealProductsSummary(lines: readonly Line[]): DealProductTotals {
  const sum = lines.reduce(
    (totals, line) => {
      const item = dealProductTotals(line);
      return {
        gross: totals.gross + toCents(item.gross),
        discount: totals.discount + toCents(item.discount),
        tax: totals.tax + toCents(item.tax),
        net: totals.net + toCents(item.net),
      };
    },
    { gross: 0, discount: 0, tax: 0, net: 0 },
  );
  return { gross: money(sum.gross), discount: money(sum.discount), tax: money(sum.tax), net: money(sum.net) };
}

/** Quantidade em milésimos → texto para a tela ("1,5", "2"). */
export function formatQuantity(quantityMilli: number): string {
  const value = quantityMilli / 1000;
  return Number.isInteger(value) ? String(value) : value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

/** Texto digitado ("1,5") → milésimos. Devolve null quando não é quantidade válida. */
export function parseQuantity(input: string): number | null {
  const parsed = Number(input.trim().replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 1000);
}

/** Pontos-base → texto de porcentagem ("12,5"). */
export function formatBasisPoints(basisPoints: number): string {
  const value = basisPoints / 100;
  return Number.isInteger(value) ? String(value) : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** Texto de porcentagem → pontos-base, limitado a 0–100%. */
export function parseBasisPoints(input: string): number | null {
  const raw = input.trim();
  if (raw === "") return 0;
  const parsed = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
  return Math.round(parsed * 100);
}
