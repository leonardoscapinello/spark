import type { ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import s from "./Notification.module.css";
export interface NotificationProps { title:string; description?:string; tone?:"info"|"success"|"warning"|"error"; actions?:ReactNode; onDismiss?:()=>void; unread?:boolean }
export function Notification({title,description,tone="info",actions,onDismiss,unread=false}:NotificationProps) {
  return <article className={s.notification} data-tone={tone} data-unread={unread}><div className={s.content}><strong>{title}</strong>{unread && <span className={s.unread}>Não lida</span>}{description && <p>{description}</p>}{actions && <div className={s.actions}>{actions}</div>}</div>{onDismiss && <Button iconOnly size="sm" variant="ghost" aria-label={`Dispensar ${title}`} icon={<Icon name="close" />} onClick={onDismiss} />}</article>;
}
export interface NotificationEntry extends Omit<NotificationProps,"onDismiss"|"actions"> {id:string}
export function NotificationList({items,onRead,onDismiss}:{items:readonly NotificationEntry[];onRead?:(id:string)=>void;onDismiss?:(id:string)=>void}) {
  if(!items.length)return <p className={s.empty} role="status">Nenhuma notificação</p>;
  return <ul className={s.list} aria-label="Notificações">{items.map(item=><li key={item.id}><Notification {...item} {...(onDismiss ? {onDismiss:()=>onDismiss(item.id)} : {})} actions={item.unread && onRead ? <Button size="sm" variant="ghost" onClick={()=>onRead(item.id)}>Marcar como lida</Button>:undefined} /></li>)}</ul>;
}
