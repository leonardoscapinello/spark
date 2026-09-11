import { useEffect, useRef, useState } from "react";
import { FeedbackButton, type FeedbackState } from "../Button/FeedbackButton.js";
import s from "./Catalog.module.css";
function Example({fail=false}:{fail?:boolean}) {
 const [state,setState]=useState<FeedbackState>("idle");
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 return <FeedbackButton state={state} labels={fail?{idle:"Testar erro"}:{}} onClick={()=>{if(timer.current)clearTimeout(timer.current);setState("pending");timer.current=setTimeout(()=>setState(fail?"error":"success"),1000);}}/>;
}
export function ButtonFeedbackExamples(){return <><div className={s.row}><Example/><Example fail/></div><p>Teste o retorno de sucesso e de erro. O tempo de espera é simulado apenas neste catálogo.</p></>;}
