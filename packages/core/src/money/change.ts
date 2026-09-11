import { money, toCents, type Money } from "./money.js";
export type CashCurrency = "BRL" | "USD";
export interface ChangePiece { cents:number;kind:"note"|"coin";quantity:number }
const denominations:Record<CashCurrency,readonly {cents:number;kind:"note"|"coin"}[]>={
 BRL:[...([20000,10000,5000,2000,1000,500,200] as const).map(cents=>({cents,kind:"note" as const})),...([100,50,25,10,5,1] as const).map(cents=>({cents,kind:"coin" as const}))],
 USD:[...([10000,5000,2000,1000,500,200,100] as const).map(cents=>({cents,kind:"note" as const})),...([50,25,10,5,1] as const).map(cents=>({cents,kind:"coin" as const}))],
};
/** Decomposição dos conjuntos monetários cadastrados; presume estoque ilimitado. Nunca arredonda o troco. */
export function calculateChange(total:Money,received:Money,currency:CashCurrency,includeOneCent=currency==="USD"):{change:Money;shortfall:Money;remainder:Money;pieces:ChangePiece[]}{
 const price=toCents(total),paid=toCents(received);
 if(price<0||paid<0)throw new Error("Total e valor recebido devem ser não negativos.");
 if(paid<price)return {change:money(0),shortfall:money(price-paid),remainder:money(0),pieces:[]};
 const change=money(paid-price);let remaining=toCents(change);const pieces:ChangePiece[]=[];
 for(const piece of denominations[currency]){if(piece.cents===1&&!includeOneCent)continue;const quantity=Math.floor(remaining/piece.cents);if(quantity){pieces.push({...piece,quantity});remaining-=quantity*piece.cents;}}
 return {change,shortfall:money(0),remainder:money(remaining),pieces};
}
