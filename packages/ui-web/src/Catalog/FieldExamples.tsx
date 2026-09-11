import { useState } from "react";
import { money, toCents, type Money } from "@spark/core";
import { MaskedInput, MoneyInput, PhoneInput, type PhoneDraft } from "../MaskedInput/MaskedInput.js";
import { Tooltip, TooltipProvider } from "../Tooltip/Tooltip.js";
import { Button } from "../Button/Button.js";
import { Field } from "../Field/Field.js";
import { Label } from "../Label/Label.js";
import { Textarea } from "../Textarea/Textarea.js";
import s from "./Catalog.module.css";
export function FieldExamples(){
 const [cep,setCep]=useState("");const [phone,setPhone]=useState<PhoneDraft>({country:"BR",nationalNumber:""});const [amount,setAmount]=useState<Money|null>(money(10000));const [note,setNote]=useState("");
 return <section className={s.card}><h2>Ajuda e campos com máscara</h2><div className={s.rows}>
 <TooltipProvider><div className={s.row}><span>Valor da proposta</span><Tooltip content="Informe o valor com centavos. O sistema armazena unidades inteiras, sem ponto flutuante."><Button iconOnly size="sm" variant="ghost" aria-label="Ajuda sobre valor">?</Button></Tooltip><Tooltip content="Dicas aparecem ao passar o mouse ou focar pelo teclado."><Button variant="secondary">Experimente a dica</Button></Tooltip></div></TooltipProvider>
 <Field><Label>Valor em reais</Label><MoneyInput label="Valor em reais" value={amount} onValueChange={setAmount} /></Field><p className={s.note}>Valor entregue pelo campo: {amount===null?"vazio":`${toCents(amount)} centavos`}</p>
 <Field><Label>CEP</Label><MaskedInput aria-label="CEP" format="#####-###" placeholder="00000-000" value={cep} onValueChange={setCep} /></Field>
 <PhoneInput label="Telefone" value={phone} onValueChange={setPhone} countries={[{id:"BR",label:"Brasil",dialCode:"+55",format:phone.nationalNumber.length>10?"(##) #####-####":"(##) ####-#####"},{id:"US",label:"EUA",dialCode:"+1",format:"(###) ###-####"},{id:"PT",label:"Portugal",dialCode:"+351",format:"### ### ###"}]} />
 <Field><Label>Observações</Label><Textarea aria-label="Observações" value={note} onChange={event=>setNote(event.target.value)} placeholder="Detalhes adicionais" maxLength={500} /><p className={s.note}>{note.length}/500 caracteres</p></Field>
 </div></section>;
}
