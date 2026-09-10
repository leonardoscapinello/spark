import { type Money, money, multiply, subtract, isNegative } from "./money.js";

/**
 * Toda política de desconto do Spark passa por aqui — CRM, catálogo,
 * campanha. Um desconto calculado em outro lugar é bug, não estilo
 * (docs/adr/0019-nucleo-compartilhado.md).
 */
export type Desconto =
  | { tipo: "percentual"; valor: number } // 0–100
  | { tipo: "valor_fixo"; valor: Money };

export class DescontoInvalidoError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "DescontoInvalidoError";
  }
}

function validarDesconto(desconto: Desconto): void {
  if (desconto.tipo === "percentual" && (desconto.valor < 0 || desconto.valor > 100)) {
    throw new DescontoInvalidoError(
      `Desconto percentual deve estar entre 0 e 100. Recebido: ${desconto.valor}`,
    );
  }
}

/** Aplica um desconto sobre um preço. Nunca resulta em valor negativo. */
export function aplicarDesconto(preco: Money, desconto: Desconto): Money {
  validarDesconto(desconto);

  const resultado =
    desconto.tipo === "percentual"
      ? subtract(preco, multiply(preco, desconto.valor / 100))
      : subtract(preco, desconto.valor);

  return isNegative(resultado) ? money(0) : resultado;
}
