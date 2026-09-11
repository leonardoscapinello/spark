import { Button, type ButtonProps } from "./Button.js";
import { Icon } from "../Icon/Icon.js";
import s from "./FeedbackButton.module.css";
import buttonStyles from "./Button.module.css";

export type FeedbackState = "idle" | "pending" | "success" | "error";
export type FeedbackButtonProps = Omit<ButtonProps,"children"|"loading"|"icon"|"trailingIcon"|"iconOnly"> & {
 state: FeedbackState;
 labels?: Partial<Record<FeedbackState,string>>;
};
const defaults = {idle:"Salvar",pending:"Salvando…",success:"Salvo",error:"Tentar novamente"};
/** O chamador controla o estado com o resultado real da operação. */
export function FeedbackButton({state,labels,disabled,className,...props}:FeedbackButtonProps) {
 const text={...defaults,...labels};
 return <span className={s.wrapper}>
  <Button {...props} className={[s.root,className].filter(Boolean).join(" ")} data-feedback={state} disabled={disabled||state==="pending"} aria-busy={state==="pending"} aria-label={text[state]}>
   <span className={s.layers} aria-hidden="true">{(Object.keys(defaults) as FeedbackState[]).map(item=><span key={item} className={s.layer} data-active={item===state}>
    <span className={s.symbol}>{item==="pending"?<span className={buttonStyles.spinner}/>:item==="success"?<Icon name="check"/>:item==="error"?<Icon name="close"/>:null}</span>{text[item]}
   </span>)}</span>
  </Button>
  <span role="status" aria-live="polite" aria-atomic="true" className={s.announcement}>{state==="idle"?"":state==="error"?`Não foi possível salvar. ${text.error}`:text[state]}</span>
 </span>;
}
