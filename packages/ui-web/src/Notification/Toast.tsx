import { Toaster as SonnerToaster, toast } from "sonner";
import { lightTheme } from "@spark/tokens/native-theme";
import { Notification, type NotificationProps } from "./Notification.js";
import s from "./Notification.module.css";
/** Montar uma única vez na raiz da aplicação. Pilha no canto inferior direito:
 * até 3 visíveis, recuo de 9px por nível, abre no hover (origem: Toast). */
export function Toaster(){return <SonnerToaster position="bottom-right" offset="var(--space-6)" mobileOffset="var(--space-4)" visibleToasts={3} gap={Number.parseFloat(lightTheme["space-2"])} duration={Number.parseFloat(lightTheme["t-toast-life"])} />;}
export function notify(props:NotificationProps,options:{id?:string|number;duration?:number}={}) {
  return toast.custom(id=><div className={s.toast}><Notification {...props} onDismiss={()=>{toast.dismiss(id);props.onDismiss?.();}} /></div>,options);
}
export const dismissNotification = toast.dismiss;
