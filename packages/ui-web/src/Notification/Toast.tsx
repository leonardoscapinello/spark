import { Toaster as SonnerToaster, toast } from "sonner";
import { Notification, type NotificationProps } from "./Notification.js";
import s from "./Notification.module.css";
/** Montar uma única vez na raiz da aplicação. */
export function Toaster(){return <SonnerToaster position="bottom-right" offset="var(--space-6)" mobileOffset="var(--space-4)" />;}
export function notify(props:NotificationProps,options:{id?:string|number;duration?:number}={}) {
  return toast.custom(id=><div className={s.toast}><Notification {...props} onDismiss={()=>{toast.dismiss(id);props.onDismiss?.();}} /></div>,options);
}
export const dismissNotification = toast.dismiss;
