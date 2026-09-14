import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { Modal, ModalTrigger, ModalContent } from "../Modal/Modal.js";
import { Button } from "../Button/Button.js";
import { Select } from "../Select/Select.js";
import { Icon } from "../Icon/Icon.js";
import s from "./DateTimePicker.module.css";
export type DateTimeMode = "date" | "time" | "datetime";
export interface DateTimePickerProps {label:string;value:string;onValueChange:(value:string)=>void;mode?:DateTimeMode;disabled?:boolean;placeholder?:string}
const pad=(n:number)=>String(n).padStart(2,"0");
function readDate(text:string):Date|undefined {if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return undefined;const [y=0,m=0,d=0]=text.split("-").map(Number);const result=new Date(y,m-1,d);return result.getFullYear()===y && result.getMonth()===m-1 && result.getDate()===d ? result:undefined;}
function dateText(date:Date){return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;}
function Clock({time}:{time:string}){const [hour=0,minute=0]=time.split(":").map(Number);return <svg className={s.clock} viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" className={s.face}/>{Array.from({length:12},(_,i)=><line key={i} x1="50" y1="8" x2="50" y2="12" transform={`rotate(${i*30} 50 50)`} className={s.tick}/>)}<line x1="50" y1="50" x2="50" y2="27" transform={`rotate(${hour*30+minute/2} 50 50)`} className={s.hand}/><line x1="50" y1="50" x2="50" y2="16" transform={`rotate(${minute*6} 50 50)`} className={s.hand}/><circle cx="50" cy="50" r="3" className={s.center}/></svg>;}
/* Campo vazio mostra o FORMATO, não a palavra «Selecionar»: quem bate o olho
 * precisa reconhecer que ali vai uma data, e já saber como ela é escrita. */
const EMPTY_HINT:Record<DateTimeMode,string>={date:"dd/mm/aaaa",time:"hh:mm",datetime:"dd/mm/aaaa hh:mm"};
export function DateTimePicker({label,value,onValueChange,mode="date",disabled=false,placeholder}:DateTimePickerProps){
 const hint=placeholder ?? EMPTY_HINT[mode];
 const [open,setOpen]=useState(false);const [date,setDate]=useState<Date|undefined>();const [time,setTime]=useState("09:00");
 function changeOpen(next:boolean){if(next){setDate(readDate(value.split("T")[0] ?? ""));const candidate=mode==="time"?value:value.split("T")[1];setTime(candidate && /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate)?candidate:"09:00");}setOpen(next);}
 const parts=value.split("T");const shownDate=readDate(parts[0]??"");const display=mode==="time"?value:shownDate?`${shownDate.toLocaleDateString("pt-BR")}${mode==="datetime"?` às ${parts[1]??""}`:""}`:"";
 const [hour="09",minute="00"]=time.split(":");
 return <Modal open={open} onOpenChange={changeOpen}><ModalTrigger disabled={disabled} render={<Button className={s.trigger} data-empty={!display} variant="secondary" shape="rounded" aria-label={`${label}: ${display||hint}`} icon={<Icon name="calendar" />}>{display||hint}</Button>} /><ModalContent title={label} description={mode==="date"?"Escolha uma data no calendário.":mode==="time"?"Escolha a hora e os minutos.":"Escolha a data e o horário local."} footer={<><Button variant="ghost" onClick={()=>{onValueChange("");setOpen(false);}}>Limpar</Button><Button variant="ghost" onClick={()=>setOpen(false)}>Cancelar</Button><Button disabled={mode!=="time"&&!date} onClick={()=>{onValueChange(mode==="time"?time:date?`${dateText(date)}${mode==="datetime"?`T${time}`:""}`:"");setOpen(false);}}>Aplicar</Button></>}><div className={s.layout}>
 {mode!=="time" && <DayPicker mode="single" locale={ptBR} selected={date} onSelect={setDate} {...(date ? {defaultMonth:date} : {})} autoFocus showOutsideDays classNames={{root:s.calendar ?? "",months:s.months ?? "",month:s.month ?? "",month_caption:s.caption ?? "",nav:s.nav ?? "",button_previous:s.navButton ?? "",button_next:s.navButton ?? "",chevron:s.chevron ?? "",month_grid:s.grid ?? "",weekday:s.weekday ?? "",day:s.day ?? "",day_button:s.dayButton ?? "",selected:s.selected ?? "",today:s.today ?? "",outside:s.outside ?? ""}} />}
 {mode!=="date" && <div className={s.time}><Clock time={time}/><div className={s.timeFields}><div className={s.timeField}><Select label="Horas" value={hour} onValueChange={v=>{if(v)setTime(`${v}:${minute}`);}} options={Array.from({length:24},(_,n)=>({value:pad(n),label:pad(n)}))}/></div><span aria-hidden="true">:</span><div className={s.timeField}><Select label="Minutos" value={minute} onValueChange={v=>{if(v)setTime(`${hour}:${v}`);}} options={Array.from({length:60},(_,n)=>({value:pad(n),label:pad(n)}))}/></div></div><p className={s.hint}>Formato de 24 horas</p></div>}
 </div></ModalContent></Modal>;
}
export function DatePicker(props:Omit<DateTimePickerProps,"mode">){return <DateTimePicker {...props} mode="date"/>;}
export function TimePicker(props:Omit<DateTimePickerProps,"mode">){return <DateTimePicker {...props} mode="time"/>;}
