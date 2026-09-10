/**
 * `valorSincronizado` é a única fronteira que normaliza `Deal.valor`
 * vindo da coleção — e essa linha muda de forma (achado testando de
 * verdade no navegador, não só no compilador): otimista/local já é
 * `Money`, sincronizada/remota é `bigint` cru. Unitário porque é função
 * pura, sem infraestrutura — o round-trip via Electric de verdade já é
 * coberto por deals-collection.integration.test.ts.
 */
import { describe, expect, it } from "vitest";
import { money, toCentavos } from "@spark/core";
import { valorSincronizado } from "../src/deals-collection.js";

describe("packages/data — valorSincronizado", () => {
  it("linha ainda otimista: valor já é Money (passou pelo transform local) — devolve como está", () => {
    const resultado = valorSincronizado(money(8_990));
    expect(toCentavos(resultado)).toBe(8_990);
  });

  it("linha sincronizada: valor é bigint cru da coluna Postgres — converte pra Money", () => {
    const resultado = valorSincronizado(250_000n);
    expect(toCentavos(resultado)).toBe(250_000);
  });

  it("linha sincronizada: valor é number cru — converte pra Money", () => {
    const resultado = valorSincronizado(150_000);
    expect(toCentavos(resultado)).toBe(150_000);
  });
});
