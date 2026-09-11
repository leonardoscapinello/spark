import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Sidebar, SidebarItem, SidebarSection, NavigationRail } from "../Sidebar/Sidebar.js";
import { Tabs } from "../Tabs/Tabs.js";
import { Accordion } from "../Accordion/Accordion.js";
import { Form, FieldDescription, FormActions } from "../Form/Form.js";
import { Field } from "../Field/Field.js";
import { Label } from "../Label/Label.js";
import { Input } from "../Input/Input.js";
import { PasswordInput } from "../PasswordInput/PasswordInput.js";
import { ErrorText } from "../ErrorText/ErrorText.js";
import { ExtendedCatalog } from "./ExtendedCatalog.js";
import styles from "./Catalog.module.css";

function FormExample() {
  const [saved, setSaved] = useState(false);
  return <Form onSubmit={e => { e.preventDefault(); setSaved(true); }}>
    <Field name="name"><Label>Nome</Label><Input placeholder="Nome da visualização" required /><FieldDescription>Como será apresentada na sua barra lateral.</FieldDescription><ErrorText match="valueMissing">Informe um nome.</ErrorText></Field>
    <Field name="email"><Label>E-mail</Label><Input type="email" placeholder="nome@empresa.com" required /><ErrorText match="typeMismatch">Informe um e-mail válido.</ErrorText></Field>
    <Field name="password"><Label>Senha</Label><PasswordInput autoComplete="new-password" placeholder="Digite sua senha" required /></Field>
    <FormActions><Button variant="secondary" type="reset" onClick={() => setSaved(false)}>Cancelar</Button><Button type="submit">Salvar</Button></FormActions>
    {saved && <p role="status" className={styles.note}>Formulário validado nesta demonstração.</p>}
  </Form>;
}
function Catalog() {
  const [selection, setSelection] = useState("Todos");
  return <div className={styles.page} data-theme="light">
    <NavigationRail>{(["inbox", "user", "mail", "search"] as const).map((name, index) => <Button key={name} iconOnly variant={index === 0 ? "raised" : "ghost"} shape="rounded" icon={<Icon name={name} />} aria-label={["Inbox", "Contatos", "E-mail", "Pesquisar"][index]} onClick={() => setSelection(["Todos", "Contatos", "E-mail", "Pesquisar"][index] ?? "Todos")} />)}</NavigationRail>
    <Sidebar title="Inbox" actions={<Button iconOnly variant="secondary" icon={<Icon name="plus" />} aria-label="Nova visualização" onClick={() => setSelection("Nova visualização")} />} footer={<Button variant="ghost" icon={<Icon name="menu" />} onClick={() => setSelection("Gerenciar")}>Gerenciar</Button>}>
      {(["Pesquisar", "Sua caixa de entrada", "Menções", "Criado por você", "Todos", "Não atribuído", "Spam", "Painel"]).map((label,index) => <SidebarItem key={label} href={`#${index}`} active={selection===label} onClick={e => {e.preventDefault(); setSelection(label);}} icon={<Icon name={index===0?"search":index===4?"user":"inbox"} />} count={index>0&&index<7 ? index===4||index===5 ? 4 : 0 : undefined}>{label}</SidebarItem>)}
      <SidebarSection title="Inboxes da equipe"><SidebarItem href="#support" onClick={e=>{e.preventDefault();setSelection("Atendimento");}} active={selection==="Atendimento"} icon={<Icon name="inbox" />} count={4}>Atendimento</SidebarItem></SidebarSection>
      <SidebarSection title="Visualizações"><SidebarItem href="#email" onClick={e=>{e.preventDefault();setSelection("E-mail");}} active={selection==="E-mail"} icon={<Icon name="mail" />} count={1}>E-mail</SidebarItem></SidebarSection>
    </Sidebar>
    <main className={styles.main}>
      <header className={styles.header}><div><h1>Componentes</h1><p>Biblioteca compartilhada · referência Intercom</p></div><Button variant="secondary" icon={<Icon name="plus" />} onClick={() => setSelection("Nova visualização")}>Criar novo</Button></header>
      <div className={styles.selection} role="status">{selection}</div>
      <div className={styles.grid}>
        <ExtendedCatalog />
        <section className={styles.card}><h2>Botões</h2><div className={styles.rows}>
          <div className={styles.row}><Button>Salvar</Button><Button variant="secondary">Cancelar</Button><Button variant="ghost">Ver tudo</Button><Button variant="raised">Adicionar</Button></div>
          <div className={styles.row}><Button size="sm">Pequeno</Button><Button>Médio</Button><Button size="lg">Grande</Button><Button shape="rounded">Retangular</Button></div>
          <div className={styles.row}><Button icon={<Icon name="plus" />}>Criar novo</Button><Button variant="secondary" trailingIcon={<Icon name="chevron" />}>Última atividade</Button><Button iconOnly variant="raised" icon={<Icon name="plus" />} aria-label="Adicionar" /></div>
          <div className={styles.row}><Button disabled>Salvar</Button><Button loading>Salvando</Button></div>
        </div></section>
        <section className={styles.card}><h2>Formulário</h2><FormExample /></section>
        <section className={styles.surface}><Tabs label="Detalhes do contato" items={[{value:"details",label:"Detalhes",content:<Accordion defaultValue={["attributes"]} items={[{value:"attributes",title:"Atributos de conversa",icon:<Icon name="inbox" />,content:<dl className={styles.attributes}><dt>Titular</dt><dd>Não atribuído</dd><dt>Inbox de equipe</dt><dd>Atendimento</dd></dl>},{value:"user",title:"Dados do usuário",icon:<Icon name="user" />,content:<p>Nome, e-mail e identidades do contato.</p>},{value:"notes",title:"Notas do usuário",content:<p>As notas internas ficam nesta seção.</p>}]} />},{value:"copilot",label:"Copiloto",content:<p>O conteúdo muda sem sair do painel.</p>}]} /></section>
        <section className={styles.card}><h2>Estados dos campos</h2><div className={styles.rows}><Field invalid><Label>E-mail</Label><Input defaultValue="nome@" /><ErrorText>Informe um e-mail válido.</ErrorText></Field><Field disabled><Label>Desabilitado</Label><Input defaultValue="Não editável" /></Field><Field><Label>Somente leitura</Label><Input readOnly defaultValue="Atendimento" /></Field></div></section>
      </div>
    </main>
  </div>;
}
const meta: Meta<typeof Catalog> = { title: "Fundamentos/Catálogo Intercom", component: Catalog, parameters: { layout: "fullscreen" } };
export default meta;
type Story = StoryObj<typeof Catalog>;
export const Componentes: Story = {};
