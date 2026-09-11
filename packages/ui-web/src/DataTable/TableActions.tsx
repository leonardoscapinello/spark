import type { ReactNode } from "react";
import { Button, type ButtonProps } from "../Button/Button.js";
import { Tooltip } from "../Tooltip/Tooltip.js";
import s from "./DataTable.module.css";

export function TableActions({label="Ações",children}:{label?:string;children:ReactNode}) {
 return <div role="group" aria-label={label} className={s.actionGroup}>{children}</div>;
}
export type TableIconActionProps = Omit<ButtonProps,"children"|"iconOnly"|"aria-label"> & {label:string;icon:ReactNode};
export function TableIconAction({label,...props}:TableIconActionProps) {
 return <Tooltip content={label}><Button size="sm" variant="ghost" shape="rounded" {...props} iconOnly aria-label={label}/></Tooltip>;
}
