import { Fragment, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { Icon } from "../Icon/Icon.js";
import { TableActions, TableIconAction } from "./TableActions.js";
import s from "./DataTable.module.css";
export interface TableColumn<T> {id:string;label:string;cell:(row:T)=>ReactNode;sortValue?:(row:T)=>string|number;align?:"start"|"end"}
export interface DataTableProps<T> {label:string;rows:readonly T[];columns:readonly TableColumn<T>[];rowKey:(row:T)=>string;actions?:(row:T)=>ReactNode;renderExpanded?:(row:T)=>ReactNode;rowLabel?:(row:T)=>string;state?:"ready"|"loading"|"error";onRetry?:()=>void;emptyText?:string;selectedIds?:readonly string[];onSelectionChange?:(ids:string[])=>void}
export function DataTable<T>({label,rows,columns,rowKey,actions,renderExpanded,rowLabel=rowKey,state="ready",onRetry,emptyText="Nenhum registro encontrado",selectedIds,onSelectionChange}:DataTableProps<T>){
 const detailId=useId();
 const scrollRef=useRef<HTMLDivElement>(null);
 const [hasOverflow,setHasOverflow]=useState(false);
 const [expanded,setExpanded]=useState<ReadonlySet<string>>(new Set());
 const hasActions=Boolean(actions||renderExpanded);
 const selectable=Boolean(onSelectionChange);
 const selected=useMemo(()=>new Set(selectedIds??[]),[selectedIds]);
 const [sort,setSort]=useState<{id:string;direction:1|-1}|null>(null);
 const ordered=useMemo(()=>{const accessor=columns.find(c=>c.id===sort?.id)?.sortValue;if(!accessor||!sort)return rows;return [...rows].sort((a,b)=>{const left=accessor(a),right=accessor(b);return (typeof left==="number"&&typeof right==="number"?left-right:String(left).localeCompare(String(right),"pt-BR",{numeric:true}))*sort.direction;});},[rows,columns,sort]);
 const allSelected=ordered.length>0&&ordered.every(row=>selected.has(rowKey(row)));
 const someSelected=ordered.some(row=>selected.has(rowKey(row)));
 useEffect(()=>{
  const region=scrollRef.current;
  if(!region)return;
  const measure=()=>setHasOverflow(region.scrollWidth>region.clientWidth);
  measure();
  const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(measure):null;
  observer?.observe(region);
  const table=region.querySelector("table");
  if(table)observer?.observe(table);
  window.addEventListener("resize",measure);
  return()=>{observer?.disconnect();window.removeEventListener("resize",measure);};
 },[state]);
 return <div className={s.root}>{state==="loading"?<div className={s.scroll} role="status" aria-label={`Carregando ${label}`}><table className={s.table} data-selectable={selectable||undefined} aria-hidden="true"><caption>{label}</caption><thead><tr>{selectable&&<th scope="col" className={s.select}/>}{columns.map(column=><th key={column.id} scope="col">{column.label}</th>)}{hasActions&&<th scope="col"><span className={s.visuallyHidden}>Ações</span></th>}</tr></thead><tbody>{[0,1,2].map(index=><tr key={index}>{selectable&&<td className={s.select}/>}{columns.map(column=><td key={column.id}><span className={s.loadingLine}/></td>)}{hasActions&&<td><span className={s.loadingLine}/></td>}</tr>)}</tbody></table></div>:state==="error"?<div role="alert"><p>Não foi possível carregar os registros.</p>{onRetry&&<Button variant="secondary" onClick={onRetry}>Tentar novamente</Button>}</div>:<><div ref={scrollRef} className={s.scroll} role="region" aria-label={label} tabIndex={0}><table className={s.table} data-selectable={selectable||undefined}><caption>{label}</caption><thead><tr>{selectable&&<th scope="col" className={s.select}><Checkbox checked={allSelected} indeterminate={someSelected&&!allSelected} disabled={ordered.length===0} onCheckedChange={()=>onSelectionChange?.(allSelected?[]:ordered.map(rowKey))}><span className={s.visuallyHidden}>{allSelected?`Limpar seleção de ${label}`:`Selecionar todas as linhas de ${label}`}</span></Checkbox></th>}{columns.map(column=><th key={column.id} scope="col" data-align={column.align} aria-sort={column.sortValue?(sort?.id===column.id?(sort.direction===1?"ascending":"descending"):"none"):undefined}>{column.sortValue?<Button size="sm" variant="ghost" className={s.sortButton} onClick={()=>setSort(previous=>({id:column.id,direction:previous?.id===column.id&&previous.direction===1?-1:1}))}>{column.label}{sort?.id===column.id&&<Icon name={sort.direction===1?"up":"chevron"} className={s.sortIcon}/>}</Button>:column.label}</th>)}{hasActions&&<th scope="col"><span className={s.visuallyHidden}>Ações</span></th>}</tr></thead><tbody>{ordered.map(row=><Fragment key={rowKey(row)}><tr data-selected={selected.has(rowKey(row))||undefined}>{selectable&&<td className={s.select}><Checkbox checked={selected.has(rowKey(row))} onCheckedChange={checked=>onSelectionChange?.(checked?[...selected,rowKey(row)]:[...selected].filter(id=>id!==rowKey(row)))}><span className={s.visuallyHidden}>Selecionar {rowLabel(row)}</span></Checkbox></td>}{columns.map(column=><td key={column.id} data-align={column.align}>{column.cell(row)}</td>)}{hasActions&&<td className={s.actions}><TableActions label={`Ações de ${rowLabel(row)}`}>{actions?.(row)}{renderExpanded&&<TableIconAction label={`${expanded.has(rowKey(row))?"Recolher":"Expandir"} detalhes de ${rowLabel(row)}`} aria-expanded={expanded.has(rowKey(row))} aria-controls={`${detailId}-${encodeURIComponent(rowKey(row))}`} icon={<Icon name={expanded.has(rowKey(row))?"up":"chevron"}/>} onClick={()=>setExpanded(previous=>{const next=new Set(previous);if(next.has(rowKey(row)))next.delete(rowKey(row));else next.add(rowKey(row));return next;})}/>}</TableActions></td>}</tr>{renderExpanded&&<tr hidden={!expanded.has(rowKey(row))} id={`${detailId}-${encodeURIComponent(rowKey(row))}`}><td colSpan={columns.length+(selectable?1:0)+1}>{expanded.has(rowKey(row))&&renderExpanded(row)}</td></tr>}</Fragment>)}</tbody></table></div>{ordered.length===0&&<div className={s.emptyState} role="status">{emptyText}</div>}{hasOverflow&&ordered.length>0&&<p className={s.hint}>Deslize a tabela para ver todas as colunas.</p>}</>}</div>;
}
