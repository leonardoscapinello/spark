import { lightTheme } from "@spark/tokens/native-theme";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ReactElement, ReactNode } from "react";
import s from "../shared/surfaces.module.css";
import styles from "./Tooltip.module.css";
export const TooltipProvider = BaseTooltip.Provider;
export function Tooltip({ children, content }: { children: ReactElement; content: ReactNode }) {
  return <BaseTooltip.Root><BaseTooltip.Trigger render={children} /><BaseTooltip.Portal><BaseTooltip.Positioner sideOffset={Number.parseFloat(lightTheme["space-1"])} className={s.positioner}><BaseTooltip.Popup className={`${s.popup} ${styles.root}`}>{content}</BaseTooltip.Popup></BaseTooltip.Positioner></BaseTooltip.Portal></BaseTooltip.Root>;
}
