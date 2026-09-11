import type { CashCurrency } from "@spark/core";
import s from "./CashPiece.module.css";
export interface CashPieceProps {currency:CashCurrency;cents:number;kind:"note"|"coin";quantity:number}
/** Ilustração vetorial estilizada; a denominação vem do cálculo compartilhado. */
export function CashPiece({currency,cents,kind,quantity}:CashPieceProps){
 const format=(amount:number)=>new Intl.NumberFormat(currency==="BRL"?"pt-BR":"en-US",{style:"currency",currency}).format(amount/100);
 const unit=cents<100?`${cents} ¢`:String(cents/100);
 const label=`${quantity} ${kind==="note"?(quantity===1?"nota":"notas"):(quantity===1?"moeda":"moedas")} de ${format(cents)}`;
 return <figure className={s.root} aria-label={label} data-kind={kind} data-tone={currency==="USD"?"green":cents>=10000?"blue":cents>=5000?"gold":cents>=2000?"gold":cents>=1000?"red":cents>=500?"purple":"blue"}>
 <svg viewBox="0 0 128 80" className={s.art} aria-hidden="true" focusable="false">
 {kind==="note"?<>
 <rect x="5" y="14" width="118" height="58" rx="6" className={s.stack}/><rect x="3" y="10" width="118" height="58" rx="6" className={s.paper}/>
 <rect x="8" y="15" width="108" height="48" rx="3" className={s.frame}/>
 <path d="M15 15v48M20 15v48M92 15v48M96 15v48" className={s.security}/>
 <ellipse cx="39" cy="39" rx="15" ry="19" className={s.seal}/><path d="M30 48c0-9 18-9 18 0M34 33a5 5 0 1 0 10 0 5 5 0 0 0-10 0" className={s.frame}/>
 <text x="74" y="42" textAnchor="middle" className={s.value}>{unit}</text><text x="74" y="54" textAnchor="middle" className={s.currency}>{currency}</text>
 <path d="M103 24h7m-7 4h7m-7 4h7m-7 17h7m-7 4h7" className={s.security}/>
 </>:<>
 <circle cx="64" cy="43" r="32" className={s.stack}/><circle cx="64" cy="39" r="32" className={s.paper}/><circle cx="64" cy="39" r="27" className={s.frame}/><circle cx="64" cy="39" r="23" className={s.seal}/>
 <path d="m42 21 3 3m-8 8 4 1m-3 13 4-1m3 13 3-3m38-33-3 3m8 8-4 1m3 13-4-1m-3 13-3-3" className={s.security}/>
 <text x="64" y="42" textAnchor="middle" className={s.value}>{unit}</text><text x="64" y="54" textAnchor="middle" className={s.currency}>{currency}</text>
 </>}
 </svg>
 <figcaption className={s.caption}><span className={s.quantity} aria-hidden="true">{quantity}</span><span>{format(cents)}</span><span className={s.subtotal}>Total {format(cents*quantity)}</span></figcaption>
 </figure>;
}
