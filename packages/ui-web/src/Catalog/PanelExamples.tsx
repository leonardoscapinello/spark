import { Panel, PanelTrigger, PanelClose, PanelContent, type PanelSide } from "../Panel/Panel.js";
import { Button } from "../Button/Button.js";
import { Field } from "../Field/Field.js";
import { Label } from "../Label/Label.js";
import { Input } from "../Input/Input.js";
import s from "./Catalog.module.css";
const sides:readonly {side:PanelSide;label:string}[]=[{side:"left",label:"esquerda"},{side:"right",label:"direita"},{side:"top",label:"superior"},{side:"bottom",label:"inferior"}];
export function PanelExamples(){return <section className={s.card}><h2>Painéis · quatro direções</h2><p className={s.note}>Entram pela borda indicada. A rolagem fica dentro do conteúdo.</p><div className={s.row}>{sides.map(({side,label})=><Panel key={side}><PanelTrigger render={<Button variant="secondary">Painel {label}</Button>} /><PanelContent side={side} title={`Painel ${label}`} description="Cabeçalho e ações fixos; conteúdo com rolagem própria." footer={<PanelClose render={<Button>Concluir</Button>} />}><div className={s.rows}>{Array.from({length:12},(_,i)=><Field key={i}><Label>Campo {i+1}</Label><Input placeholder={`Informação ${i+1}`} /></Field>)}</div></PanelContent></Panel>)}</div></section>;}
