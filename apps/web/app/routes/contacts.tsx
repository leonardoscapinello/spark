import { type FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { optimisticContact } from "@spark/data";
import { companyId as companyIdFactory, contactMatches, email as buildEmail, phone as buildPhone, formatPhone, userId as userIdFactory, type Contact, type LeadStatus } from "@spark/core";
import { ActionModal, Button, DataTable, ErrorText, Field, Icon, Input, Label, MenuButton, MenuItem, PageHeader, Select, TableIconAction, notify, type TableColumn } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getUsersCollection } from "../lib/users-collection.client";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { requireCapability } from "../lib/route-access.client";
import { LEAD_SOURCE_OPTIONS, LEAD_STATUS_OPTIONS, leadStatusLabel } from "../lib/lead-options";
import styles from "./contacts.module.css";

export async function clientLoader() {
  const session = await requireCapability("contacts:read");
  await Promise.all([
    getContactsCollection().preload(),
    getUsersCollection().preload(),
    ...(session.capabilities.includes("companies:read") ? [getCompaniesCollection().preload()] : []),
  ]);
  return null;
}

export default function Contacts() {
  const navigate = useNavigate();
  const collection = getContactsCollection();
  const usersCollection = getUsersCollection();
  const { data: contacts, isLoading } = useLiveQuery({
    query: (q) => q.from({ contacts: collection }).orderBy(({ contacts: c }) => c.createdAt, "desc"),
  });
  const { data: users } = useLiveQuery({ query: (q) => q.from({ users: usersCollection }) });
  const canReadCompanies = getSession()?.capabilities.includes("companies:read") ?? false;
  const canWrite = getSession()?.capabilities.includes("contacts:write") ?? false;
  const { data: companies = [] } = useLiveQuery({ query: (q) => canReadCompanies ? q.from({ companies: getCompaniesCollection() }).orderBy(({ companies: item }) => item.name, "asc") : undefined });
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [leadStatus, setLeadStatus] = useState<LeadStatus>("new");
  const [source, setSource] = useState("manual");
  const [ownerId, setOwnerId] = useState(() => getSession()?.userId ?? "");
  const [companyId, setCompanyId] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [archiveView, setArchiveView] = useState(false);
  const filteredContacts = contacts.filter((contact) =>
    (archiveView ? contact.deletedAt !== null : contact.deletedAt === null) &&
    contactMatches(contact, search) &&
    (statusFilter === "all" || contact.leadStatus === statusFilter) &&
    (ownerFilter === "all" || (ownerFilter === "unassigned" ? contact.ownerId === null : contact.ownerId === ownerFilter)),
  );
  const columns = useMemo<TableColumn<Contact>[]>(() => {
    const userNames = new Map(users.map((user) => [user.id, user.name]));
    const companyNames = new Map(companies.map((company) => [company.id, company.name]));
    return [
    {
      id: "company",
      label: "Empresa",
      cell: (contact) => contact.companyId ? companyNames.get(contact.companyId) ?? "Empresa indisponível" : <span className={styles.muted}>Não vinculada</span>,
      sortValue: (contact) => contact.companyId ? companyNames.get(contact.companyId) ?? "" : "",
    },
    {
      id: "name",
      label: "Contato",
      cell: (contact) => <div className={styles.contactCell}><span className={styles.avatar} aria-hidden="true">{initials(contact.name)}</span><div><strong>{contact.name}</strong><span className={styles.secondary}>{contact.email ?? "Sem e-mail"}</span></div></div>,
      sortValue: (contact) => contact.name,
    },
    {
      id: "phone",
      label: "Telefone",
      cell: (contact) => contact.phone ? formatPhone(contact.phone) : <span className={styles.muted}>Não informado</span>,
      sortValue: (contact) => contact.phone ?? "",
    },
    {
      id: "status",
      label: "Etapa",
      cell: (contact) => <span className={styles.status} data-status={contact.leadStatus}>{leadStatusLabel(contact.leadStatus)}</span>,
      sortValue: (contact) => leadStatusLabel(contact.leadStatus),
    },
    {
      id: "owner",
      label: "Responsável",
      cell: (contact) => contact.ownerId ? userNames.get(contact.ownerId) ?? "Usuário indisponível" : <span className={styles.muted}>Não atribuído</span>,
      sortValue: (contact) => contact.ownerId ? userNames.get(contact.ownerId) ?? "" : "",
    },
  ];
  }, [companies, users]);

  function resetForm() {
    setName(""); setEmail(""); setPhone("");
    setLeadStatus("new"); setSource("manual"); setOwnerId(getSession()?.userId ?? ""); setCompanyId("");
    setNameError(null); setEmailError(null); setPhoneError(null);
  }

  async function addContact() {
    const trimmedName = name.trim();
    setNameError(null); setEmailError(null); setPhoneError(null);
    if (!trimmedName) {
      setNameError("Informe o nome do contato.");
      throw new Error("MISSING_NAME");
    }
    const session = getSession();
    if (!session) throw new Error("MISSING_SESSION");
    let validEmail = null;
    try { validEmail = email.trim() ? buildEmail(email) : null; }
    catch { setEmailError("Informe um e-mail válido."); throw new Error("INVALID_EMAIL"); }
    let validPhone = null;
    try { validPhone = phone.trim() ? buildPhone(phone) : null; }
    catch { setPhoneError("Use DDD e um número com oito ou nove dígitos."); throw new Error("INVALID_PHONE"); }

    const transaction = collection.insert(optimisticContact({ name: trimmedName, email: validEmail, phone: validPhone, leadStatus, source, ownerId: ownerId ? userIdFactory.from(ownerId) : null, companyId: companyId ? companyIdFactory.from(companyId) : null }, session.orgId));
    await transaction.isPersisted.promise;
    resetForm();
    notify({ title: "Contato criado", description: `${trimmedName} já está disponível na gestão de leads.`, tone: "success" });
  }

  function submitFromForm(event: FormEvent) {
    event.preventDefault();
    void addContact().catch(() => undefined);
  }

  async function updateArchived(contact: Contact, archived: boolean, offerUndo = true) {
    try {
      const transaction = collection.update(contact.id, (draft) => { draft.deletedAt = archived ? new Date().toISOString() : null; });
      await transaction.isPersisted.promise;
      notify({
        title: archived ? "Contato arquivado" : "Contato restaurado",
        description: contact.name,
        tone: "success",
        ...(offerUndo ? { actions: <Button size="sm" variant="ghost" onClick={() => void updateArchived(contact, !archived, false)}>Desfazer</Button> } : {}),
      });
    } catch {
      notify({ title: "Não foi possível atualizar o contato", tone: "error" });
    }
  }

  return <div className={styles.page}>
    <PageHeader eyebrow="Relacionamento" title="Contatos" description="Consulte e cadastre as pessoas que sua equipe acompanha." actions={canWrite ? <><Button variant="secondary" onClick={() => void navigate("/contacts/import")}>Importar CSV</Button><Button onClick={() => setModalOpen(true)}>Novo contato</Button></> : undefined} />
    <div className={styles.toolbar}>
      <div className={styles.search}><Icon name="search" /><Input aria-label="Buscar contatos" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, e-mail ou telefone" /></div>
      <div className={styles.filters}>
        <Select label="Filtrar por etapa" value={statusFilter} options={[{ value: "all", label: "Todas as etapas" }, ...LEAD_STATUS_OPTIONS]} onValueChange={(value) => setStatusFilter(value ?? "all")} />
        <Select label="Filtrar por responsável" value={ownerFilter} options={[{ value: "all", label: "Todos os responsáveis" }, { value: "unassigned", label: "Não atribuídos" }, ...users.filter((user) => !user.deactivatedAt).map((user) => ({ value: user.id, label: user.name, avatar: user.avatarUrl }))]} onValueChange={(value) => setOwnerFilter(value ?? "all")} />
        <Button variant="secondary" onClick={() => setArchiveView((current) => !current)}>{archiveView ? "Ver ativos" : "Ver arquivados"}</Button>
      </div>
      <p className={styles.count} role="status">{filteredContacts.length} {filteredContacts.length === 1 ? "contato" : "contatos"}</p>
    </div>
    <DataTable
      label="Contatos da organização"
      rows={filteredContacts}
      columns={columns}
      rowKey={(contact) => contact.id}
      rowLabel={(contact) => contact.name}
      state={isLoading && contacts.length === 0 ? "loading" : "ready"}
      emptyText={archiveView ? "Nenhum contato arquivado." : search ? `Nenhum contato encontrado para “${search}”.` : "Nenhum contato cadastrado."}
      actions={(contact) => <><TableIconAction label={`Abrir ${contact.name}`} icon={<Icon name="right" />} onClick={() => void navigate(`/contacts/${contact.id}`)} />{canWrite && <MenuButton size="sm" variant="ghost" shape="rounded" iconOnly indicator={false} icon={<Icon name="menu" />} aria-label={`Mais ações de ${contact.name}`} menu={<MenuItem onClick={() => void updateArchived(contact, !archiveView)}>{archiveView ? "Restaurar" : "Arquivar"}</MenuItem>} />}</>}
    />
    <ActionModal open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) resetForm(); }} title="Novo contato" confirmLabel="Criar contato" errorText="Não foi possível criar o contato. Corrija os campos marcados ou tente novamente." onConfirm={addContact}>
      <form className={styles.modalFields} onSubmit={submitFromForm}>
        <Field invalid={Boolean(nameError)}><Label>Nome</Label><Input autoFocus autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); setNameError(null); }} placeholder="Nome completo" /><ErrorText>{nameError}</ErrorText></Field>
        <Field invalid={Boolean(emailError)}><Label>E-mail</Label><Input type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailError(null); }} placeholder="nome@empresa.com" /><ErrorText>{emailError}</ErrorText></Field>
        <Field invalid={Boolean(phoneError)}><Label>Telefone</Label><Input type="tel" autoComplete="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setPhoneError(null); }} placeholder="(11) 99999-9999" /><ErrorText>{phoneError}</ErrorText></Field>
        <Field><Label>Etapa</Label><Select label="Etapa do relacionamento" value={leadStatus} options={LEAD_STATUS_OPTIONS} onValueChange={(value) => { if (value) setLeadStatus(value as LeadStatus); }} /></Field>
        <Field><Label>Origem</Label><Select label="Origem do lead" value={source} options={LEAD_SOURCE_OPTIONS} onValueChange={(value) => setSource(value ?? "manual")} /></Field>
        <Field><Label>Responsável</Label><Select label="Responsável pelo lead" value={ownerId || null} placeholder="Não atribuído" options={users.filter((user) => !user.deactivatedAt).map((user) => ({ value: user.id, label: user.name, avatar: user.avatarUrl }))} onValueChange={(value) => setOwnerId(value ?? "")} /></Field>
        <Field><Label>Empresa</Label><Select label="Empresa do contato" value={companyId || null} placeholder="Não vinculada" options={companies.filter((company) => !company.deletedAt).map((company) => ({ value: company.id, label: company.name }))} onValueChange={(value) => setCompanyId(value ?? "")} /></Field>
      </form>
    </ActionModal>
  </div>;
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toLocaleUpperCase("pt-BR");
}
