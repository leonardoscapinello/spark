import { useState } from "react";
import { Link, useLocation } from "react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { companyId as companyIdFactory, email as buildEmail, formatBRL, formatPhone, phone as buildPhone, toCents, userId as userIdFactory } from "@spark/core";
import { syncedAmount, writeAccepted } from "@spark/data";
import { ActionModal, Avatar, BackLink, Button, Card, Field, InlineField, Icon, Input, Label, ListRow, PageFrame, RecordPageHeader, RowList, SearchSelect, Select, Signal, Skeleton, Tabs, Text, Textarea, Timeline, UserAvatar, userSelectOption, notify, type SelectOption } from "@spark/ui-web";
import type { Route } from "./+types/company-detail";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getDealsCollection } from "../lib/deals-collections.client";
import { getUsersCollection } from "../lib/users-collection.client";
import { getSession } from "../lib/auth.client";
import { getCompanyEventsCollection } from "../lib/events-collection.client";
import { toTimelineItem } from "../lib/event-presentation";
import { requireCapability } from "../lib/route-access.client";
import { useLinkPreviewRequest } from "../lib/link-previews.client";
import styles from "./company-detail.module.css";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const session = await requireCapability("companies:read");
  void Promise.allSettled([
    getCompaniesCollection().preload(),
    getUsersCollection().preload(),
    getCompanyEventsCollection(companyIdFactory.from(params.companyId)).preload(),
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
  const location = useLocation();
  const requestedReturn = new URLSearchParams(location.search).get("returnTo");
  const returnTo = requestedReturn?.startsWith("/") ? requestedReturn : null;
  const backHref = returnTo ?? "/companies";
  const backLabel = returnTo ? "Voltar ao negócio" : "Empresas";
  const requestLinkPreview = useLinkPreviewRequest();
  const companiesCollection = getCompaniesCollection();
  const contactsCollection = getContactsCollection();
  const dealsCollection = getDealsCollection();
  const { data: company, isLoading } = useLiveQuery({ query: (q) => q.from({ companies: companiesCollection }).where(({ companies: item }) => eq(item.id, companyId)).findOne() });
  const { data: companies } = useLiveQuery({ query: (q) => q.from({ companies: companiesCollection }).orderBy(({ companies: item }) => item.name, "asc") });
  const session = getSession();
  const canReadContacts = session?.capabilities.includes("contacts:read") ?? false;
  const canReadDeals = session?.capabilities.includes("deals:read") ?? false;
  const { data: contacts = [] } = useLiveQuery({ query: (q) => canReadContacts ? q.from({ contacts: contactsCollection }).orderBy(({ contacts: item }) => item.name, "asc") : undefined });
  const { data: deals = [] } = useLiveQuery({ query: (q) => canReadDeals ? q.from({ deals: dealsCollection }).orderBy(({ deals: item }) => item.updatedAt, "desc") : undefined });
  const { data: users } = useLiveQuery({ query: (q) => q.from({ users: getUsersCollection() }).orderBy(({ users: item }) => item.name, "asc") });
  const { data: events = [] } = useLiveQuery({ query: (q) => q.from({ events: getCompanyEventsCollection(companyIdFactory.from(companyId)) }).orderBy(({ events: item }) => item.occurredAt, "desc") });
  const canWrite = session?.capabilities.includes("companies:write") ?? false;
  const canLinkContacts = canReadContacts && (session?.capabilities.includes("contacts:write") ?? false);
  const canLinkDeals = canReadDeals && (session?.capabilities.includes("deals:write") ?? false);
  const [linkContactOpen, setLinkContactOpen] = useState(false); const [selectedContact, setSelectedContact] = useState<SelectOption | null>(null);
  const [linkDealOpen, setLinkDealOpen] = useState(false); const [selectedDeal, setSelectedDeal] = useState<SelectOption | null>(null);
  const [busyLink, setBusyLink] = useState<string | null>(null);

  const linkedContacts = company ? contacts.filter((item) => item.companyId === company.id && !item.deletedAt) : [];
  const linkedDeals = company ? deals.filter((item) => item.companyId === company.id && !item.deletedAt) : [];
  const owner = company?.ownerId ? users.find((item) => item.id === company.ownerId) : undefined;
  const parent = company?.parentCompanyId ? companies.find((item) => item.id === company.parentCompanyId) : undefined;
  const openValue = linkedDeals.filter((item) => item.status === "open").reduce((sum, item) => sum + Number(formatRawAmount(item.amount)), 0);

  /**
   * Cada dado da empresa muda no lugar (InlineField). Site, e-mail e telefone
   * passam pela mesma validação do core; o erro volta para a linha.
   */
  async function saveCompany(field: "name" | "legalName" | "industry" | "taxId" | "website" | "email" | "phone" | "address" | "ownerId" | "parentCompanyId", raw: string | null) {
    if (!company) return;
    const text = (raw ?? "").trim();
    let value: string | null = text || null;
    try {
      if (field === "website" && text) value = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`).toString();
      if (field === "email" && text) value = buildEmail(text);
      if (field === "phone" && text) value = buildPhone(text);
    } catch {
      const message = field === "website" ? "Endereço do site inválido." : field === "email" ? "E-mail inválido." : "Telefone inválido — use DDD + número.";
      notify({ title: message, tone: "error" });
      throw new Error(message);
    }
    if (field === "name" && !value) throw new Error("O nome não pode ficar vazio.");
    const current = field === "ownerId" ? company.ownerId : field === "parentCompanyId" ? company.parentCompanyId : company[field];
    if ((current ?? null) === value) return;
    try {
      await writeAccepted((metadata) => companiesCollection.update(company.id, { metadata }, (draft) => {
        if (field === "name" && value) draft.name = value;
        if (field === "legalName") draft.legalName = value;
        if (field === "industry") draft.industry = value;
        if (field === "taxId") draft.taxId = value;
        if (field === "website") draft.website = value;
        if (field === "email") draft.email = value as typeof draft.email;
        if (field === "phone") draft.phone = value as typeof draft.phone;
        if (field === "address") draft.address = value;
        if (field === "ownerId") draft.ownerId = value ? userIdFactory.from(value) : null;
        if (field === "parentCompanyId") draft.parentCompanyId = value ? companyIdFactory.from(value) : null;
      }));
    } catch (cause) {
      notify({ title: "Não foi possível salvar a empresa", tone: "error" });
      throw cause;
    }
    if (field === "website" && value) requestLinkPreview(value);
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

  if (!company) return <PageFrame>{!embedded && <BackLink render={<Link to={backHref} />}>{backLabel}</BackLink>}{isLoading ? <div className={styles.loading} role="status" aria-label="Carregando empresa"><Skeleton className={styles.loadingLine} /><Skeleton className={styles.loadingLine} /><Skeleton className={styles.loadingLine} /></div> : <Text tone="secondary">Empresa não encontrada.</Text>}</PageFrame>;

  const activeUsers = users.filter((item) => !item.deactivatedAt).map(userSelectOption);
  /* Texto livre: um Input que grava ao sair do campo. */
  const textEditor = (field: "name" | "legalName" | "industry" | "taxId" | "website" | "email" | "phone", label: string, current: string | null, extra: { type?: string; placeholder?: string; numeric?: boolean } = {}) =>
    (close: (persistence?: Promise<unknown>) => void) => <Input aria-label={label} defaultValue={current ?? ""} {...(extra.type ? { type: extra.type } : {})} {...(extra.placeholder ? { placeholder: extra.placeholder } : {})} numeric={extra.numeric ?? false} onBlur={(event) => close(saveCompany(field, event.currentTarget.value))} />;

  return <PageFrame className={styles.page}>
    <RecordPageHeader back={embedded ? null : returnTo ? <Button variant="secondary" icon={<Icon name="left" />} render={<Link to={backHref} />}>Voltar ao negócio</Button> : <BackLink render={<Link to={backHref} />}>{backLabel}</BackLink>} icon="building" avatarName={company.name} eyebrow={company.industry ?? "Empresa"} title={company.name} {...(company.legalName ? { description: company.legalName } : {})} metrics={[...(canReadContacts ? [{ label: "Pessoas", value: linkedContacts.length, icon: "user" as const, numeric: true }] : []), ...(canReadDeals ? [{ label: "Negócios", value: linkedDeals.length, icon: "briefcase" as const, numeric: true }, { label: "Valor em aberto", value: formatBRL(syncedAmount(openValue)), icon: "chart" as const, numeric: true }] : [])]} />

    <div className={styles.contentGrid}>
      <div className={styles.profileColumn}>
        {/* Todo valor da empresa passa pelo InlineField: a mesma caixa
          * parada, vazia e editando. */}
        <Card title="Detalhes da empresa">
          <div className={styles.fields}>
            <InlineField block label="Nome" value={company.name} disabled={!canWrite}>{textEditor("name", "Nome", company.name)}</InlineField>
            <InlineField block label="Razão social" value={company.legalName ?? "Não informada"} empty={!company.legalName} disabled={!canWrite}>{textEditor("legalName", "Razão social", company.legalName)}</InlineField>
            <InlineField block label="Segmento" value={company.industry ?? "Não informado"} empty={!company.industry} disabled={!canWrite}>{textEditor("industry", "Segmento", company.industry)}</InlineField>
            <InlineField block label="Documento fiscal" numeric value={company.taxId ?? "Não informado"} empty={!company.taxId} disabled={!canWrite}>{textEditor("taxId", "Documento fiscal", company.taxId, { numeric: true })}</InlineField>
            <InlineField block label="Responsável" value={owner?.name ?? "Não atribuído"} empty={!owner} {...(owner ? { leading: <UserAvatar user={owner} size="small" /> } : {})} disabled={!canWrite}>{(close) => <Select label="Responsável" value={company.ownerId ?? null} placeholder="Não atribuído" options={activeUsers} onValueChange={(value) => close(saveCompany("ownerId", value))} />}</InlineField>
            <InlineField block label="Empresa controladora" value={parent?.name ?? "Nenhuma"} empty={!parent} {...(parent ? { leading: <Avatar name={parent.name} size="small" /> } : {})} disabled={!canWrite}>{(close) => <Select label="Empresa controladora" value={company.parentCompanyId ?? null} placeholder="Nenhuma" options={companies.filter((item) => item.id !== company.id && !item.deletedAt).map((item) => ({ value: item.id, label: item.name }))} onValueChange={(value) => close(saveCompany("parentCompanyId", value))} />}</InlineField>
            <InlineField block label="Telefone" numeric value={company.phone ? formatPhone(company.phone) : "Não informado"} empty={!company.phone} disabled={!canWrite}>{textEditor("phone", "Telefone", company.phone ? formatPhone(company.phone) : null, { type: "tel", placeholder: "DDD + número", numeric: true })}</InlineField>
            <InlineField block label="E-mail" value={company.email ?? "Não informado"} empty={!company.email} disabled={!canWrite}>{textEditor("email", "E-mail", company.email, { type: "email", placeholder: "contato@empresa.com.br" })}</InlineField>
            <InlineField block label="Site" value={company.website ?? "Não informado"} empty={!company.website} disabled={!canWrite} {...(company.website ? { href: company.website } : {})}>{textEditor("website", "Site", company.website, { placeholder: "empresa.com.br" })}</InlineField>
            <InlineField block label="Endereço" value={company.address ?? "Não informado"} empty={!company.address} disabled={!canWrite}>{(close) => <Textarea aria-label="Endereço" rows={3} defaultValue={company.address ?? ""} onBlur={(event) => close(saveCompany("address", event.currentTarget.value))} />}</InlineField>
          </div>
        </Card>
      </div>

      <div className={styles.work}>
        <Tabs fill={!embedded} label="Área de trabalho da empresa" items={[
        ...(canReadContacts ? [{ value: "people", label: "Pessoas", content: <Card title="Pessoas" description="Pessoas que trabalham ou se relacionam com esta empresa." actions={canLinkContacts ? <Button size="sm" variant="secondary" onClick={() => setLinkContactOpen(true)}>Vincular pessoa</Button> : undefined}>
          {linkedContacts.length ? <RowList label="Pessoas desta empresa">{linkedContacts.map((contact, index) => <ListRow key={contact.id} index={index} leading={<Avatar name={contact.name} />} title={contact.name} description={contact.email ?? "Sem e-mail"} render={<Link to={`/contacts/${contact.id}`} />} trailing={canLinkContacts ? <Button size="sm" variant="ghost" loading={busyLink === contact.id} onClick={() => void unlinkContact(contact.id)}>Desvincular</Button> : undefined} />)}</RowList> : <Text size="pequeno" tone="muted">Nenhuma pessoa vinculada.</Text>}
        </Card> }] : []),
        ...(canReadDeals ? [{ value: "deals", label: "Negócios", content: <Card title="Negócios" description="Oportunidades comerciais desta empresa." actions={canLinkDeals ? <Button size="sm" variant="secondary" onClick={() => setLinkDealOpen(true)}>Vincular negócio</Button> : undefined}>
          {linkedDeals.length ? <RowList label="Negócios desta empresa">{linkedDeals.map((deal, index) => <ListRow key={deal.id} index={index} icon="briefcase" title={deal.name} description={deal.status === "open" ? "Em aberto" : deal.status === "won" ? <Signal tone="success">Ganho</Signal> : <Signal tone="danger">Perdido</Signal>} meta={formatBRL(syncedAmount(deal.amount))} render={<Link to={`/deals/${deal.id}`} />} trailing={canLinkDeals ? <Button size="sm" variant="ghost" loading={busyLink === deal.id} onClick={() => void unlinkDeal(deal.id)}>Desvincular</Button> : undefined} />)}</RowList> : <Text size="pequeno" tone="muted">Nenhum negócio vinculado.</Text>}
        </Card> }] : []),
        { value: "history", label: "Histórico", content: <Card title="Histórico" description="Mudanças registradas nesta empresa e em seus vínculos comerciais.">
        <Timeline initialCount={10} pageSize={10} density="compact" groupByDay items={events.map((event) => toTimelineItem(event, { users, contacts, companies }))} emptyText="As próximas alterações desta empresa aparecerão aqui." />
      </Card> },
        ]} />
      </div>
    </div>

    <ActionModal open={linkContactOpen} onOpenChange={setLinkContactOpen} title="Vincular pessoa" confirmLabel="Vincular" errorText="Selecione uma pessoa." onConfirm={linkContact}>
      <Field><Label>Pessoa</Label><SearchSelect label="Buscar pessoa" searchPlacement="dropdown" placeholder="Selecionar pessoa" options={contacts.filter((item) => !item.deletedAt && item.companyId !== company.id).map((item) => ({ value: item.id, label: item.name, ...(item.email ? { description: item.email } : {}) }))} value={selectedContact} onValueChange={setSelectedContact} /></Field>
    </ActionModal>
    <ActionModal open={linkDealOpen} onOpenChange={setLinkDealOpen} title="Vincular negócio" confirmLabel="Vincular" errorText="Selecione um negócio." onConfirm={linkDeal}>
      <Field><Label>Negócio</Label><SearchSelect label="Buscar negócio" searchPlacement="dropdown" placeholder="Selecionar negócio" options={deals.filter((item) => !item.deletedAt && item.companyId !== company.id).map((item) => ({ value: item.id, label: item.name, description: formatBRL(syncedAmount(item.amount)) }))} value={selectedDeal} onValueChange={setSelectedDeal} /></Field>
    </ActionModal>
  </PageFrame>;
}

function formatRawAmount(value: unknown): number { return toCents(syncedAmount(value)); }
