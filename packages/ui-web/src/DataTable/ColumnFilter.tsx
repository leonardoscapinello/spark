import { useState } from "react";
import { Button } from "../Button/Button.js";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { Icon } from "../Icon/Icon.js";
import { Input } from "../Input/Input.js";
import { Popover, PopoverContent, PopoverTrigger } from "../Popover/Popover.js";
import s from "./DataTable.module.css";

export function ColumnFilter({ label, values, selected, onChange }: { label:string; values:readonly (string|null)[]; selected:readonly (string|null)[]|undefined; onChange:(values:readonly (string|null)[]|undefined)=>void }) {
  const [query,setQuery]=useState("");
  const search=query.trim().toLocaleLowerCase("pt-BR");
  const visible=values.filter(value=>(value ?? "(Vazios)").toLocaleLowerCase("pt-BR").includes(search));
  return <Popover>
    <PopoverTrigger render={<Button size="sm" variant="ghost" iconOnly className={s.filterButton} data-active={selected!==undefined||undefined} aria-label={`Filtrar ${label}${selected!==undefined ? " (ativo)" : ""}`} icon={<Icon name="filter" />} />} />
    <PopoverContent title={`Filtrar ${label}`}>
      <Input autoFocus aria-label={`Buscar valores de ${label}`} placeholder="Buscar valores" value={query} onChange={event=>setQuery(event.target.value)} />
      <div className={s.filterActions}><Button size="sm" variant="ghost" onClick={()=>onChange(undefined)}>Selecionar todos</Button><Button size="sm" variant="ghost" onClick={()=>onChange([])}>Desmarcar todos</Button></div>
      <div className={s.catalogList}>{visible.map(value=><Checkbox key={value===null ? "null" : `value:${value}`} checked={selected===undefined||selected.includes(value)} onCheckedChange={checked=>{const current=selected ?? values;onChange(checked ? [...current,value] : current.filter(v=>v!==value));}}>{value ?? "(Vazios)"}</Checkbox>)}{!visible.length&&<p className={s.catalogEmpty}>Nenhum valor encontrado.</p>}</div>
      <Button size="sm" variant="ghost" disabled={selected===undefined} onClick={()=>onChange(undefined)}>Limpar filtro desta coluna</Button>
    </PopoverContent>
  </Popover>;
}
