import type { ReactNode } from "react";
import s from "./RecordWorkspace.module.css";
export function RecordWorkspace({ context, actions, children }: { context: ReactNode; actions: ReactNode; children: ReactNode }) {
  return <div className={s.root}>
    <aside className={s.context} aria-label="Dados do negócio">{context}</aside>
    <section className={s.work} aria-label="Área de atendimento">
      <div className={s.actions} aria-label="Ações do negócio">{actions}</div>
      <div className={s.content}>{children}</div>
    </section>
  </div>;
}
