import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { useTagCatalog, useTagsByEntity } from "../lib/tags.client";
import { campaignsControllerCreateAudience, campaignsControllerCreateCampaign, campaignsControllerSend } from "@spark/api-client";
import { audienceId, campaignId, matchesAudience, type Audience, type AudienceFilter, type Campaign } from "@spark/core";
import { ActionCard, ActionCardGroup, ActionModal, Badge, Button, Checkbox, CollectionToolbar, DashboardGrid, DataTable, EmptyState, Field, Icon, Input, Label, MetricCard, PageFrame, PageHeader, ProgressBar, RecordIdentity, Select, Textarea, notify, type TableColumn } from "@spark/ui-web";
import { getSession } from "../lib/auth.client"; import { requireCapability } from "../lib/route-access.client"; import { getContactsCollection } from "../lib/contacts-collection.client";
import { getAudienceLeadStatusesCollection, getAudiencesCollection, getAudienceTagsCollection, getCampaignRecipientsCollection, getCampaignsCollection } from "../lib/campaign-collections.client"; import styles from "./campaigns.module.css";

const LEAD_STATUSES = [{ value: "new", label: "Novo" }, { value: "qualified", label: "Qualificado" }, { value: "customer", label: "Cliente" }, { value: "lost", label: "Perdido" }];
export async function clientLoader() { await requireCapability("campaigns:read"); void Promise.allSettled([getAudiencesCollection().preload(), getAudienceLeadStatusesCollection().preload(), getAudienceTagsCollection().preload(), getCampaignsCollection().preload(), getCampaignRecipientsCollection().preload(), getContactsCollection().preload()]); return null; }
export default function Campaigns() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const audienceView = searchParams.get("view") === "audiences";
  const capabilities = getSession()?.capabilities ?? [];
  const canWrite = capabilities.includes("campaigns:write");
  const canImportContacts = capabilities.includes("contacts:write");
  const canConfigureEmail = capabilities.includes("integrations:manage");
  const { data: audienceRows, isLoading: audiencesLoading } = useLiveQuery({ query: (q) => q.from({ audiences: getAudiencesCollection() }).orderBy(({ audiences: item }) => item.updatedAt, "desc") });
  const { data: audienceStatusRows } = useLiveQuery({ query: (q) => q.from({ statuses: getAudienceLeadStatusesCollection() }) });
  const { data: audienceTagRows } = useLiveQuery({ query: (q) => q.from({ tags: getAudienceTagsCollection() }) });
  const { data: campaigns, isLoading } = useLiveQuery({ query: (q) => q.from({ campaigns: getCampaignsCollection() }).orderBy(({ campaigns: item }) => item.createdAt, "desc") });
  const { data: contacts } = useLiveQuery({ query: (q) => q.from({ contacts: getContactsCollection() }) });
  // As marcações vêm das tabelas, não de coluna jsonb (ADR-0035).
  const tagsByContact = useTagsByEntity("contact");
  const tagCatalog = useTagCatalog();
  const audiences = useMemo<Audience[]>(() => {
    const tagNameById = new Map(tagCatalog.map((tag) => [tag.id as string, tag.name]));
    return audienceRows.map((row) => ({
      ...row,
      filter: {
        operator: row.operator,
        minimumScore: row.minimumScore,
        leadStatuses: audienceStatusRows.filter((item) => item.audienceId === row.id).map((item) => item.leadStatus),
        tags: audienceTagRows.filter((item) => item.audienceId === row.id).flatMap((item) => { const name = tagNameById.get(item.tagId); return name ? [name] : []; }),
      },
    }));
  }, [audienceRows, audienceStatusRows, audienceTagRows, tagCatalog]);
  const [audienceOpen, setAudienceOpen] = useState(false); const [campaignOpen, setCampaignOpen] = useState(false); const [sending, setSending] = useState<string | null>(null);
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("all");
  const [audienceName, setAudienceName] = useState(""); const [description, setDescription] = useState(""); const [operator, setOperator] = useState<"all" | "any">("all"); const [statuses, setStatuses] = useState<string[]>([]); const [tags, setTags] = useState(""); const [minimumScore, setMinimumScore] = useState("");
  const [name, setName] = useState(""); const [audienceIdValue, setAudienceIdValue] = useState(""); const [subject, setSubject] = useState(""); const [body, setBody] = useState("");
  const filter: AudienceFilter = useMemo(() => ({ operator, leadStatuses: statuses, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), minimumScore: minimumScore === "" ? null : Number(minimumScore) }), [operator, statuses, tags, minimumScore]);
  const previewCount = contacts.filter((contact) => matchesAudience({ ...contact, tags: tagsByContact.get(contact.id) ?? [] }, filter)).length;
  const audienceById = useMemo(() => new Map<string, Audience>(audiences.map((item) => [item.id, item])), [audiences]);
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const filteredAudiences = audiences.filter((item) => !normalizedSearch || `${item.name} ${item.description ?? ""}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch));
  const filteredCampaigns = campaigns.filter((item) => (statusFilter === "all" || item.status === statusFilter) && (!normalizedSearch || `${item.name} ${item.subject} ${audienceById.get(item.audienceId)?.name ?? ""}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch)));
  const firstRun = audienceView ? audiences.length === 0 && !audiencesLoading && !search : campaigns.length === 0 && !isLoading && !search && statusFilter === "all";
  const sentCount = campaigns.reduce((total, item) => total + item.sentCount, 0);
  const failedCount = campaigns.reduce((total, item) => total + item.failedCount, 0);
  const draftCount = campaigns.filter((item) => item.status === "draft").length;
  const columns: TableColumn<Campaign>[] = [
    { id: "name", label: "Campanha", cell: (item) => <RecordIdentity icon="mail" title={item.name} subtitle={item.subject} />, sortValue: (item) => item.name },
    { id: "audience", label: "Público", cell: (item) => audienceById.get(item.audienceId)?.name ?? "—", sortValue: (item) => audienceById.get(item.audienceId)?.name ?? "" },
    { id: "delivery", label: "Entrega", cell: (item) => <div className={styles.delivery}><strong>{item.sentCount} de {item.recipientCount}</strong><ProgressBar label={`E-mails enviados em ${item.name}`} value={item.sentCount} max={item.recipientCount} /></div>, sortValue: (item) => item.sentCount },
    { id: "status", label: "Status", cell: (item) => <Badge tone={item.status === "sent" ? "success" : item.status === "failed" ? "danger" : item.status === "partial" ? "warning" : "neutral"}>{statusLabel(item.status)}</Badge>, sortValue: (item) => item.status },
  ];
  const audienceColumns: TableColumn<Audience>[] = [
    { id: "name", label: "Público", cell: (item) => <RecordIdentity icon="team" title={item.name} subtitle={item.description || "Sem descrição"} />, sortValue: (item) => item.name },
    { id: "contacts", label: "Pessoas agora", cell: (item) => contacts.filter((contact) => matchesAudience({ ...contact, tags: tagsByContact.get(contact.id) ?? [] }, item.filter)).length, sortValue: (item) => contacts.filter((contact) => matchesAudience({ ...contact, tags: tagsByContact.get(contact.id) ?? [] }, item.filter)).length },
    { id: "updated", label: "Atualizado", cell: (item) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(item.updatedAt)), sortValue: (item) => item.updatedAt },
  ];
  async function createAudience() { const response = await campaignsControllerCreateAudience({ id: audienceId.create(), name: audienceName.trim(), description: description.trim() || null, filter }); notify({ title: "Público criado", description: `${previewCount} ${previewCount === 1 ? "pessoa corresponde" : "pessoas correspondem"} agora.`, tone: "success" }); setAudienceIdValue(response.audience.id); setAudienceName(""); setDescription(""); }
  async function createCampaign() { await campaignsControllerCreateCampaign({ id: campaignId.create(), audienceId: audienceIdValue as never, name: name.trim(), subject: subject.trim(), body: body.trim() }); notify({ title: "Campanha criada", description: "A lista de destinatários foi congelada para auditoria.", tone: "success" }); setName(""); setSubject(""); setBody(""); }
  function openCampaign() { setAudienceIdValue(audiences[0]?.id ?? ""); setCampaignOpen(true); }
  async function send(item: Campaign) { setSending(item.id); try { const response = await campaignsControllerSend(item.id); notify({ title: response.campaign.status === "sent" ? "Campanha enviada" : "Envio concluído com ocorrências", description: `${response.campaign.sentCount} enviadas · ${response.campaign.failedCount} falhas · ${response.campaign.suppressedCount} suprimidas`, tone: response.campaign.status === "sent" ? "success" : "warning" }); } finally { setSending(null); } }
  function toggleStatus(value: string, checked: boolean) { setStatuses((current) => checked ? [...current, value] : current.filter((item) => item !== value)); }
  return <PageFrame className={styles.page}>
    <PageHeader icon={audienceView ? "team" : "mail"} title={audienceView ? "Públicos" : "Campanhas"} actions={canWrite && !firstRun && !(audienceView ? audiencesLoading : isLoading) ? audienceView ? <Button onClick={() => setAudienceOpen(true)}>Novo público</Button> : audiences.length > 0 ? <Button onClick={openCampaign}>Nova campanha</Button> : <Button onClick={() => setAudienceOpen(true)}>Criar público</Button> : undefined} />
    {firstRun && (audienceView
      ? <EmptyState variant="featured" icon="team" title="Crie seu primeiro público" description="Defina quem deve receber suas campanhas. As pessoas entram automaticamente quando correspondem aos filtros." action={canWrite ? <Button onClick={() => setAudienceOpen(true)}>Criar público</Button> : undefined} />
      : <EmptyState variant="featured" icon="mail" title={audiences.length ? "Prepare sua primeira campanha" : "Comece criando um público"} description={audiences.length ? "Escreva a mensagem e escolha quem deve recebê-la. Você poderá revisar o rascunho antes de enviar." : "Um público organiza as pessoas por regras e permite criar sua primeira campanha de e-mail."} action={canWrite ? <Button onClick={audiences.length ? openCampaign : () => setAudienceOpen(true)}>{audiences.length ? "Nova campanha" : "Criar público"}</Button> : undefined} />)}
    {!audienceView && firstRun && (canImportContacts || canConfigureEmail) && <ActionCardGroup title="Prepare seu primeiro envio">
        {canImportContacts && <ActionCard icon="upload" title="Traga sua base de pessoas" description="Importe sua base para enviar mensagens às pessoas certas." action={<Button variant="secondary" onClick={() => void navigate("/contacts/import")}>Importar pessoas</Button>} />}
        {canConfigureEmail && <ActionCard icon="mail" title="Conecte o e-mail" description="Prepare o canal que enviará as mensagens da equipe." action={<Button variant="secondary" onClick={() => void navigate("/integrations")}>Configurar e-mail</Button>} />}
    </ActionCardGroup>}
    {!audienceView && campaigns.length > 0 && <DashboardGrid metrics>
      <MetricCard title="Campanhas" value={campaigns.length} comparison="Criadas pela equipe" />
      <MetricCard title="E-mails enviados" value={sentCount} comparison="Total registrado nas campanhas" />
      <MetricCard title="Rascunhos" value={draftCount} comparison="Aguardando envio" />
      <MetricCard title="Falhas de envio" value={failedCount} comparison="Ocorrências registradas" sentiment={failedCount > 0 ? "negative" : "neutral"} />
    </DashboardGrid>}
    {!firstRun && <><CollectionToolbar
      search={<Input aria-label={audienceView ? "Buscar públicos" : "Buscar campanhas"} placeholder={audienceView ? "Buscar público" : "Buscar campanha, assunto ou público"} value={search} startAdornment={<Icon name="search" />} onChange={(event) => setSearch(event.target.value)} />}
      filters={!audienceView ? <Select appearance="filter" label="Filtrar campanhas por situação" value={statusFilter} options={[{ value: "all", label: "Todas as situações" }, { value: "draft", label: "Rascunhos" }, { value: "sending", label: "Em envio" }, { value: "sent", label: "Enviadas" }, { value: "partial", label: "Parciais" }, { value: "failed", label: "Com falha" }]} onValueChange={(value) => setStatusFilter(value ?? "all")} /> : undefined}
      count={`${audienceView ? filteredAudiences.length : filteredCampaigns.length} ${audienceView ? filteredAudiences.length === 1 ? "público" : "públicos" : filteredCampaigns.length === 1 ? "campanha" : "campanhas"}`}
    />
    {audienceView
      ? <DataTable label="Públicos" rows={filteredAudiences} columns={audienceColumns} rowKey={(item) => item.id} rowLabel={(item) => item.name} state={audiencesLoading && !audiences.length ? "loading" : "ready"} emptyText={firstRun ? "Os públicos criados aparecerão nesta tabela." : "Nenhum público encontrado."} />
      : <DataTable label="Histórico de campanhas" rows={filteredCampaigns} columns={columns} rowKey={(item) => item.id} rowLabel={(item) => item.name} state={isLoading && !campaigns.length ? "loading" : "ready"} emptyText="Nenhuma campanha neste filtro." actions={(item) => canWrite && item.status === "draft" ? <Button size="sm" loading={sending === item.id} onClick={() => void send(item)}>Enviar agora</Button> : undefined} />}</>}
    <ActionModal open={audienceOpen} onOpenChange={setAudienceOpen} title="Novo público" confirmLabel="Salvar público" errorText="Informe um nome e filtros válidos." onConfirm={createAudience}><div className={styles.form}><Field><Label>Nome</Label><Input value={audienceName} placeholder="Leads qualificados" onChange={(event) => setAudienceName(event.target.value)} /></Field><Field><Label>Descrição</Label><Input value={description} placeholder="Quem faz parte deste público" onChange={(event) => setDescription(event.target.value)} /></Field><Field><Label>Combinação dos filtros</Label><Select label="Operador dos filtros" value={operator} options={[{ value: "all", label: "Todos os filtros" }, { value: "any", label: "Qualquer filtro" }]} onValueChange={(value) => setOperator((value ?? "all") as "all" | "any")} /></Field><Field><Label>Status do lead</Label><div className={styles.checks}>{LEAD_STATUSES.map((item) => <Checkbox key={item.value} checked={statuses.includes(item.value)} onCheckedChange={(checked) => toggleStatus(item.value, checked === true)}>{item.label}</Checkbox>)}</div></Field><Field><Label>Tags</Label><Input value={tags} placeholder="vip, evento, oportunidade" onChange={(event) => setTags(event.target.value)} /></Field><Field><Label>Score mínimo</Label><Input type="number" min="0" value={minimumScore} placeholder="Sem mínimo" onChange={(event) => setMinimumScore(event.target.value)} /></Field><div className={styles.preview}><strong>{previewCount}</strong><span>{previewCount === 1 ? "pessoa com e-mail entra" : "pessoas com e-mail entram"} neste público agora</span></div></div></ActionModal>
    <ActionModal open={campaignOpen} onOpenChange={setCampaignOpen} title="Nova campanha" confirmLabel="Criar rascunho" errorText="Preencha público, nome, assunto e mensagem." onConfirm={createCampaign}><div className={styles.form}><Field><Label>Público</Label><Select label="Público" value={audienceIdValue} options={audiences.map((item) => ({ value: item.id, label: item.name }))} onValueChange={(value) => setAudienceIdValue(value ?? "")} /></Field><Field><Label>Nome interno</Label><Input value={name} placeholder="Reativação de setembro" onChange={(event) => setName(event.target.value)} /></Field><Field><Label>Assunto</Label><Input value={subject} placeholder="Temos novidades para você" onChange={(event) => setSubject(event.target.value)} /></Field><Field><Label>Mensagem</Label><Textarea rows={10} value={body} placeholder="Olá {{nome}}…" onChange={(event) => setBody(event.target.value)} /></Field></div></ActionModal>
  </PageFrame>;
}
function statusLabel(status: Campaign["status"]) { return { draft: "Rascunho", sending: "Enviando", sent: "Enviada", partial: "Parcial", failed: "Falhou" }[status]; }
