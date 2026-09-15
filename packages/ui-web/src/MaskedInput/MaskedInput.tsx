import { NumericFormat, PatternFormat, type PatternFormatProps } from "react-number-format";
import { maskTaxDocumentInput, money, toCents, type Money } from "@spark/core";
import { Input, type InputProps } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
import s from "./MaskedInput.module.css";
export type MaskedInputProps = Omit<PatternFormatProps<InputProps>,"customInput"|"onValueChange"|"value"|"defaultValue"> & {value:string;onValueChange:(digits:string)=>void};
/** Máscara visual; validação de CPF, CEP ou telefone pertence ao core. */
export function MaskedInput({value,onValueChange,...props}:MaskedInputProps){return <PatternFormat {...props} customInput={Input} value={value} valueIsNumericString onValueChange={(values,source)=>{if(source.source==="event")onValueChange(values.value);}} />;}
/**
 * Dinheiro digitado da direita para a esquerda, como em caixa e em aplicativo
 * de banco: cada dígito entra no centavo e empurra o resto. Digitar 9 e 0 dá
 * R$ 0,90; mais um 0 dá R$ 9,00.
 *
 * Por que não uma máscara decimal comum: com casas fixas o cursor nasce antes
 * da vírgula e vender algo por noventa centavos vira uma briga com o campo —
 * era preciso apagar «0,00» e acertar a posição. Aqui o valor é só uma
 * sequência de centavos, e a formatação é de saída.
 */
export function MoneyInput({value,onValueChange,label,currency="BRL",disabled=false,onBlur}:{value:Money|null;onValueChange:(value:Money|null)=>void;label:string;currency?:"BRL"|"USD";disabled?:boolean;onBlur?:()=>void}){
  const centavos=value===null?null:toCents(value);
  const prefixo=currency==="BRL"?"R$ ":"US$ ";
  const texto=centavos===null?"":`${prefixo}${formatCents(centavos,currency)}`;
  function digitar(bruto:string){
    const digitos=bruto.replace(/\D/g,"").slice(0,15);
    if(digitos==="")return onValueChange(null);
    onValueChange(money(Number(digitos)));
  }
  return <Input
    aria-label={label}
    disabled={disabled}
    inputMode="numeric"
    value={texto}
    placeholder={`${prefixo}0,00`}
    onBlur={onBlur}
    onChange={event=>digitar(event.target.value)}
  />;
}

/** Centavos → «1.234,56», com o separador da moeda. */
function formatCents(centavos:number,currency:"BRL"|"USD"):string{
  const sinal=centavos<0?"-":"";
  const absoluto=Math.abs(centavos);
  const inteiro=Math.trunc(absoluto/100);
  const resto=String(absoluto%100).padStart(2,"0");
  const decimal=currency==="BRL"?",":".";
  const milhar=currency==="BRL"?".":",";
  const inteiroFormatado=String(inteiro).replace(/\B(?=(\d{3})+(?!\d))/g,milhar);
  return `${sinal}${inteiroFormatado}${decimal}${resto}`;
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

/**
 * CPF ou CNPJ no mesmo campo. A máscara troca sozinha ao passar de 11 dígitos:
 * o próprio número diz qual documento é, e pedir para escolher antes de digitar
 * é uma pergunta que o dado já responde.
 *
 * Devolve só os DÍGITOS, como `MoneyInput` devolve centavos — a máscara é de
 * saída. Assim «11.222.333/0001-81» e «11222333000181» são a mesma linha, e
 * procurar por um CNPJ encontra todo registro que o cita.
 */
export function DocumentInput({value,onValueChange,label,disabled=false,onBlur}:{value:string;onValueChange:(digits:string)=>void;label:string;disabled?:boolean;onBlur?:()=>void}){
  return <Input
    aria-label={label}
    disabled={disabled}
    inputMode="numeric"
    autoComplete="off"
    value={maskTaxDocumentInput(value)}
    placeholder="000.000.000-00"
    onBlur={onBlur}
    onChange={event=>onValueChange(event.target.value.replace(/\D/g,"").slice(0,14))}
  />;
}

export interface PhoneCountry {id:string;label:string;dialCode:string;format:string}
export interface PhoneDraft {country:string;nationalNumber:string}
export function PhoneInput({value,onValueChange,countries,label,disabled=false}:{value:PhoneDraft;onValueChange:(value:PhoneDraft)=>void;countries:readonly PhoneCountry[];label:string;disabled?:boolean}){
  const selected=countries.find(country=>country.id===value.country);
  return <div className={s.phone} role="group" aria-label={label}><div className={s.country}><Select label={`DDI de ${label}`} disabled={disabled} options={countries.map(country=>({value:country.id,label:`${country.label} ${country.dialCode}`}))} value={value.country} onValueChange={country=>{if(country && country!==value.country)onValueChange({country,nationalNumber:""});}} /></div><MaskedInput aria-label={label} disabled={disabled || !selected} type="tel" autoComplete="tel-national" format={selected?.format ?? "###############"} value={value.nationalNumber} onValueChange={nationalNumber=>onValueChange({...value,nationalNumber})} /></div>;
}
