import { useRef, useState, type ReactNode } from "react";
import { Modal, ModalContent, type ModalContentProps } from "./Modal.js";
import { Button } from "../Button/Button.js";
import { Notification } from "../Notification/Notification.js";
export function ActionModal({open,onOpenChange,title,children,onConfirm,confirmLabel="Confirmar",errorText="Não foi possível concluir. Tente novamente.",size="default"}:{open:boolean;onOpenChange:(open:boolean)=>void;title:string;children:ReactNode;onConfirm:()=>void|Promise<void>;confirmLabel?:string;errorText?:string;size?:ModalContentProps["size"]}) {
  const [pending,setPending]=useState(false);const [error,setError]=useState(false);const busy=useRef(false);
  async function confirm(){if(busy.current)return;busy.current=true;setPending(true);setError(false);try{await onConfirm();onOpenChange(false);}catch{setError(true);}finally{busy.current=false;setPending(false);}}
  return <Modal open={open} onOpenChange={next=>{if(!busy.current){setError(false);onOpenChange(next);}}}><ModalContent title={title} size={size} closeDisabled={pending} aria-busy={pending} footer={<><Button variant="ghost" disabled={pending} onClick={()=>{setError(false);onOpenChange(false);}}>Cancelar</Button><Button loading={pending} onClick={()=>void confirm()}>{confirmLabel}</Button></>}>{children}{error && <div role="alert"><Notification title={errorText} tone="error" /></div>}</ModalContent></Modal>;
}
