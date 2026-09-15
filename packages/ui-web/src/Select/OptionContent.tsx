import { Avatar } from "../Avatar/Avatar.js";
import type { SelectOption } from "./Select.js";
import s from "./OptionContent.module.css";
export function OptionContent({option,compact=false}:{option:SelectOption;compact?:boolean}){
 return <span className={s.root}>{option.avatar!==undefined&&<Avatar name={option.label} src={option.avatar} size="small" />}<span className={s.copy} data-compact={compact}><span className={s.name}>{option.label}</span>{!compact&&option.description&&<span className={s.description}>{option.description}</span>}</span></span>;
}
