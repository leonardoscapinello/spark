import { Fragment, useEffect, useId, useMemo, useRef, useState, type DragEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { Icon } from "../Icon/Icon.js";
import { ColumnCatalog } from "./ColumnCatalog.js";
import { ColumnResizer } from "./ColumnResizer.js";
import { applyColumnOrder, moveColumn } from "./columnOrder.js";
import { TableActions, TableIconAction } from "./TableActions.js";
import s from "./DataTable.module.css";
export interface TableColumn<T> {id:string;label:string;cell:(row:T)=>ReactNode;sortValue?:(row:T)=>string|number;align?:"start"|"end";group?:string;alwaysVisible?:boolean}
export interface DataTableProps<T> {label:string;rows:readonly T[];columns:readonly TableColumn<T>[];rowKey:(row:T)=>string;actions?:(row:T)=>ReactNode;renderExpanded?:(row:T)=>ReactNode;rowLabel?:(row:T)=>string;state?:"ready"|"loading"|"error";onRetry?:()=>void;emptyText?:string;selectedIds?:readonly string[];onSelectionChange?:(ids:string[])=>void;hiddenColumnIds?:readonly string[];onHiddenColumnsChange?:(ids:string[])=>void;columnWidths?:Readonly<Record<string,number>>;onColumnWidthsChange?:(widths:Record<string,number>)=>void;columnOrder?:readonly string[];onColumnOrderChange?:(ids:string[])=>void}
export function DataTable<T>({label,rows,columns,rowKey,actions,renderExpanded,rowLabel=rowKey,state="ready",onRetry,emptyText="Nenhum registro encontrado",selectedIds,onSelectionChange,hiddenColumnIds,onHiddenColumnsChange,columnWidths,onColumnWidthsChange,columnOrder,onColumnOrderChange}:DataTableProps<T>){
 const detailId=useId();
 const scrollRef=useRef<HTMLDivElement>(null);
 const [hasOverflow,setHasOverflow]=useState(false);
 const [expanded,setExpanded]=useState<ReadonlySet<string>>(new Set());
 const hasActions=Boolean(actions||renderExpanded);
 const selectable=Boolean(onSelectionChange);
 const selected=useMemo(()=>new Set(selectedIds??[]),[selectedIds]);
 const hasCatalog=Boolean(onHiddenColumnsChange);
 const reorderable=Boolean(onColumnOrderChange);
 const arranged=useMemo(()=>applyColumnOrder(columns,columnOrder),[columns,columnOrder]);
 const [dropTarget,setDropTarget]=useState<string|null>(null);
 const dragged=useRef<string|null>(null);
 const reorder=(fromId:string,toId:string)=>onColumnOrderChange?.(moveColumn(arranged.map(column=>column.id),fromId,toId));
 const resizable=Boolean(onColumnWidthsChange);
 const widths=columnWidths??{};
 const hasWidth=Object.keys(widths).length>0;
 const resize=(id:string,width:number)=>onColumnWidthsChange?.({...widths,[id]:width});
 const resetWidth=(id:string)=>{const next={...widths};delete next[id];onColumnWidthsChange?.(next);};
 const hidden=useMemo(()=>new Set(hiddenColumnIds??[]),[hiddenColumnIds]);
 const visible=useMemo(()=>hasCatalog?arranged.filter(column=>column.alwaysVisible||!hidden.has(column.id)):arranged,[arranged,hasCatalog,hidden]);
 const [sort,setSort]=useState<{id:string;direction:1|-1}|null>(null);
 const ordered=useMemo(()=>{const accessor=visible.find(c=>c.id===sort?.id)?.sortValue;if(!accessor||!sort)return rows;return [...rows].sort((a,b)=>{const left=accessor(a),right=accessor(b);return (typeof left==="number"&&typeof right==="number"?left-right:String(left).localeCompare(String(right),"pt-BR",{numeric:true}))*sort.direction;});},[rows,visible,sort]);
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
 return <div className={s.root}>{state==="loading"?<div className={s.scroll} role="status" aria-label={`Carregando ${label}`}><table className={s.table} data-selectable={selectable||undefined} data-fixed={hasWidth||undefined} aria-hidden="true"><caption>{label}</caption><thead><tr>{selectable&&<th scope="col" className={s.select}/>}{visible.map(column=><th key={column.id} scope="col" style={widths[column.id]===undefined?undefined:{width:`${widths[column.id]}px`,maxWidth:`${widths[column.id]}px`}}>{column.label}</th>)}{hasActions&&<th scope="col"><span className={s.visuallyHidden}>Ações</span></th>}{hasCatalog&&<th scope="col" className={s.catalog}/>}</tr></thead><tbody>{[0,1,2].map(index=><tr key={index}>{selectable&&<td className={s.select}/>}{visible.map(column=><td key={column.id}><span className={s.loadingLine}/></td>)}{hasActions&&<td><span className={s.loadingLine}/></td>}{hasCatalog&&<td className={s.catalog}/>}</tr>)}</tbody></table></div>:state==="error"?<div role="alert"><p>Não foi possível carregar os registros.</p>{onRetry&&<Button variant="secondary" onClick={onRetry}>Tentar novamente</Button>}</div>:<><div ref={scrollRef} className={s.scroll} role="region" aria-label={label} tabIndex={0}><table className={s.table} data-selectable={selectable||undefined} data-fixed={hasWidth||undefined}><caption>{label}</caption><thead><tr>{selectable&&<th scope="col" className={s.select}><Checkbox checked={allSelected} indeterminate={someSelected&&!allSelected} disabled={ordered.length===0} onCheckedChange={()=>onSelectionChange?.(allSelected?[]:ordered.map(rowKey))}><span className={s.visuallyHidden}>{allSelected?`Limpar seleção de ${label}`:`Selecionar todas as linhas de ${label}`}</span></Checkbox></th>}{visible.map((column,index)=><th key={column.id} scope="col" data-align={column.align}
 {...(reorderable?{draggable:true,tabIndex:column.sortValue?-1:0,"data-drop":dropTarget===column.id||undefined,
  onDragStart:(event:DragEvent<HTMLTableCellElement>)=>{dragged.current=column.id;event.dataTransfer.effectAllowed="move";},
  onDragOver:(event:DragEvent<HTMLTableCellElement>)=>{if(!dragged.current||dragged.current===column.id)return;event.preventDefault();setDropTarget(column.id);},
  onDragLeave:()=>setDropTarget(previous=>previous===column.id?null:previous),
  onDrop:(event:DragEvent<HTMLTableCellElement>)=>{event.preventDefault();if(dragged.current&&dragged.current!==column.id)reorder(dragged.current,column.id);dragged.current=null;setDropTarget(null);},
  onDragEnd:()=>{dragged.current=null;setDropTarget(null);},
  onKeyDown:(event:ReactKeyboardEvent<HTMLTableCellElement>)=>{
   if(!event.ctrlKey&&!event.metaKey)return;
   const step=event.key==="ArrowLeft"?-1:event.key==="ArrowRight"?1:0;
   const neighbour=step&&visible[index+step];
   if(!neighbour)return;
   event.preventDefault();
   reorder(column.id,neighbour.id);
  }}:{})}
 style={widths[column.id]===undefined?undefined:{width:`${widths[column.id]}px`,maxWidth:`${widths[column.id]}px`}} aria-sort={column.sortValue?(sort?.id===column.id?(sort.direction===1?"ascending":"descending"):"none"):undefined}>{column.sortValue?<Button size="sm" variant="ghost" className={s.sortButton} onClick={()=>setSort(previous=>({id:column.id,direction:previous?.id===column.id&&previous.direction===1?-1:1}))}>{column.label}{sort?.id===column.id&&<Icon name={sort.direction===1?"up":"chevron"} className={s.sortIcon}/>}</Button>:column.label}{resizable&&<ColumnResizer label={column.label} width={widths[column.id]} onResize={width=>resize(column.id,width)} onReset={()=>resetWidth(column.id)}/>}</th>)}{hasActions&&<th scope="col"><span className={s.visuallyHidden}>Ações</span></th>}{hasCatalog&&<th scope="col" className={s.catalog}><ColumnCatalog columns={columns} hidden={hidden} tableLabel={label} onChange={onHiddenColumnsChange!}/></th>}</tr></thead><tbody>{ordered.map(row=><Fragment key={rowKey(row)}><tr data-selected={selected.has(rowKey(row))||undefined}>{selectable&&<td className={s.select}><Checkbox checked={selected.has(rowKey(row))} onCheckedChange={checked=>onSelectionChange?.(checked?[...selected,rowKey(row)]:[...selected].filter(id=>id!==rowKey(row)))}><span className={s.visuallyHidden}>Selecionar {rowLabel(row)}</span></Checkbox></td>}{visible.map(column=><td key={column.id} data-align={column.align}>{column.cell(row)}</td>)}{hasActions&&<td className={s.actions}><TableActions label={`Ações de ${rowLabel(row)}`}>{actions?.(row)}{renderExpanded&&<TableIconAction label={`${expanded.has(rowKey(row))?"Recolher":"Expandir"} detalhes de ${rowLabel(row)}`} aria-expanded={expanded.has(rowKey(row))} aria-controls={`${detailId}-${encodeURIComponent(rowKey(row))}`} icon={<Icon name={expanded.has(rowKey(row))?"up":"chevron"}/>} onClick={()=>setExpanded(previous=>{const next=new Set(previous);if(next.has(rowKey(row)))next.delete(rowKey(row));else next.add(rowKey(row));return next;})}/>}</TableActions></td>}</tr>{renderExpanded&&<tr hidden={!expanded.has(rowKey(row))} id={`${detailId}-${encodeURIComponent(rowKey(row))}`}><td colSpan={visible.length+(selectable?1:0)+(hasCatalog?1:0)+1}>{expanded.has(rowKey(row))&&renderExpanded(row)}</td></tr>}</Fragment>)}</tbody></table></div>{ordered.length===0&&<div className={s.emptyState} role="status">{emptyText}</div>}{hasOverflow&&ordered.length>0&&<p className={s.hint}>Deslize a tabela para ver todas as colunas.</p>}</>}</div>;
}
