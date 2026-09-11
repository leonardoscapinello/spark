/**
 * Compiler proof — does not run as a runtime test, it's checked by
 * `tsc --noEmit` (pnpm typecheck). If `price * 0.9` ever starts compiling,
 * it's because someone turned Money back into an intersection brand over
 * number, and this file is what catches it. See docs/adr/0019 and
 * docs/arquitetura/fase-0.md ("done when: price * 0.9 does not compile").
 */
import { money, type Money } from "./money.js";

const price: Money = money(1990);

// @ts-expect-error — Money is an opaque object; it's neither number nor
// bigint, so the `*` operator doesn't accept it as an operand.
const _noDiscount = price * 0.9;

// @ts-expect-error — same reason: `-` requires number/bigint on both sides.
const _noSubtraction = price - money(100);

// @ts-expect-error — a raw number doesn't satisfy the opaque type. Only `money()` produces a Money.
const _directConstruction: Money = 1990;

// The only correct way is through the module's functions:
// applyDiscount(price, { type: "percentage", value: 10 })

export {};
