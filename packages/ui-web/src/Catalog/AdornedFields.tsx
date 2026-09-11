import { Input } from "../Input/Input.js";
import { Icon } from "../Icon/Icon.js";
import { Field } from "../Field/Field.js";
import { Label } from "../Label/Label.js";
import { FieldDescription } from "../Form/Form.js";
import { Tooltip, TooltipProvider } from "../Tooltip/Tooltip.js";
import { Button } from "../Button/Button.js";
import s from "./Catalog.module.css";
export function AdornedFields(){return <section className={s.card}><h2>Campos · ícones, prefixos e sufixos</h2><div className={s.rows}>
<Field><Label>Pesquisar</Label><Input startAdornment={<Icon name="search" />} placeholder="Pesquisar contatos" /></Field>
<Field><Label>E-mail</Label><Input type="email" endAdornment={<Icon name="mail" />} placeholder="nome@empresa.com" /></Field>
<Field><Label>Contato</Label><Input startAdornment={<Icon name="user" />} endAdornment={<Icon name="search" />} placeholder="Nome do contato" /></Field>
<Field><Label>Nome de usuário</Label><Input startAdornment="@" placeholder="usuario" /><FieldDescription>Use o nome do perfil, sem o @.</FieldDescription></Field>
<Field><Label>Domínio</Label><Input startAdornment="https://" endAdornment=".com.br" placeholder="empresa" /></Field>
<Field><Label>Prazo</Label><TooltipProvider><Input inputMode="numeric" endAdornment={<><span>dias</span><Tooltip content="Prazo contado a partir da criação. A regra de contagem é definida pela aplicação."><Button type="button" size="sm" iconOnly variant="ghost" aria-label="Ajuda sobre prazo">?</Button></Tooltip></>} /></TooltipProvider><FieldDescription>A dica também pode ser aberta pelo teclado.</FieldDescription></Field>
</div></section>;}
