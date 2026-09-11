import { useState } from "react";
import type { SelectOption } from "./Select.js";
import s from "./OptionContent.module.css";
export function OptionContent({option,compact=false}:{option:SelectOption;compact?:boolean}){
 const [failed,setFailed]=useState<string|null>(null);
 return <span className={s.root}>{option.avatar!==undefined&&<span className={s.avatar} aria-hidden="true">{option.avatar&&failed!==option.avatar?<img src={option.avatar} alt="" onError={()=>setFailed(option.avatar??null)}/>:option.label.split(" ").slice(0,2).map(word=>word[0]).join("")}</span>}<span className={s.copy}><span>{option.label}</span>{!compact&&option.description&&<span className={s.description}>{option.description}</span>}</span></span>;
}
