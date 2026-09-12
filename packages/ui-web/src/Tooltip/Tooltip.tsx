import { lightTheme } from "@spark/tokens/native-theme";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Glass } from "../Glass/Glass.js";
import s from "../shared/surfaces.module.css";
import styles from "./Tooltip.module.css";
export const TooltipProvider = BaseTooltip.Provider;
export function Tooltip({ children, content, pinOnClick = true, size = "default" }: { children: ReactElement; content: ReactNode; pinOnClick?: boolean; size?: "default" | "compact" }) {
  const [open,setOpen]=useState(false);
  const pinned=useRef(false);
  const triggerId=useId();
  const tooltipId=useId();
  function dismiss(){if(!pinned.current)setOpen(false);}
  return <BaseTooltip.Root open={open} triggerId={triggerId} onOpenChange={(next,details)=>{if(!next && pinned.current && (details.reason==="trigger-hover" || details.reason==="trigger-focus"))return;if(!next)pinned.current=false;setOpen(next);}}><BaseTooltip.Trigger id={triggerId} aria-describedby={open?tooltipId:undefined} delay={0} closeOnClick={false} onMouseEnter={()=>setOpen(true)} onMouseLeave={dismiss} onFocus={()=>setOpen(true)} onBlur={dismiss} onClick={()=>{if(!pinOnClick){pinned.current=false;setOpen(false);return;}pinned.current=!pinned.current;setOpen(pinned.current);}} render={children} /><BaseTooltip.Portal><BaseTooltip.Positioner sideOffset={Number.parseFloat(lightTheme["space-2"])} className={s.positioner}><BaseTooltip.Popup id={tooltipId} role="tooltip" render={<Glass tier="help" />} className={`${s.popup} ${styles.root} ${size === "compact" ? styles.compact : ""}`}>{content}</BaseTooltip.Popup></BaseTooltip.Positioner></BaseTooltip.Portal></BaseTooltip.Root>;
}
