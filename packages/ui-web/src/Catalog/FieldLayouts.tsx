import { FormField } from "../FormField/FormField.js";
import { Input } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
import { Textarea } from "../Textarea/Textarea.js";
import s from "./Catalog.module.css";
export function FieldLayouts(){return <section className={s.card}><h2>Composições de campo</h2><div className={s.rows}>
<FormField label="Nome" description="Legenda acima do campo."><Input placeholder="Nome do contato" /></FormField>
<FormField label="E-mail" layout="horizontal" description="Legenda à esquerda; ajuda acompanha o campo."><Input type="email" placeholder="nome@empresa.com" /></FormField>
<FormField label="Equipe" layout="horizontal"><Select label="Equipe" options={[{value:"support",label:"Atendimento"},{value:"sales",label:"Vendas"}]} defaultValue="support" /></FormField>
<FormField label="Observações" layout="horizontal"><Textarea placeholder="Escreva uma observação" /></FormField>
<FormField label="Pesquisar contatos" layout="hidden-label"><Input type="search" placeholder="Pesquisar contatos" /></FormField>
<FormField label="E-mail de cobrança" layout="horizontal" error="Informe um e-mail válido."><Input defaultValue="nome@" /></FormField>
</div></section>;}
