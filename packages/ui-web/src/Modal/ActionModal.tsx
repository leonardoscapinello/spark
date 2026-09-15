import { useRef, useState, type ReactNode } from "react";
import { Modal, ModalContent, type ModalContentProps } from "./Modal.js";
import { Button } from "../Button/Button.js";
import { Notification } from "../Notification/Notification.js";
export function ActionModal({open,onOpenChange,title,children,onConfirm,confirmLabel="Confirmar",cancelLabel="Cancelar",errorText="Não foi possível concluir. Tente novamente.",size="default"}:{open:boolean;onOpenChange:(open:boolean)=>void;title:string;children:ReactNode;onConfirm:()=>void|Promise<void>;confirmLabel?:string;cancelLabel?:string;errorText?:string;size?:ModalContentProps["size"]}) {
  const [pending,setPending]=useState(false);const [error,setError]=useState<string|null>(null);const busy=useRef(false);
  async function confirm(){if(busy.current)return;busy.current=true;setPending(true);setError(null);try{await onConfirm();onOpenChange(false);}catch(cause){
    /* A mensagem que veio é a que explica o que houve. Engolir tudo num texto
     * fixo fazia a modal dizer «preencha nome, quantidade e preço» mesmo com
     * os três preenchidos, escondendo a falha de verdade. */
    setError(cause instanceof Error && cause.message ? cause.message : errorText);}finally{busy.current=false;setPending(false);}}
  return <Modal open={open} onOpenChange={next=>{if(!busy.current){setError(null);onOpenChange(next);}}}><ModalContent title={title} size={size} closeDisabled={pending} aria-busy={pending} footer={<><Button variant="ghost" disabled={pending} onClick={()=>{setError(null);onOpenChange(false);}}>{cancelLabel}</Button><Button loading={pending} onClick={()=>void confirm()}>{confirmLabel}</Button></>}>{children}{error !== null && <div role="alert"><Notification title={error} tone="error" /></div>}</ModalContent></Modal>;
}
