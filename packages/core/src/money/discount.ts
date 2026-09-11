import { type Money, money, multiply, subtract, isNegative } from "./money.js";

/**
 * Every discount policy in Spark goes through here — CRM, catalog,
 * campaign. A discount computed anywhere else is a bug, not a style
 * choice (docs/adr/0019-nucleo-compartilhado.md).
 */
export type Discount = { type: "percentage"; value: number } | { type: "fixed_amount"; value: Money }; // percentage: 0–100

export class InvalidDiscountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDiscountError";
  }
}

function validateDiscount(discount: Discount): void {
  if (discount.type === "percentage" && (discount.value < 0 || discount.value > 100)) {
    throw new InvalidDiscountError(`Percentage discount must be between 0 and 100. Received: ${discount.value}`);
  }
}

/** Applies a discount to a price. Never results in a negative value. */
export function applyDiscount(price: Money, discount: Discount): Money {
  validateDiscount(discount);

  const result =
    discount.type === "percentage"
      ? subtract(price, multiply(price, discount.value / 100))
      : subtract(price, discount.value);

  return isNegative(result) ? money(0) : result;
}
