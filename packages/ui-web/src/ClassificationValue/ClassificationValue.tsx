import type { CSSProperties } from "react";
import { crmColor } from "../CrmWorkspace/CrmWorkspace.js";
import { Field } from "../Field/Field.js";
import { Label } from "../Label/Label.js";
import { Input } from "../Input/Input.js";
import { Icon, type IconName } from "../Icon/Icon.js";
import styles from "./ClassificationValue.module.css";

export type ClassificationKind = "impact" | "urgency" | "priority";
const icons: Record<ClassificationKind, IconName> = { impact: "target", urgency: "bolt", priority: "flag" };
export interface ClassificationValueProps {
  kind: ClassificationKind;
  label: string;
  color?: string | null | undefined;
  fieldLabel?: string;
}
/** Texto + ícone semântico. fieldLabel transforma o valor calculado em campo de leitura. */
export function ClassificationValue({ kind, label, color, fieldLabel }: ClassificationValueProps) {
  const icon = <span className={styles.icon} style={{ "--classification-color": crmColor(color) } as CSSProperties}><Icon name={icons[kind]} /></span>;
  if (fieldLabel) return <Field><Label>{fieldLabel}</Label><Input readOnly value={label} startAdornment={icon} /></Field>;
  return <span className={styles.value}>{icon}<span>{label}</span></span>;
}
