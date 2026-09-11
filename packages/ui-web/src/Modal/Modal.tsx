import { Dialog } from "@base-ui/react/dialog";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import styles from "./Modal.module.css";
export const Modal = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;
export const ModalClose = Dialog.Close;
export type ModalContentProps = Omit<ComponentProps<typeof Dialog.Popup>, "title"> & { title: string; description?: string; children: ReactNode; footer?: ReactNode; placement?: "center" | "right"; size?: "default" | "wide" | "workspace"; closeDisabled?: boolean; closeLabel?: string };
export function ModalContent({ title, description, children, footer, placement = "center", closeLabel = "Fechar", size = "default", closeDisabled = false, ...props }: ModalContentProps) {
  return <Dialog.Portal><Dialog.Backdrop className={styles.backdrop} /><Dialog.Viewport className={styles.viewport} data-placement={placement}><Dialog.Popup className={styles.popup} data-placement={placement} data-size={size} {...props}>
    <header className={styles.header}><div><Dialog.Title className={styles.title}>{title}</Dialog.Title>{description && <Dialog.Description className={styles.description}>{description}</Dialog.Description>}</div><Dialog.Close disabled={closeDisabled} render={<Button variant="ghost" iconOnly aria-label={closeLabel} icon={<Icon name="close" />} />} /></header>
    <div className={styles.body}>{children}</div>{footer && <footer className={styles.footer}>{footer}</footer>}
  </Dialog.Popup></Dialog.Viewport></Dialog.Portal>;
}

export function ModalColumns({children}:{children:ReactNode}) { return <div className={styles.columns}>{children}</div>; }
export function ModalColumn({title,children}:{title:string;children:ReactNode}) {return <section className={styles.column}><h3>{title}</h3>{children}</section>;}
