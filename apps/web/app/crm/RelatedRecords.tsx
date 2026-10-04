import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { email, formatPhone, phone, companyId as companyIdFactory, type Contact, type Company } from "@spark/core";
import { optimisticContact, optimisticCompany } from "@spark/data";
import { ActionModal, Button, CrmSection, EmptyState, Field, Icon, InlineField, Input, Label, PersonIdentity, RecordSelect, RecordSection } from "@spark/ui-web";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { getSession } from "../lib/auth.client";
import styles from "./RelatedRecords.module.css";

type Props = { contactId: string | null; companyId: string | null; onContact: (person: Contact | null) => void; onCompany: (company: Company | null) => void; disabled?: boolean; compact?: boolean };
export function RelatedRecords({ contactId, companyId, onContact, onCompany, disabled = false, compact = false }: Props) {
  const session = getSession();
  const location = useLocation();
  const navigate = useNavigate();
  const canReadPeople = session?.capabilities.includes("contacts:read") ?? false;
  const canReadCompanies = session?.capabilities.includes("companies:read") ?? false;
  const { data: people = [] } = useLiveQuery({ query: (q) => canReadPeople ? q.from({ people: getContactsCollection() }) : undefined }, [canReadPeople]);
  const { data: companies = [] } = useLiveQuery({ query: (q) => canReadCompanies ? q.from({ companies: getCompaniesCollection() }) : undefined }, [canReadCompanies]);
  const [create, setCreate] = useState<"person" | "company" | null>(null);
  const [selection, setSelection] = useState<"person" | "company" | null>(null);
  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [taxId, setTaxId] = useState("");
  const person = people.find((item) => item.id === contactId);
  const company = companies.find((item) => item.id === companyId);
  const returnTo = `${location.pathname}${location.search}`;
  const openRecord = (kind: "person" | "company", id: string) => navigate(`/${kind === "person" ? "contacts" : "companies"}/${id}?returnTo=${encodeURIComponent(returnTo)}`);
  function openCreate(kind: "person" | "company") { setName(""); setMail(""); setTelephone(""); setTaxId(""); setCreate(kind); }
  async function save() {
    if (!session || !name.trim()) throw new Error("Informe o nome para continuar.");
    const fields = { name: name.trim(), email: mail.trim() ? email(mail) : null, phone: telephone.trim() ? phone(telephone) : null };
    if (create === "person") {
      const record = optimisticContact({ ...fields, companyId: companyId ? companyIdFactory.from(companyId) : null }, session.orgId);
      await getContactsCollection().insert(record).isPersisted.promise;
      onContact(record);
    } else {
      const record = optimisticCompany({ ...fields, taxId: taxId.trim() || null }, session.orgId);
      await getCompaniesCollection().insert(record).isPersisted.promise;
      onCompany(record);
    }
  }
  /* Pessoa e empresa do negócio: cada uma numa folha, com a identidade, os
   * dados em linhas «rótulo · valor» (InlineField só de leitura) e as ações. */
  return <div className={styles.root}>
    <RecordSection framed={!compact} title="Pessoa" actions={!disabled && session?.capabilities.includes("contacts:write") ? <Button size="sm" variant="ghost" icon={<Icon name="plus" />} onClick={() => openCreate("person")}>Nova pessoa</Button> : undefined}>
      {person && canReadPeople ? <>
        <PersonIdentity name={person.name} detail="Pessoa" />
        <div className={styles.fields}>
          <InlineField label="E-mail" value={person.email ?? "Não informado"} empty={!person.email} />
          <InlineField label="Telefone" numeric value={person.phone ? formatPhone(person.phone) : "Não informado"} empty={!person.phone} />
          <InlineField label="Score" numeric value={String(person.score)} />
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" trailingIcon={<Icon name="right" />} onClick={() => openRecord("person", person.id)}>Abrir ficha da pessoa</Button>
          {!disabled && <Button variant="secondary" size="sm" onClick={() => setSelection("person")}>Trocar pessoa</Button>}
        </div>
      </> : <EmptyState variant="onboarding" icon="user" title="Nenhuma pessoa vinculada" description="Escolha quem está negociando." action={!disabled ? <Button variant="secondary" size="sm" onClick={() => setSelection("person")}>Selecionar pessoa</Button> : undefined} />}
    </RecordSection>
    <RecordSection framed={!compact} title="Empresa" actions={!disabled && session?.capabilities.includes("companies:write") ? <Button size="sm" variant="ghost" icon={<Icon name="plus" />} onClick={() => openCreate("company")}>Nova empresa</Button> : undefined}>
      {company && canReadCompanies ? <>
        <PersonIdentity name={company.name} detail="Empresa" />
        <div className={styles.fields}>
          <InlineField label="Documento" numeric value={company.taxId ?? "Não informado"} empty={!company.taxId} />
          <InlineField label="E-mail" value={company.email ?? "Não informado"} empty={!company.email} />
          <InlineField label="Site" value={company.website ?? "Não informado"} empty={!company.website} />
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" trailingIcon={<Icon name="right" />} onClick={() => openRecord("company", company.id)}>Abrir ficha da empresa</Button>
          {!disabled && <Button variant="secondary" size="sm" onClick={() => setSelection("company")}>Trocar empresa</Button>}
        </div>
      </> : <EmptyState variant="onboarding" icon="building" title="Nenhuma empresa vinculada" description="Vincule a organização da pessoa." action={!disabled ? <Button variant="secondary" size="sm" onClick={() => setSelection("company")}>Selecionar empresa</Button> : undefined} />}
    </RecordSection>
    <ActionModal open={selection !== null} onOpenChange={(open) => { if (!open) setSelection(null); }} title={selection === "person" ? "Trocar pessoa" : "Trocar empresa"} confirmLabel="Fechar" onConfirm={() => undefined}>
      {selection === "person" && <RecordSelect label="Pessoa do negócio" disabled={!canReadPeople} value={person ? { value: person.id, label: person.name } : null} options={people.filter((p) => !p.deletedAt).map((p) => ({ value: p.id, label: p.name, description: [p.email, p.phone].filter(Boolean).join(" · ") }))} onValueChange={(v) => { onContact(people.find((p) => p.id === v?.value) ?? null); setSelection(null); }} emptyOptionLabel="Desvincular pessoa" />}
      {selection === "company" && <RecordSelect label="Empresa do negócio" kind="company" disabled={!canReadCompanies} value={company ? { value: company.id, label: company.name } : null} options={companies.filter((c) => !c.deletedAt).map((c) => ({ value: c.id, label: c.name, description: c.taxId ?? c.website ?? "" }))} onValueChange={(v) => { onCompany(companies.find((c) => c.id === v?.value) ?? null); setSelection(null); }} emptyOptionLabel="Desvincular empresa" />}
    </ActionModal>
    {create && <ActionModal open onOpenChange={(open) => { if (!open) setCreate(null); }} title={create === "person" ? "Criar pessoa" : "Criar empresa"} placement="right" confirmLabel="Salvar e vincular" onConfirm={save}>
      <CrmSection title={create === "person" ? "Dados da pessoa" : "Dados da empresa"} description="Ao salvar, você volta ao negócio com este registro selecionado.">
        <Field><Label>Nome</Label><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field><Label>E-mail</Label><Input type="email" value={mail} onChange={(e) => setMail(e.target.value)} /></Field>
        <Field><Label>Telefone</Label><Input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} /></Field>
        {create === "company" && <Field><Label>CNPJ</Label><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} /></Field>}
      </CrmSection>
    </ActionModal>}

  </div>;
}
