import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { companyId as companyIdFactory, email as buildEmail, formatBRL, formatPhone, phone as buildPhone, toCents, userId as userIdFactory } from "@spark/core";
import { syncedAmount, writeAccepted } from "@spark/data";
import { ActionModal, Avatar, BackLink, Badge, Button, Card, Field, Input, Label, PageFrame, RecordPageHeader, SearchSelect, Select, Skeleton, Textarea, Timeline, notify, type SelectOption } from "@spark/ui-web";
import type { Route } from "./+types/company-detail";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getDealsCollection } from "../lib/deals-collections.client";
import { getUsersCollection } from "../lib/users-collection.client";
import { getSession } from "../lib/auth.client";
import { getEventsCollection } from "../lib/events-collection.client";
import { toTimelineItem } from "../lib/event-presentation";
import { requireCapability } from "../lib/route-access.client";
import { ExternalPreviewLink, useLinkPreviewRequest } from "../lib/link-previews.client";
import styles from "./company-detail.module.css";

export async function clientLoader() {
  const session = await requireCapability("companies:read");
  void Promise.allSettled([
    getCompaniesCollection().preload(),
    getUsersCollection().preload(),
    getEventsCollection().preload(),
    ...(session.capabilities.includes("contacts:read") ? [getContactsCollection().preload()] : []),
    ...(session.capabilities.includes("deals:read") ? [getDealsCollection().preload()] : []),
  ]);
  return null;
}

export default function CompanyDetail({ params }: Route.ComponentProps) {
  return <CompanyProfile companyId={params.companyId} />;
}

