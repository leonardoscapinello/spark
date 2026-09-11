import { Modal, ModalTrigger, ModalClose, ModalContent, type ModalContentProps } from "../Modal/Modal.js";
export const Panel = Modal;
export const PanelTrigger = ModalTrigger;
export const PanelClose = ModalClose;
export type PanelSide = "left" | "right" | "top" | "bottom";
export type PanelContentProps = Omit<ModalContentProps,"placement"|"size"> & {side?:PanelSide};
/** Painel ancorado à borda; compartilha foco e acessibilidade com Dialog. */
export function PanelContent({side="right",...props}:PanelContentProps){return <ModalContent {...props} placement={side} />;}
