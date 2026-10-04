import type { ReactNode } from "react";
import { SectionTitle } from "../SectionTitle/SectionTitle.js";
import { Chip } from "../Chip/Chip.js";
import { Surface } from "../Surface/Surface.js";
import s from "./RecordSection.module.css";

/** Seção plana dentro da ficha. A própria área de trabalho já é a superfície. */
export function RecordSection({ title, count, actions, children, framed = false }: { title: string; count?: number; actions?: ReactNode; children: ReactNode; framed?: boolean }) {
  const content = <>
    <SectionTitle level="card" actions={actions}><span className={s.title}>{title}{count !== undefined && <Chip>{count}</Chip>}</span></SectionTitle>
    {children}
  </>;
  return framed ? <Surface as="section" className={s.root} data-framed aria-label={title}>{content}</Surface> : <section className={s.root} aria-label={title}>{content}</section>;
}
