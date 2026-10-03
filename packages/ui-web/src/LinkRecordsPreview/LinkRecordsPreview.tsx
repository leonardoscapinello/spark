import { Avatar } from "../Avatar/Avatar.js";
import { Icon } from "../Icon/Icon.js";
import { IconTile } from "../IconTile/IconTile.js";
import { Surface } from "../Surface/Surface.js";
import s from "./LinkRecordsPreview.module.css";

export interface LinkRecordsPreviewProps { person: string; company: string }

/**
 * Antes de vincular pessoa e empresa: o desenho do vínculo (pessoa → empresa),
 * a frase do que muda e os dois efeitos. Papel cavado, ponte tracejada e o
 * selo do elo em carvão.
 */
export function LinkRecordsPreview({ person, company }: LinkRecordsPreviewProps) {
  return <div className={s.root}>
    <Surface elevation="cavada" radius="md" className={s.diagram ?? ""} aria-hidden="true">
      <span className={s.node}><Avatar name={person} size="large" /><span className={s.name}>{person}</span></span>
      <span className={s.bridge}><span className={s.badge}><Icon name="link" /></span></span>
      <span className={s.node}><IconTile icon="building" size="md" surface="folha" /><span className={s.name}>{company}</span></span>
    </Surface>
    <p className={s.lead}><strong>{person}</strong> ainda não faz parte de <strong>{company}</strong>.</p>
    <ul className={s.effects}>
      <li><Icon name="check" /><span>Empresa entra no <strong>cadastro de {person}</strong></span></li>
      <li><Icon name="check" /><span>Empresa entra <strong>neste negócio</strong></span></li>
    </ul>
    <p className={s.note}>Os vínculos atuais continuam. Sem vincular, a empresa não entra no negócio.</p>
  </div>;
}
