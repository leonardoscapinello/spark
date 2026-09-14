import { NumericFormat, PatternFormat, type PatternFormatProps } from "react-number-format";
import { moneyFromDecimal, moneyToDecimalString, type Money } from "@spark/core";
import { Input, type InputProps } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
import s from "./MaskedInput.module.css";
export type MaskedInputProps = Omit<PatternFormatProps<InputProps>,"customInput"|"onValueChange"|"value"|"defaultValue"> & {value:string;onValueChange:(digits:string)=>void};
/** Máscara visual; validação de CPF, CEP ou telefone pertence ao core. */
export function MaskedInput({value,onValueChange,...props}:MaskedInputProps){return <PatternFormat {...props} customInput={Input} value={value} valueIsNumericString onValueChange={(values,source)=>{if(source.source==="event")onValueChange(values.value);}} />;}
export function MoneyInput({value,onValueChange,label,currency="BRL",disabled=false,onBlur}:{value:Money|null;onValueChange:(value:Money|null)=>void;label:string;currency?:"BRL"|"USD";disabled?:boolean;onBlur?:()=>void}){
  return <NumericFormat customInput={Input} aria-label={label} disabled={disabled} onBlur={onBlur} inputMode="decimal" value={value===null ? "" : moneyToDecimalString(value)} valueIsNumericString decimalScale={2} fixedDecimalScale decimalSeparator={currency==="BRL"?",":"."} thousandSeparator={currency==="BRL"?".":","} prefix={currency==="BRL"?"R$ ":"US$ "} allowNegative={false} isAllowed={({value:raw})=>{if(!raw)return true;try{moneyFromDecimal(raw);return true;}catch{return false;}}} onValueChange={(values,source)=>{if(source.source==="event")onValueChange(values.value ? moneyFromDecimal(values.value):null);}} />;
}
/**
 * Porcentagem com duas casas e o símbolo no campo: «12,50 %».
 *
 * Trabalha em PONTO-BASE (1% = 100), a mesma unidade que o banco guarda — o
 * mesmo motivo de dinheiro ser centavo: 0,1 + 0,2 em ponto flutuante não fecha,
 * e desconto errado por um centavo aparece na soma do negócio.
 */
export function PercentInput({value,onValueChange,label,disabled=false,onBlur}:{value:number|null;onValueChange:(basisPoints:number|null)=>void;label:string;disabled?:boolean;onBlur?:()=>void}){
  return <NumericFormat customInput={Input} aria-label={label} disabled={disabled} onBlur={onBlur} inputMode="decimal"
    value={value===null?"":(value/100).toFixed(2)} valueIsNumericString
    decimalScale={2} fixedDecimalScale decimalSeparator="," thousandSeparator="." suffix=" %" allowNegative={false}
    isAllowed={({floatValue})=>floatValue===undefined || (floatValue>=0 && floatValue<=100)}
    onValueChange={(values,source)=>{if(source.source!=="event")return;onValueChange(values.value===""?null:Math.round(Number(values.value)*100));}} />;
}

export interface PhoneCountry {id:string;label:string;dialCode:string;format:string}
export interface PhoneDraft {country:string;nationalNumber:string}
export function PhoneInput({value,onValueChange,countries,label,disabled=false}:{value:PhoneDraft;onValueChange:(value:PhoneDraft)=>void;countries:readonly PhoneCountry[];label:string;disabled?:boolean}){
  const selected=countries.find(country=>country.id===value.country);
  return <div className={s.phone} role="group" aria-label={label}><div className={s.country}><Select label={`DDI de ${label}`} disabled={disabled} options={countries.map(country=>({value:country.id,label:`${country.label} ${country.dialCode}`}))} value={value.country} onValueChange={country=>{if(country && country!==value.country)onValueChange({country,nationalNumber:""});}} /></div><MaskedInput aria-label={label} disabled={disabled || !selected} type="tel" autoComplete="tel-national" format={selected?.format ?? "###############"} value={value.nationalNumber} onValueChange={nationalNumber=>onValueChange({...value,nationalNumber})} /></div>;
}