/** O perfil da empresa, sem depender de ser uma rota — ver ContactProfile. */
export function CompanyProfile({ companyId, embedded = false }: { companyId: string; embedded?: boolean }) {
  const requestLinkPreview = useLinkPreviewRequest();
  const companiesCollection = getCompaniesCollection();
  const contactsCollection = getContactsCollection();
  const dealsCollection = getDealsCollection();
  const { data: company, isLoading } = useLiveQuery({ query: (q) => q.from({ companies: companiesCollection }).where(({ companies: item }) => eq(item.id, companyId)).findOne() });
  const { data: companies } = useLiveQuery({ query: (q) => q.from({ companies: companiesCollection }).orderBy(({ companies: item }) => item.name, "asc") });
  const session = getSession();
  const canReadContacts = session?.capabilities.includes("contacts:read") ?? false;
  const canReadDeals = session?.capabilities.includes("deals:read") ?? false;
  const hasRelations = canReadContacts || canReadDeals;
  const { data: contacts = [] } = useLiveQuery({ query: (q) => canReadContacts ? q.from({ contacts: contactsCollection }).orderBy(({ contacts: item }) => item.name, "asc") : undefined });
  const { data: deals = [] } = useLiveQuery({ query: (q) => canReadDeals ? q.from({ deals: dealsCollection }).orderBy(({ deals: item }) => item.updatedAt, "desc") : undefined });
  const { data: users } = useLiveQuery({ query: (q) => q.from({ users: getUsersCollection() }).orderBy(({ users: item }) => item.name, "asc") });
  const { data: events } = useLiveQuery({ query: (q) => q.from({ events: getEventsCollection() }).where(({ events: item }) => eq(item.companyId, companyId)).orderBy(({ events: item }) => item.occurredAt, "desc") });
  const canWrite = session?.capabilities.includes("companies:write") ?? false;
  const canLinkContacts = canReadContacts && (session?.capabilities.includes("contacts:write") ?? false);
  const canLinkDeals = canReadDeals && (session?.capabilities.includes("deals:write") ?? false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(""); const [legalName, setLegalName] = useState("");
  const [industry, setIndustry] = useState(""); const [taxId, setTaxId] = useState("");
  const [website, setWebsite] = useState(""); const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); const [address, setAddress] = useState("");
  const [ownerId, setOwnerId] = useState(""); const [parentCompanyId, setParentCompanyId] = useState("");
  const [linkContactOpen, setLinkContactOpen] = useState(false); const [selectedContact, setSelectedContact] = useState<SelectOption | null>(null);
  const [linkDealOpen, setLinkDealOpen] = useState(false); const [selectedDeal, setSelectedDeal] = useState<SelectOption | null>(null);
  const [busyLink, setBusyLink] = useState<string | null>(null);

  const linkedContacts = company ? contacts.filter((item) => item.companyId === company.id && !item.deletedAt) : [];
  const linkedDeals = company ? deals.filter((item) => item.companyId === company.id && !item.deletedAt) : [];
  const owner = company?.ownerId ? users.find((item) => item.id === company.ownerId) : undefined;
  const parent = company?.parentCompanyId ? companies.find((item) => item.id === company.parentCompanyId) : undefined;
  const openValue = linkedDeals.filter((item) => item.status === "open").reduce((sum, item) => sum + Number(formatRawAmount(item.amount)), 0);

  function beginEditing() {
    if (!company) return;
    setName(company.name); setLegalName(company.legalName ?? ""); setIndustry(company.industry ?? ""); setTaxId(company.taxId ?? "");
    setWebsite(company.website ?? ""); setEmail(company.email ?? ""); setPhone(company.phone ? formatPhone(company.phone) : ""); setAddress(company.address ?? "");
    setOwnerId(company.ownerId ?? ""); setParentCompanyId(company.parentCompanyId ?? ""); setEditing(true);
  }

  async function saveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company || !name.trim()) return;
    setSaving(true);
    try {
      const parsedWebsite = website.trim() ? new URL(/^https?:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`).toString() : null;
      const parsedEmail = email.trim() ? buildEmail(email) : null;
      const parsedPhone = phone.trim() ? buildPhone(phone) : null;
      await writeAccepted((metadata) => companiesCollection.update(company.id, { metadata }, (draft) => {
        draft.name = name.trim(); draft.legalName = legalName.trim() || null; draft.industry = industry.trim() || null; draft.taxId = taxId.trim() || null;
        draft.website = parsedWebsite; draft.email = parsedEmail; draft.phone = parsedPhone; draft.address = address.trim() || null;
        draft.ownerId = ownerId ? userIdFactory.from(ownerId) : null; draft.parentCompanyId = parentCompanyId ? companyIdFactory.from(parentCompanyId) : null;
      }));
      if (parsedWebsite) requestLinkPreview(parsedWebsite);
      setEditing(false); notify({ title: "Empresa atualizada", tone: "success" });
    } catch { notify({ title: "Não foi possível salvar a empresa", description: "Revise site, e-mail e telefone.", tone: "error" }); }
    finally { setSaving(false); }
  }

  async function linkContact() {
    if (!company || !selectedContact) throw new Error("MISSING_CONTACT");
    await writeAccepted((metadata) => contactsCollection.update(selectedContact.value, { metadata }, (draft) => { draft.companyId = companyIdFactory.from(company.id); }));
    setSelectedContact(null); notify({ title: "Pessoa vinculada", tone: "success" });
  }

  async function unlinkContact(id: string) {
    setBusyLink(id);
    try { await writeAccepted((metadata) => contactsCollection.update(id, { metadata }, (draft) => { draft.companyId = null; })); notify({ title: "Pessoa desvinculada", tone: "success" }); }
    catch { notify({ title: "Não foi possível desvincular", tone: "error" }); } finally { setBusyLink(null); }
  }

  async function linkDeal() {
    if (!company || !selectedDeal) throw new Error("MISSING_DEAL");
    await writeAccepted((metadata) => dealsCollection.update(selectedDeal.value, { metadata }, (draft) => { draft.companyId = companyIdFactory.from(company.id); }));
    setSelectedDeal(null); notify({ title: "Negócio vinculado", tone: "success" });
  }

  async function unlinkDeal(id: string) {
    setBusyLink(id);
    try { await writeAccepted((metadata) => dealsCollection.update(id, { metadata }, (draft) => { draft.companyId = null; })); notify({ title: "Negócio desvinculado", tone: "success" }); }
    catch { notify({ title: "Não foi possível desvincular", tone: "error" }); } finally { setBusyLink(null); }
  }

  if (!company) return <PageFrame>{!embedded && <BackLink render={<Link to="/companies" />}>Empresas</BackLink>}{isLoading ? <div className={styles.loading} role="status" aria-label="Carregando empresa"><Skeleton /><Skeleton /><Skeleton /></div> : <p>Empresa não encontrada.</p>}</PageFrame>;

  return <PageFrame>
    <RecordPageHeader back={embedded ? null : <BackLink render={<Link to="/companies" />}>Empresas</BackLink>} icon="building" eyebrow={company.industry ?? "Empresa"} title={company.name} {...(company.legalName ? { description: company.legalName } : {})} actions={canWrite && !editing ? <Button variant="secondary" onClick={beginEditing}>Editar empresa</Button> : undefined} metrics={[...(canReadContacts ? [{ label: "Pessoas", value: linkedContacts.length, icon: "user" as const }] : []), ...(canReadDeals ? [{ label: "Negócios", value: linkedDeals.length, icon: "briefcase" as const }, { label: "Valor em aberto", value: formatBRL(syncedAmount(openValue)), icon: "chart" as const }] : [])]} />

    <div className={styles.contentGrid} data-relations={hasRelations ? "visible" : "hidden"}><div className={styles.profileColumn}>{editing ? <Card title="Editar empresa"><form className={styles.editForm} onSubmit={saveCompany}>
      <Field><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></Field><Field><Label>Razão social</Label><Input value={legalName} onChange={(event) => setLegalName(event.target.value)} /></Field>
      <Field><Label>Segmento</Label><Input value={industry} onChange={(event) => setIndustry(event.target.value)} /></Field><Field><Label>Documento fiscal</Label><Input value={taxId} onChange={(event) => setTaxId(event.target.value)} /></Field>
      <Field><Label>Site</Label><Input value={website} onChange={(event) => setWebsite(event.target.value)} /></Field><Field><Label>E-mail</Label><Input value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
      <Field><Label>Telefone</Label><Input value={phone} onChange={(event) => setPhone(event.target.value)} /></Field><Field><Label>Responsável</Label><Select label="Responsável" value={ownerId || null} placeholder="Não atribuído" options={users.filter((item) => !item.deactivatedAt).map((item) => ({ value: item.id, label: item.name, avatar: item.avatarUrl }))} onValueChange={(value) => setOwnerId(value ?? "")} /></Field>
      <Field><Label>Empresa controladora</Label><Select label="Empresa controladora" value={parentCompanyId || null} placeholder="Nenhuma" options={companies.filter((item) => item.id !== company.id && !item.deletedAt).map((item) => ({ value: item.id, label: item.name }))} onValueChange={(value) => setParentCompanyId(value ?? "")} /></Field>
      <Field><Label>Endereço</Label><Textarea value={address} onChange={(event) => setAddress(event.target.value)} /></Field>
      <div className={styles.formActions}><Button type="submit" loading={saving}>Salvar</Button><Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button></div>
    </form></Card> : <Card title="Detalhes da empresa"><div className={styles.details}>
      <Info label="Responsável" value={owner?.name ?? "Não atribuído"} /><Info label="Empresa controladora" value={parent?.name ?? "Nenhuma"} />
      <Info label="Documento fiscal" value={company.taxId ?? "—"} /><Info label="Telefone" value={company.phone ? formatPhone(company.phone) : "—"} />
      <Info label="E-mail" value={company.email ?? "—"} /><Info label="Site" value={company.website ?? "—"} link={company.website} />
      <Info label="Endereço" value={company.address ?? "—"} wide />
    </div></Card>}</div>

    {hasRelations && <div className={styles.relations}>
      {canReadContacts && <div className={styles.relationCard}><Card title="Pessoas" description="Pessoas que trabalham ou se relacionam com esta empresa." actions={canLinkContacts ? <Button size="sm" onClick={() => setLinkContactOpen(true)}>Vincular pessoa</Button> : undefined}>
        {linkedContacts.length ? <ul>{linkedContacts.map((contact) => <li key={contact.id}><div className={styles.personIdentity}><Avatar name={contact.name} /><div><Link to={`/contacts/${contact.id}`}>{contact.name}</Link><span>{contact.email ?? "Sem e-mail"}</span></div></div>{canLinkContacts && <Button size="sm" variant="ghost" loading={busyLink === contact.id} onClick={() => void unlinkContact(contact.id)}>Desvincular</Button>}</li>)}</ul> : <p className={styles.empty}>Nenhuma pessoa vinculada.</p>}
      </Card></div>}
      {canReadDeals && <div className={styles.relationCard}><Card title="Negócios" description="Oportunidades comerciais desta empresa." actions={canLinkDeals ? <Button size="sm" onClick={() => setLinkDealOpen(true)}>Vincular negócio</Button> : undefined}>
        {linkedDeals.length ? <ul>{linkedDeals.map((deal) => <li key={deal.id}><div><Link to={`/deals/${deal.id}`}>{deal.name}</Link><span>{formatBRL(syncedAmount(deal.amount))}</span></div><div className={styles.dealActions}><Badge tone={deal.status === "won" ? "success" : deal.status === "lost" ? "danger" : "neutral"}>{deal.status === "open" ? "Em aberto" : deal.status === "won" ? "Ganho" : "Perdido"}</Badge>{canLinkDeals && <Button size="sm" variant="ghost" loading={busyLink === deal.id} onClick={() => void unlinkDeal(deal.id)}>Desvincular</Button>}</div></li>)}</ul> : <p className={styles.empty}>Nenhum negócio vinculado.</p>}
      </Card></div>}
    </div>}

    <div className={`${styles.relationCard} ${styles.history}`}><Card title="Histórico" description="Mudanças registradas nesta empresa e em seus vínculos comerciais.">
      <Timeline items={events.map(toTimelineItem)} emptyText="As próximas alterações desta empresa aparecerão aqui." />
    </Card></div>
    </div>

    <ActionModal open={linkContactOpen} onOpenChange={setLinkContactOpen} title="Vincular pessoa" confirmLabel="Vincular" errorText="Selecione uma pessoa." onConfirm={linkContact}>
      <Field><Label>Pessoa</Label><SearchSelect label="Buscar pessoa" searchPlacement="dropdown" placeholder="Selecionar pessoa" options={contacts.filter((item) => !item.deletedAt && item.companyId !== company.id).map((item) => ({ value: item.id, label: item.name, ...(item.email ? { description: item.email } : {}) }))} value={selectedContact} onValueChange={setSelectedContact} /></Field>
    </ActionModal>
    <ActionModal open={linkDealOpen} onOpenChange={setLinkDealOpen} title="Vincular negócio" confirmLabel="Vincular" errorText="Selecione um negócio." onConfirm={linkDeal}>
      <Field><Label>Negócio</Label><SearchSelect label="Buscar negócio" searchPlacement="dropdown" placeholder="Selecionar negócio" options={deals.filter((item) => !item.deletedAt && item.companyId !== company.id).map((item) => ({ value: item.id, label: item.name, description: formatBRL(syncedAmount(item.amount)) }))} value={selectedDeal} onValueChange={setSelectedDeal} /></Field>
    </ActionModal>
  </PageFrame>;
}

function Info({ label, value, link, wide = false }: { label: string; value: string; link?: string | null; wide?: boolean }) { return <div className={wide ? styles.wide : undefined}><span>{label}</span>{link ? <ExternalPreviewLink href={link}>{value}</ExternalPreviewLink> : <strong>{value}</strong>}</div>; }
function formatRawAmount(value: unknown): number { return toCents(syncedAmount(value)); }
