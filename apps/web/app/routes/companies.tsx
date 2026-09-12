import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { companyId as companyIdFactory, email as buildEmail, phone as buildPhone, userId as userIdFactory, type Company } from "@spark/core";
import { optimisticCompany } from "@spark/data";
import { ActionModal, Button, CollectionToolbar, DataTable, EmptyState, Field, Icon, Input, Label, PageHeader, Select, TableIconAction, Textarea, notify, type TableColumn } from "@spark/ui-web";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getDealsCollection } from "../lib/deals-collections.client";
import { getUsersCollection } from "../lib/users-collection.client";
import { getSession } from "../lib/auth.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./companies.module.css";

export async function clientLoader() {
  const session = await requireCapability("companies:read");
  void Promise.allSettled([
    getCompaniesCollection().preload(),
    getUsersCollection().preload(),
    ...(session.capabilities.includes("contacts:read") ? [getContactsCollection().preload()] : []),
    ...(session.capabilities.includes("deals:read") ? [getDealsCollection().preload()] : []),
  ]);
  return null;
}

export default function Companies() {
  const navigate = useNavigate();
  const collection = getCompaniesCollection();
  const { data: companies, isLoading } = useLiveQuery({ query: (q) => q.from({ companies: collection }).orderBy(({ companies: item }) => item.name, "asc") });
  const session = getSession();
  const canReadContacts = session?.capabilities.includes("contacts:read") ?? false;
  const canReadDeals = session?.capabilities.includes("deals:read") ?? false;
  const { data: contacts = [] } = useLiveQuery({ query: (q) => canReadContacts ? q.from({ contacts: getContactsCollection() }) : undefined });
  const { data: deals = [] } = useLiveQuery({ query: (q) => canReadDeals ? q.from({ deals: getDealsCollection() }) : undefined });
  const { data: users } = useLiveQuery({ query: (q) => q.from({ users: getUsersCollection() }) });
  const canWrite = session?.capabilities.includes("companies:write") ?? false;
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState("active");
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [industry, setIndustry] = useState("");
  const [taxId, setTaxId] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [parentCompanyId, setParentCompanyId] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const contactCounts = useMemo(() => countBy(contacts.map((item) => item.companyId)), [contacts]);
  const dealCounts = useMemo(() => countBy(deals.filter((item) => !item.deletedAt).map((item) => item.companyId)), [deals]);
  const ownerNames = useMemo(() => new Map(users.map((item) => [item.id, item.name])), [users]);
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = companies.filter((company) => {
    const visibilityMatch = visibility === "all" || (visibility === "archived" ? company.deletedAt !== null : company.deletedAt === null);
    const textMatch = !normalizedSearch || [company.name, company.legalName, company.industry, company.taxId].some((value) => value?.toLocaleLowerCase("pt-BR").includes(normalizedSearch));
    return visibilityMatch && textMatch;
  });
  const firstRun = !isLoading && companies.length === 0 && !search && visibility === "active";

  const columns: TableColumn<Company>[] = [
    { id: "name", label: "Empresa", cell: (company) => <div><strong>{company.name}</strong><span className={styles.secondary}>{company.legalName ?? company.website ?? "Sem dados complementares"}</span></div>, sortValue: (company) => company.name },
    { id: "industry", label: "Segmento", cell: (company) => company.industry ?? "—", sortValue: (company) => company.industry ?? "" },
    { id: "contacts", label: "Contatos", cell: (company) => contactCounts.get(company.id) ?? 0, sortValue: (company) => contactCounts.get(company.id) ?? 0 },
    { id: "deals", label: "Negócios", cell: (company) => dealCounts.get(company.id) ?? 0, sortValue: (company) => dealCounts.get(company.id) ?? 0 },
    { id: "owner", label: "Responsável", cell: (company) => company.ownerId ? ownerNames.get(company.ownerId) ?? "Indisponível" : "Não atribuído", sortValue: (company) => company.ownerId ? ownerNames.get(company.ownerId) ?? "" : "" },
  ];

  function resetForm() {
    setName(""); setLegalName(""); setIndustry(""); setTaxId(""); setWebsite(""); setEmail(""); setPhone(""); setAddress(""); setOwnerId(""); setParentCompanyId("");
  }

  async function createCompany() {
    if (!session || !name.trim()) throw new Error("MISSING_NAME");
    const parsedWebsite = website.trim() ? normalizeUrl(website) : null;
    const parsedEmail = email.trim() ? buildEmail(email) : null;
    const parsedPhone = phone.trim() ? buildPhone(phone) : null;
    const company = optimisticCompany({
      name: name.trim(), legalName: legalName.trim() || null, industry: industry.trim() || null,
      taxId: taxId.trim() || null, website: parsedWebsite, email: parsedEmail, phone: parsedPhone,
      address: address.trim() || null, ownerId: ownerId ? userIdFactory.from(ownerId) : null,
      parentCompanyId: parentCompanyId ? companyIdFactory.from(parentCompanyId) : null,
    }, session.orgId);
    const transaction = collection.insert(company);
    await transaction.isPersisted.promise;
    notify({ title: "Empresa criada", description: company.name, tone: "success" });
    resetForm();
  }

  async function toggleArchive(company: Company) {
    setBusyId(company.id);
    try {
      const transaction = collection.update(company.id, (draft) => { draft.deletedAt = company.deletedAt ? null : new Date().toISOString(); });
      await transaction.isPersisted.promise;
      notify({ title: company.deletedAt ? "Empresa restaurada" : "Empresa arquivada", description: company.name, tone: "success" });
    } catch { notify({ title: "Não foi possível atualizar a empresa", tone: "error" }); }
    finally { setBusyId(null); }
  }

  return <div className={styles.page}>
    <PageHeader icon="building" title={visibility === "archived" ? "Empresas arquivadas" : "Empresas"} actions={canWrite && !isLoading && !firstRun ? <Button onClick={() => setModalOpen(true)}>Nova empresa</Button> : undefined} />
    {firstRun && <EmptyState variant="featured" icon="building" title="Cadastre sua primeira empresa" description="Vincule contatos e negócios à organização para acompanhar o relacionamento em um só lugar." action={canWrite ? <Button onClick={() => setModalOpen(true)}>Nova empresa</Button> : undefined} />}
    {!firstRun && <><CollectionToolbar
      search={<Input aria-label="Buscar empresas" startAdornment={<Icon name="search" />} placeholder="Buscar por nome, segmento ou documento" value={search} onChange={(event) => setSearch(event.target.value)} />}
      filters={<Select appearance="filter" label="Visibilidade das empresas" value={visibility} options={[{ value: "active", label: "Ativas" }, { value: "archived", label: "Arquivadas" }, { value: "all", label: "Todas" }]} onValueChange={(value) => setVisibility(value ?? "active")} />}
      count={isLoading ? "Carregando empresas…" : `${filtered.length} ${filtered.length === 1 ? "empresa" : "empresas"}`}
    />
    <DataTable label="Empresas" rows={filtered} columns={columns} rowKey={(company) => company.id} rowLabel={(company) => company.name} state={isLoading && !companies.length ? "loading" : "ready"} emptyText="Nenhuma empresa neste filtro." actions={(company) => <><TableIconAction label="Abrir empresa" icon={<Icon name="right" />} onClick={() => void navigate(`/companies/${company.id}`)} />{canWrite && <Button size="sm" variant="ghost" loading={busyId === company.id} onClick={() => void toggleArchive(company)}>{company.deletedAt ? "Restaurar" : "Arquivar"}</Button>}</>} /></>}
    <ActionModal open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) resetForm(); }} title="Nova empresa" confirmLabel="Criar empresa" errorText="Revise os dados da empresa." onConfirm={createCompany}>
      <div className={styles.form}>
        <Field><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome comercial" /></Field>
        <Field><Label>Razão social</Label><Input value={legalName} onChange={(event) => setLegalName(event.target.value)} placeholder="Opcional" /></Field>
        <div className={styles.formGrid}><Field><Label>Segmento</Label><Input value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="Ex.: Tecnologia" /></Field><Field><Label>CNPJ ou documento fiscal</Label><Input value={taxId} onChange={(event) => setTaxId(event.target.value)} placeholder="Opcional" /></Field></div>
        <Field><Label>Site</Label><Input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="empresa.com.br" /></Field>
        <div className={styles.formGrid}><Field><Label>E-mail</Label><Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="contato@empresa.com" /></Field><Field><Label>Telefone</Label><Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(11) 99999-9999" /></Field></div>
        <Field><Label>Endereço</Label><Textarea value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Endereço comercial" /></Field>
        <div className={styles.formGrid}><Field><Label>Responsável</Label><Select label="Responsável pela empresa" value={ownerId || null} placeholder="Não atribuído" options={users.filter((item) => !item.deactivatedAt).map((item) => ({ value: item.id, label: item.name, avatar: item.avatarUrl }))} onValueChange={(value) => setOwnerId(value ?? "")} /></Field><Field><Label>Empresa controladora</Label><Select label="Empresa controladora" value={parentCompanyId || null} placeholder="Nenhuma" options={companies.filter((item) => !item.deletedAt).map((item) => ({ value: item.id, label: item.name }))} onValueChange={(value) => setParentCompanyId(value ?? "")} /></Field></div>
      </div>
    </ActionModal>
  </div>;
}

function countBy(values: ReadonlyArray<string | null>): Map<string, number> { const result = new Map<string, number>(); for (const value of values) if (value) result.set(value, (result.get(value) ?? 0) + 1); return result; }
function normalizeUrl(value: string): string { return new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`).toString(); }
