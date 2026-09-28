import { lazy, Suspense, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { email, phone, companyId as companyIdFactory, type Contact, type Company } from "@spark/core";
import { optimisticContact, optimisticCompany } from "@spark/data";
import { ActionModal, Button, CrmSection, Field, Icon, Input, Label, RecordSelect, Skeleton } from "@spark/ui-web";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { getSession } from "../lib/auth.client";
const ContactProfile = lazy(() => import("../routes/contact-detail").then((m) => ({ default: m.ContactProfile })));
const CompanyProfile = lazy(() => import("../routes/company-detail").then((m) => ({ default: m.CompanyProfile })));

type Props = { contactId: string | null; companyId: string | null; onContact: (person: Contact | null) => void; onCompany: (company: Company | null) => void; disabled?: boolean };
export function RelatedRecords({ contactId, companyId, onContact, onCompany, disabled = false }: Props) {
  const session = getSession();
  const canReadPeople = session?.capabilities.includes("contacts:read") ?? false;
  const canReadCompanies = session?.capabilities.includes("companies:read") ?? false;
  const { data: people = [] } = useLiveQuery({ query: (q) => canReadPeople ? q.from({ people: getContactsCollection() }) : undefined }, [canReadPeople]);
  const { data: companies = [] } = useLiveQuery({ query: (q) => canReadCompanies ? q.from({ companies: getCompaniesCollection() }) : undefined }, [canReadCompanies]);
  const [create, setCreate] = useState<"person" | "company" | null>(null);
  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [taxId, setTaxId] = useState("");
  const person = people.find((item) => item.id === contactId);
  const company = companies.find((item) => item.id === companyId);
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
  return <>
    <CrmSection title="Pessoa" action={!disabled && session?.capabilities.includes("contacts:write") ? <Button size="sm" variant="ghost" shape="rounded" icon={<Icon name="plus" />} onClick={() => openCreate("person")}>Nova pessoa</Button> : undefined}>
      <RecordSelect label="Pessoa do negócio" disabled={disabled || !canReadPeople} value={person ? { value: person.id, label: person.name } : null} options={people.filter((p) => !p.deletedAt).map((p) => ({ value: p.id, label: p.name, description: [p.email, p.phone].filter(Boolean).join(" · ") }))} onValueChange={(v) => onContact(people.find((p) => p.id === v?.value) ?? null)} emptyOptionLabel="Desvincular pessoa" />
      {person && canReadPeople && <Suspense fallback={<Skeleton />}><ContactProfile key={person.id} contactId={person.id} embedded /></Suspense>}
    </CrmSection>
    <CrmSection title="Empresa" action={!disabled && session?.capabilities.includes("companies:write") ? <Button size="sm" variant="ghost" shape="rounded" icon={<Icon name="plus" />} onClick={() => openCreate("company")}>Nova empresa</Button> : undefined}>
      <RecordSelect label="Empresa do negócio" kind="company" disabled={disabled || !canReadCompanies} value={company ? { value: company.id, label: company.name } : null} options={companies.filter((c) => !c.deletedAt).map((c) => ({ value: c.id, label: c.name, description: c.taxId ?? c.website ?? "" }))} onValueChange={(v) => onCompany(companies.find((c) => c.id === v?.value) ?? null)} emptyOptionLabel="Desvincular empresa" />
      {company && canReadCompanies && <Suspense fallback={<Skeleton />}><CompanyProfile key={company.id} companyId={company.id} embedded /></Suspense>}
    </CrmSection>
    {create && <ActionModal open onOpenChange={(open) => { if (!open) setCreate(null); }} title={create === "person" ? "Criar pessoa" : "Criar empresa"} placement="right" confirmLabel="Salvar e vincular" onConfirm={save}>
      <CrmSection title={create === "person" ? "Dados da pessoa" : "Dados da empresa"} description="Ao salvar, você volta ao negócio com este registro selecionado.">
        <Field><Label>Nome</Label><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field><Label>E-mail</Label><Input type="email" value={mail} onChange={(e) => setMail(e.target.value)} /></Field>
        <Field><Label>Telefone</Label><Input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} /></Field>
        {create === "company" && <Field><Label>CNPJ</Label><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} /></Field>}
      </CrmSection>
    </ActionModal>}

  </>;
}
