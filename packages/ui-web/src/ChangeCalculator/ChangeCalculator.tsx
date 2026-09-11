import { calculateChange, toCents, type Money, type CashCurrency } from "@spark/core";
import { MoneyInput } from "../MaskedInput/MaskedInput.js";
import { FormField } from "../FormField/FormField.js";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { CashPiece } from "./CashPiece.js";
import s from "./ChangeCalculator.module.css";
export interface ChangeCalculatorProps {currency:CashCurrency;total:Money|null;received:Money|null;onTotalChange:(value:Money|null)=>void;onReceivedChange:(value:Money|null)=>void;includeOneCent:boolean;onIncludeOneCentChange:(value:boolean)=>void}
export function ChangeCalculator({currency,total,received,onTotalChange,onReceivedChange,includeOneCent,onIncludeOneCentChange}:ChangeCalculatorProps){
 const result=total!==null&&received!==null?calculateChange(total,received,currency,includeOneCent):null;
 const format=(v:Money)=>new Intl.NumberFormat(currency==="BRL"?"pt-BR":"en-US",{style:"currency",currency}).format(toCents(v)/100);
 return <div className={s.root}><FormField label="Total da compra"><MoneyInput label="Total da compra" currency={currency} value={total} onValueChange={onTotalChange}/></FormField><FormField label="Valor recebido"><MoneyInput label="Valor recebido" currency={currency} value={received} onValueChange={onReceivedChange}/></FormField><Checkbox checked={includeOneCent} onCheckedChange={onIncludeOneCentChange}>Tenho moedas de 1 centavo</Checkbox>
 <div role="status" className={s.result}>{!result?"Preencha o total e o valor recebido.":toCents(result.shortfall)>0?`Faltam ${format(result.shortfall)} para completar o pagamento.`:`Troco: ${format(result.change)}`}{result&&toCents(result.remainder)>0&&<p>Faltam {format(result.remainder)} para compor o troco exato com as moedas selecionadas. O valor não foi arredondado.</p>}</div>
 {result&&result.pieces.length>0&&<div className={s.pieces} role="group" aria-label="Notas e moedas para o troco">{result.pieces.map(piece=><CashPiece key={`${piece.kind}-${piece.cents}`} currency={currency} {...piece}/>)}</div>}
 <p className={s.hint}>Sugestão sem controle de estoque do caixa. Confira a disponibilidade das notas e moedas.</p></div>;
}
