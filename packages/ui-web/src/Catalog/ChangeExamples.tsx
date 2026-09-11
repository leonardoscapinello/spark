import { useState } from "react";
import { money, type Money, type CashCurrency } from "@spark/core";
import { ChangeCalculator } from "../ChangeCalculator/ChangeCalculator.js";
import { Select } from "../Select/Select.js";
import s from "./Catalog.module.css";
export function ChangeExamples(){const [currency,setCurrency]=useState<CashCurrency>("BRL");const [total,setTotal]=useState<Money|null>(money(3540));const [received,setReceived]=useState<Money|null>(money(5000));const [cent,setCent]=useState(false);return <section id="catalog-change" className={s.card}><h2>Calculadora de troco</h2><div className={s.rows}><Select label="Moeda do troco" value={currency} options={[{value:"BRL",label:"Real brasileiro"},{value:"USD",label:"Dólar americano"}]} onValueChange={v=>{if(v==="BRL"||v==="USD"){setCurrency(v);setTotal(null);setReceived(null);setCent(v==="USD");}}}/><ChangeCalculator currency={currency} total={total} received={received} onTotalChange={setTotal} onReceivedChange={setReceived} includeOneCent={cent} onIncludeOneCentChange={setCent}/></div></section>;}
