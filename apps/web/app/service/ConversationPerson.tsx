import { Link, useNavigate } from "react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { formatPhone, type Contact, type Conversation } from "@spark/core";
import { Accordion, Avatar, Button, Icon, InlineField, ListRow, PersonIdentity, RowList, Signal, Text, UserAvatar, type AccordionItem } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { getDealsCollection, getStagesCollection } from "../lib/deals-collections.client";
import { getUsersCollection } from "../lib/users-collection.client";
import { LEAD_SOURCE_OPTIONS, leadStatusLabel } from "../lib/lead-options";
import { useCustomFieldSections } from "./RecordCustomFields";
import styles from "../routes/settings.module.css";

/**
 * Aba "Pessoa" — o contexto de quem está do outro lado: contato, relação com
 * a empresa e com o comercial, os campos da pessoa (um bloco por grupo),
 * negócios e as outras conversas. Edição completa fica na ficha do CRM.
 */
export function ConversationPerson({ person, name, conversation, conversations, inboxTitle }: { person: Contact | undefined; name: string; conversation: Conversation; conversations: readonly Conversation[]; inboxTitle: (conversation: Conversation) => string }) {
  const navigate = useNavigate();
  const capabilities = getSession()?.capabilities ?? [];
  const canReadContacts = capabilities.includes("contacts:read");
  const canReadCompanies = capabilities.includes("companies:read");
  const canReadDeals = capabilities.includes("deals:read");
  const contactId = person?.id ?? conversation.contactId;
  const companyId = person?.companyId ?? null;
  const { data: users = [] } = useLiveQuery(q => q.from({ users: getUsersCollection() }), []);
  const { data: companies = [] } = useLiveQuery(q => canReadCompanies && companyId ? q.from({ companies: getCompaniesCollection() }).where(({ companies: item }) => eq(item.id, companyId)) : undefined, [canReadCompanies, companyId]);
  const { data: deals = [] } = useLiveQuery(q => canReadDeals ? q.from({ deals: getDealsCollection() }).where(({ deals: item }) => eq(item.contactId, contactId)).orderBy(({ deals: item }) => item.updatedAt, "desc") : undefined, [canReadDeals, contactId]);
  const { data: stages = [] } = useLiveQuery(q => canReadDeals ? q.from({ stages: getStagesCollection() }) : undefined, [canReadDeals]);
  const custom = useCustomFieldSections({ entityType: "contact", entityId: contactId, disabled: true });
  const owner = users.find(user => user.id === person?.ownerId);
  const company = companies[0];
  const others = conversations.filter(item => item.id !== conversation.id);
  const source = LEAD_SOURCE_OPTIONS.find(option => option.value === person?.source)?.label ?? person?.source;

  const items: AccordionItem[] = [
    { value: "contact", title: "Dados de contato", icon: <Icon name="user" />, content: <div className={styles.inlineFields}>
      <InlineField label="E-mail" value={person?.email ?? "Não informado"} empty={!person?.email} disabled />
      <InlineField label="Telefone" numeric value={person?.phone ? formatPhone(person.phone) : "Não informado"} empty={!person?.phone} disabled />
    </div> },
    { value: "relationship", title: "Relacionamento", icon: <Icon name="building" />, content: <div className={styles.inlineFields}>
      {canReadCompanies && <InlineField label="Empresa" value={company?.name ?? "Não vinculada"} empty={!company} disabled={!company} {...(company ? { leading: <Avatar name={company.name} size="small" />, action: { label: `Abrir ${company.name}`, icon: "eye" as const, onClick: () => void navigate(`/companies/${company.id}`) } } : {})} />}
      {person && <InlineField label="Etapa" value={leadStatusLabel(person.leadStatus)} disabled />}
      <InlineField label="Origem" value={source ?? "Sem origem"} empty={!source} disabled />
      <InlineField label="Responsável" value={owner?.name ?? "Não atribuído"} empty={!owner} disabled {...(owner ? { leading: <UserAvatar user={owner} size="small" /> } : {})} />
    </div> },
    ...custom.map(section => ({ value: `contact:${section.id || "custom"}`, title: section.name, icon: <Icon name="form" />, content: <div className={styles.inlineFields}>{section.content}</div> })),
    ...(canReadDeals ? [{ value: "deals", title: `Negócios (${deals.length})`, icon: <Icon name="briefcase" />, content: deals.length === 0
      ? <Text size="pequeno" tone="muted">Nenhum negócio desta pessoa.</Text>
      : <RowList label="Negócios desta pessoa">{deals.map((deal, index) => <ListRow key={deal.id} index={index} icon="briefcase" title={deal.name} description={deal.status === "won" ? <Signal tone="success">Ganho</Signal> : deal.status === "lost" ? <Signal tone="danger">Perdido</Signal> : stages.find(stage => stage.id === deal.stageId)?.name ?? "Em aberto"} render={<Link to={`/deals/${deal.id}`} />} />)}</RowList> }] : []),
    { value: "conversations", title: `Outras conversas (${others.length})`, icon: <Icon name="message" />, content: others.length === 0
      ? <Text size="pequeno" tone="muted">Esta é a única conversa da pessoa.</Text>
      : <RowList label="Outras conversas desta pessoa">{others.map((item, index) => <ListRow key={item.id} index={index} icon="message" title={item.subject} description={`${inboxTitle(item)} · ${item.status === "open" ? "Aberta" : item.status === "snoozed" ? "Em espera" : "Encerrada"}`} render={<Link to={`/inbox?box=all&conversation=${item.id}`} />} />)}</RowList> },
  ];

  return <div className={styles.form}>
    <div className={styles.personHeader}>
      <PersonIdentity name={name} detail={person?.email ?? (person?.phone ? formatPhone(person.phone) : "Sem contato")} />
      {canReadContacts && <Button variant="ghost" size="sm" icon={<Icon name="eye" />} onClick={() => void navigate(`/contacts/${contactId}`)}>Ficha</Button>}
    </div>
    <Accordion density="compact" defaultValue={["contact", "relationship", ...custom.map(section => `contact:${section.id || "custom"}`)]} items={items} />
  </div>;
}
