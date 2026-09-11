import { type FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { optimisticContact } from "@spark/data";
import { contactMatches, email as buildEmail, phone as buildPhone, formatPhone, type Contact } from "@spark/core";
import { ActionModal, Button, DataTable, ErrorText, Field, Icon, Input, Label, PageHeader, TableIconAction, notify, type TableColumn } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import styles from "./contacts.module.css";

export async function clientLoader() {
  await getContactsCollection().preload();
  return null;
}

export default function Contacts() {
  const navigate = useNavigate();
  const collection = getContactsCollection();
  const { data: contacts, isLoading } = useLiveQuery({
    query: (q) => q.from({ contacts: collection }).orderBy(({ contacts: c }) => c.createdAt, "desc"),
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const filteredContacts = contacts.filter((contact) => contactMatches(contact, search));
  const columns = useMemo<TableColumn<Contact>[]>(() => [
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
      id: "score",
      label: "Pontuação",
      cell: (contact) => <span className={styles.score}>{contact.score}</span>,
      sortValue: (contact) => contact.score,
      align: "end",
    },
    {
      id: "created",
      label: "Criado em",
      cell: (contact) => formatDate(contact.createdAt),
      sortValue: (contact) => contact.createdAt,
    },
  ], []);

  function resetForm() {
    setName(""); setEmail(""); setPhone("");
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

    const transaction = collection.insert(optimisticContact({ name: trimmedName, email: validEmail, phone: validPhone }, session.orgId));
    await transaction.isPersisted.promise;
    resetForm();
    notify({ title: "Contato criado", description: `${trimmedName} já está disponível na gestão de leads.`, tone: "success" });
  }

  function submitFromForm(event: FormEvent) {
    event.preventDefault();
    void addContact().catch(() => undefined);
  }

  return <div className={styles.page}>
    <PageHeader eyebrow="Relacionamento" title="Contatos" description="Consulte e cadastre as pessoas que sua equipe acompanha." actions={<Button onClick={() => setModalOpen(true)}>Novo contato</Button>} />
    <div className={styles.toolbar}>
      <div className={styles.search}><Icon name="search" /><Input aria-label="Buscar contatos" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, e-mail ou telefone" /></div>
      <p className={styles.count} role="status">{search ? `${filteredContacts.length} de ${contacts.length}` : `${contacts.length}`} {contacts.length === 1 ? "contato" : "contatos"}</p>
    </div>
    <DataTable
      label="Contatos da organização"
      rows={filteredContacts}
      columns={columns}
      rowKey={(contact) => contact.id}
      rowLabel={(contact) => contact.name}
      state={isLoading && contacts.length === 0 ? "loading" : "ready"}
      emptyText={search ? `Nenhum contato encontrado para “${search}”.` : "Nenhum contato cadastrado."}
      actions={(contact) => <TableIconAction label={`Abrir ${contact.name}`} icon={<Icon name="right" />} onClick={() => void navigate(`/contacts/${contact.id}`)} />}
    />
    <ActionModal open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) resetForm(); }} title="Novo contato" confirmLabel="Criar contato" errorText="Não foi possível criar o contato. Corrija os campos marcados ou tente novamente." onConfirm={addContact}>
      <form className={styles.modalFields} onSubmit={submitFromForm}>
        <Field invalid={Boolean(nameError)}><Label>Nome</Label><Input autoFocus autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); setNameError(null); }} placeholder="Nome completo" /><ErrorText>{nameError}</ErrorText></Field>
        <Field invalid={Boolean(emailError)}><Label>E-mail</Label><Input type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailError(null); }} placeholder="nome@empresa.com" /><ErrorText>{emailError}</ErrorText></Field>
        <Field invalid={Boolean(phoneError)}><Label>Telefone</Label><Input type="tel" autoComplete="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setPhoneError(null); }} placeholder="(11) 99999-9999" /><ErrorText>{phoneError}</ErrorText></Field>
      </form>
    </ActionModal>
  </div>;
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toLocaleUpperCase("pt-BR");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}
