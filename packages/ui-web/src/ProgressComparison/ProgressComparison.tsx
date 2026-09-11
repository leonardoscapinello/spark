import type { CSSProperties } from "react";
import s from "./ProgressComparison.module.css";
export interface ProgressMeasure {id:string;label:string;value:number;color:1|2|3;valueLabel?:string}
/** Compara medidas na mesma escala; não calcula métricas de negócio. */
export function ProgressComparison({label,items,max=100,variant="grouped"}:{label:string;items:readonly ProgressMeasure[];max?:number;variant?:"grouped"|"overlay"}){
 const validMax=Number.isFinite(max)&&max>0?max:100;
 return <div className={s.root} role="group" aria-label={label}><div className={s.bars} data-variant={variant}>{items.map((item,index)=>{const known=Number.isFinite(item.value);const value=known?Math.max(0,Math.min(item.value,validMax)):0;return <div className={s.row} key={item.id}>{variant==="grouped"&&<span>{item.label}</span>}<div role="progressbar" aria-label={item.label} aria-valuemin={0} aria-valuemax={validMax} {...(known?{"aria-valuenow":value}:{})} aria-valuetext={known?(item.valueLabel??String(item.value)):"Sem dados"} className={s.track} style={{"--measure-color":`var(--ui-chart${item.color})`,"--measure-width":`${value/validMax*100}%`,"--measure-index":index} as CSSProperties}><div className={s.fill}/></div></div>;})}</div><ul className={s.legend}>{items.map(item=><li key={item.id}><span className={s.swatch} style={{background:`var(--ui-chart${item.color})`}}/>{item.label}<strong>{Number.isFinite(item.value)?item.valueLabel??item.value:"Sem dados"}</strong></li>)}</ul></div>;
}
