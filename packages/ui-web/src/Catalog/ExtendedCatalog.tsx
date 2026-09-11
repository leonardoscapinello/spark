import { useState } from "react";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { DropdownButton, MenuButton, MenuItem, MenuSeparator, MenuGroup, MenuSubmenu, MenuCheckboxItem, SplitButton } from "../Menu/Menu.js";
import { Select } from "../Select/Select.js";
import { SearchSelect } from "../SearchSelect/SearchSelect.js";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "../Popover/Popover.js";
import { Modal, ModalTrigger, ModalContent, ModalClose } from "../Modal/Modal.js";
import { Tooltip, TooltipProvider } from "../Tooltip/Tooltip.js";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { Switch } from "../Switch/Switch.js";
import { RadioGroup } from "../RadioGroup/RadioGroup.js";
import { Textarea } from "../Textarea/Textarea.js";
import { Badge, Tag, Alert, Skeleton } from "../Feedback/Feedback.js";
import { Form, FormActions } from "../Form/Form.js";
import { Field } from "../Field/Field.js";
import { Label } from "../Label/Label.js";
import { Input } from "../Input/Input.js";
import { ErrorText } from "../ErrorText/ErrorText.js";
import styles from "./Catalog.module.css";
const people = [{value:"maria",label:"Maria Oliveira",description:"Atendimento · Disponível",avatar:"https://i.pravatar.cc/80?img=47"},{value:"joao",label:"João Silva",description:"Vendas · Disponível",avatar:"https://i.pravatar.cc/80?img=12"},{value:"ana",label:"Ana Costa",description:"Sucesso do cliente",avatar:null}];
const teams = [{value:"support",label:"Atendimento"},{value:"sales",label:"Vendas"},{value:"success",label:"Sucesso do cliente"},{value:"archived",label:"Equipe arquivada",disabled:true}];
export function ExtendedCatalog() {
  const [lastAction,setLastAction] = useState("Escolha uma ação para experimentar.");
  const [timestamps,setTimestamps] = useState(false);
  const [team,setTeam] = useState<string|null>("support");
  const [modalOpen,setModalOpen] = useState(false);
  const [tagVisible,setTagVisible] = useState(true);
  return <>
    <section className={styles.card}><h2>Dropdowns e botões com menu</h2><div className={styles.rows}><div className={styles.row}>
      <DropdownButton trigger={<Button variant="secondary" trailingIcon={<Icon name="chevron" />}>Mais opções</Button>}>
        <MenuGroup label="Conversa"><MenuItem icon={<Icon name="user" />} onClick={()=>setLastAction("Gerenciar participantes")}>Gerenciar participantes</MenuItem><MenuItem shortcut="⇧ M" onClick={()=>setLastAction("Mesclar conversa")}>Mesclar com...</MenuItem><MenuSubmenu label="Exportar"><MenuItem onClick={()=>setLastAction("Exportação em texto selecionada")}>Como texto</MenuItem><MenuItem onClick={()=>setLastAction("Exportação em PDF selecionada")}>Como PDF</MenuItem></MenuSubmenu></MenuGroup>
        <MenuSeparator /><MenuCheckboxItem checked={timestamps} onCheckedChange={setTimestamps}>Exibir carimbos de data e hora</MenuCheckboxItem><MenuSeparator /><MenuItem disabled>Recurso indisponível</MenuItem><MenuItem danger onClick={()=>setLastAction("Arquivar selecionado")}>Arquivar</MenuItem>
      </DropdownButton>
      <SplitButton onClick={()=>setLastAction("Enviar selecionado")} menuLabel="Opções de envio" menu={<><MenuItem onClick={()=>setLastAction("Enviar e fechar selecionado")}>Enviar e fechar</MenuItem><MenuItem onClick={()=>setLastAction("Agendar envio selecionado")}>Agendar envio</MenuItem></>}>Enviar</SplitButton>
    </div><div className={styles.row}>
      <MenuButton variant="ghost" indicator={false} menu={<><MenuItem onClick={()=>setLastAction("Detalhes selecionado")}>Detalhes</MenuItem><MenuSeparator /><MenuItem onClick={()=>setLastAction("Histórico selecionado")}>Histórico</MenuItem></>}>Só texto</MenuButton>
      <MenuButton variant="secondary" icon={<Icon name="user" />} menu={<><MenuItem icon={<Icon name="user" />} onClick={()=>setLastAction("Atribuir selecionado")}>Atribuir</MenuItem><MenuSeparator /><MenuItem icon={<Icon name="inbox" />} onClick={()=>setLastAction("Mover selecionado")}>Mover para inbox</MenuItem></>}>Texto com ícone</MenuButton>
      <SplitButton shape="rounded" variant="secondary" menuLabel="Opções de salvar" onClick={()=>setLastAction("Salvar selecionado")} menu={<MenuItem onClick={()=>setLastAction("Salvar como selecionado")}>Salvar como...</MenuItem>}>Salvar</SplitButton>
    </div><p role="status" className={styles.note}>{lastAction}</p></div></section>
    <section className={styles.card}><h2>Seletores com busca e foto</h2><div className={styles.rows}>
      <Field><Label>Equipe responsável</Label><Select label="Equipe responsável" options={teams} value={team} onValueChange={setTeam} name="team" /></Field>
      <Field><Label>Pesquisar equipe</Label><SearchSelect label="Pesquisar equipe" options={teams} placeholder="Buscar pelo nome da equipe" /></Field>
      <Field><Label>Equipe responsável com busca no menu</Label><SearchSelect label="Equipe responsável com busca" searchPlacement="dropdown" options={teams} placeholder="Selecionar equipe"/></Field>
      <Field><Label>Colaborador com foto e busca</Label><SearchSelect label="Colaborador com foto e busca" searchPlacement="dropdown" options={people} placeholder="Selecionar colaborador"/></Field>
      <Field><Label>Dropdown com foto</Label><Select label="Dropdown com foto" options={people} defaultValue="maria"/></Field>
      <Field><Label>Canais</Label><Select multiple label="Canais" defaultValue={["email"]} options={[{value:"email",label:"E-mail"},{value:"instagram",label:"Instagram"},{value:"whatsapp",label:"WhatsApp"}]} /></Field>
      <Field><Label>Seletor indisponível</Label><Select disabled label="Seletor indisponível" options={teams} defaultValue="archived" /></Field>
    </div></section>
    <section className={styles.card}><h2>Popovers e dicas</h2><div className={styles.row}><Popover><PopoverTrigger render={<Button variant="secondary" icon={<Icon name="plus" />}>Adicionar filtro</Button>} /><PopoverContent title="Filtrar conversas"><div className={styles.rows}><Select label="Status da conversa" options={[{value:"open",label:"Aberto"},{value:"closed",label:"Fechado"}]} defaultValue="open" /><Checkbox>Somente minhas conversas</Checkbox><PopoverClose render={<Button>Aplicar</Button>} /></div></PopoverContent></Popover><TooltipProvider><Tooltip content="Atribuir conversa a uma equipe"><Button variant="secondary" iconOnly aria-label="Sobre atribuição" icon={<Icon name="user" />} /></Tooltip></TooltipProvider></div></section>
    <section className={styles.card}><h2>Modal de formulário</h2><div className={styles.row}>
      <Modal open={modalOpen} onOpenChange={setModalOpen}><ModalTrigger render={<Button variant="secondary">Criar visualização</Button>} /><ModalContent title="Criar visualização" description="Personalize os critérios das conversas que deseja acompanhar."><Form onSubmit={e=>{e.preventDefault();setLastAction("Visualização validada no catálogo");setModalOpen(false);}}><Field name="viewName"><Label>Nome da visualização</Label><Input required placeholder="Ex.: Conversas prioritárias" /><ErrorText match="valueMissing">Informe um nome.</ErrorText></Field><Select label="Canal da visualização" options={[{value:"all",label:"Todos os canais"},{value:"email",label:"E-mail"}]} defaultValue="all" /><FormActions><ModalClose render={<Button variant="secondary">Cancelar</Button>} /><Button type="submit">Salvar visualização</Button></FormActions></Form></ModalContent></Modal>
    </div></section>
    <section className={styles.card}><h2>Escolhas e preferências</h2><div className={styles.rows}><Checkbox defaultChecked>Selecionar conversa</Checkbox><Checkbox indeterminate>Algumas conversas selecionadas</Checkbox><Checkbox disabled>Opção indisponível</Checkbox><Switch defaultChecked>Atribuição automática</Switch><Switch disabled>Configuração bloqueada</Switch><RadioGroup label="Quem pode visualizar" defaultValue="team" options={[{value:"me",label:"Somente eu"},{value:"team",label:"Minha equipe"},{value:"everyone",label:"Todos os membros"}]} /></div></section>
    <section className={styles.card}><h2>Campos adicionais</h2><div className={styles.rows}><Field><Label>Descrição</Label><Textarea placeholder="Descreva sua visualização" /></Field><Field><Label>Pesquisar</Label><Input type="search" placeholder="Pesquisar contatos" /></Field><Field><Label>Quantidade</Label><Input type="number" min={0} defaultValue={1} /></Field><Field><Label>Data</Label><Input type="date" /></Field></div></section>
    <section className={styles.card}><h2>Status, etiquetas e carregamento</h2><div className={styles.rows}><div className={styles.row}><Badge>Aberto</Badge><Badge tone="success">Conectado</Badge><Badge tone="warning">Pendente</Badge><Badge tone="danger">Falha</Badge></div><div className={styles.row}>{tagVisible && <Tag onRemove={()=>setTagVisible(false)} removeLabel="Remover etiqueta Prioridade">Prioridade</Tag>}{!tagVisible && <Button size="sm" variant="ghost" onClick={()=>setTagVisible(true)}>Adicionar etiqueta</Button>}</div><Alert title="Alterações salvas">Suas preferências foram atualizadas.</Alert><Alert tone="danger" title="Não foi possível conectar">Revise os dados da conexão e tente novamente.</Alert><div role="status" aria-label="Carregando conteúdo"><Skeleton /></div></div></section>
  </>;
}
