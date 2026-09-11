import { describe,it,expect } from "vitest";
import { calculateChange } from "./change.js";
import { money,toCents } from "./money.js";
describe("troco",()=>{
 it("decompõe 50 menos 35,40 exatamente",()=>{const result=calculateChange(money(3540),money(5000),"BRL");expect(toCents(result.change)).toBe(1460);expect(result.pieces).toEqual([{cents:1000,kind:"note",quantity:1},{cents:200,kind:"note",quantity:2},{cents:50,kind:"coin",quantity:1},{cents:10,kind:"coin",quantity:1}]);expect(toCents(result.remainder)).toBe(0);});
 it("não arredonda nem inventa moeda para centavos indisponíveis",()=>{expect(toCents(calculateChange(money(999),money(1000),"BRL").remainder)).toBe(1);expect(calculateChange(money(999),money(1000),"BRL",true).pieces).toEqual([{cents:1,kind:"coin",quantity:1}]);});
 it("informa pagamento insuficiente e zero de troco",()=>{expect(toCents(calculateChange(money(5000),money(3540),"BRL").shortfall)).toBe(1460);expect(calculateChange(money(5000),money(5000),"BRL").pieces).toEqual([]);});
 it("preserva a soma para dólar e real",()=>{for(const currency of ["BRL","USD"] as const)for(let cents=0;cents<3000;cents++){const r=calculateChange(money(0),money(cents),currency);expect(r.pieces.reduce((sum,p)=>sum+p.cents*p.quantity,0)+toCents(r.remainder)).toBe(cents);}});
});
