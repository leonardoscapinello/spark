import { useState } from "react";
import { DatePicker, TimePicker, DateTimePicker } from "../DateTimePicker/DateTimePicker.js";
import { ProgressComparison, type ProgressMeasure } from "../ProgressComparison/ProgressComparison.js";
import { FormField } from "../FormField/FormField.js";
import s from "./Catalog.module.css";
const measures:readonly ProgressMeasure[]=[{id:"goal",label:"Meta",value:100,color:3,valueLabel:"100 atendimentos"},{id:"previous",label:"Período anterior",value:76,color:2,valueLabel:"76 atendimentos"},{id:"current",label:"Período atual",value:62,color:1,valueLabel:"62 atendimentos"}];
export function DateProgressExamples(){const [date,setDate]=useState("");const [time,setTime]=useState("");const [dateTime,setDateTime]=useState("");return <>
<section id="catalog-dates" className={s.card}><h2>Calendário e relógio</h2><div className={s.rows}><FormField label="Data"><DatePicker label="Escolher data" value={date} onValueChange={setDate}/></FormField><FormField label="Horário"><TimePicker label="Escolher horário" value={time} onValueChange={setTime}/></FormField><FormField label="Data e hora"><DateTimePicker mode="datetime" label="Agendar atividade" value={dateTime} onValueChange={setDateTime}/></FormField></div></section>
<section className={s.card}><h2>Progresso · barras comparativas</h2><div className={s.rows}><ProgressComparison label="Comparação de dois períodos" items={measures.slice(1)} /><ProgressComparison label="Meta e períodos sobrepostos" items={measures} variant="overlay" /></div></section></>;}
