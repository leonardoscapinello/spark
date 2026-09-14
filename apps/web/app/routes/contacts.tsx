import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { and, eq, isNull, useLiveQuery } from "@tanstack/react-db";
import { optimisticContact, optimisticSavedView } from "@spark/data";
import { companyId as companyIdFactory, contactMatches, contactMatchesFilterSet, decodeContactFilterSet, encodeContactFilterSet, filterSetConditions, email as buildEmail, formatCustomFieldValue, phone as buildPhone, formatPhone, userId as userIdFactory, type Contact, type ContactFilter, type ContactFilterSet, type LeadStatus, type SavedViewVisibility } from "@spark/core";
import { ActionCard, ActionCardGroup, ActionModal, Avatar, Badge, Button, CollectionToolbar, DataTable, EmptyState, ErrorText, Field, FilterBar, Icon, Input, Label, MenuButton, MenuItem, PageFrame, PageHeader, Popover, PopoverContent, PopoverTrigger, Select, TableIconAction, notify, type FilterFieldDefinition, type TableColumn } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { usePreference } from "../lib/preferences.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getUsersCollection } from "../lib/users-collection.client";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { getCustomFieldsCollection } from "../lib/custom-fields-collection.client";
import { getSavedViewsCollection } from "../lib/saved-views-collection.client";
import { requireCapability } from "../lib/route-access.client";
import { LEAD_SOURCE_OPTIONS, LEAD_STATUS_OPTIONS, leadStatusLabel } from "../lib/lead-options";
import styles from "./contacts.module.css";


export async function clientLoader() {
  const session = await requireCapability("contacts:read");
  void Promise.allSettled([
    getContactsCollection().preload(),
    getUsersCollection().preload(),
    getCustomFieldsCollection().preload(),
    getSavedViewsCollection().preload(),
    ...(session.capabilities.includes("companies:read") ? [getCompaniesCollection().preload()] : []),
  ]);
  return null;
}

export default function Contacts() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const collection = getContactsCollection();
  const usersCollection = getUsersCollection();
  const { data: contacts, isLoading } = useLiveQuery({
    query: (q) => q.from({ contacts: collection }).orderBy(({ contacts: c }) => c.createdAt, "desc"),
  });
  const { data: users } = useLiveQuery({ query: (q) => q.from({ users: usersCollection }) });
  const { data: customFields = [] } = useLiveQuery({ query: (q) => q.from({ fields: getCustomFieldsCollection() }).orderBy(({ fields: item }) => item.label, "asc") });
  const savedViewsCollection = getSavedViewsCollection();
  const { data: savedViews = [] } = useLiveQuery({ query: (q) => q.from({ views: savedViewsCollection }).where(({ views: view }) => and(eq(view.entityType, "contact"), isNull(view.archivedAt))).orderBy(({ views: view }) => view.createdAt, "asc") });
  const [savedViewsOpen, setSavedViewsOpen] = useState(false);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [saveViewVisibility, setSaveViewVisibility] = useState<SavedViewVisibility>("private");
  const canReadCompanies = getSession()?.capabilities.includes("companies:read") ?? false;
  const canWrite = getSession()?.capabilities.includes("contacts:write") ?? false;
  const canReadIntegrations = getSession()?.capabilities.includes("integrations:read") ?? false;
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
  const statusFilter = searchParams.get("status") ?? "all";
  // A etapa continua morando em `?status=` porque o trilho de navegação aponta
  // para esses links e destaca o item comparando a URL. As demais condições vão
  // para `?f=`. Trocar tudo por `f` apagaria o destaque do menu.
  // A etapa do menu lateral (`?status=`) é a base da visão — «Novos leads» —
  // e o construtor de filtros (`?f=`) refina por cima dela, como a Intercom
  // faz com visão + filtro. Os dois não se misturam na URL.
  const filters = useMemo<ContactFilterSet>(() => decodeContactFilterSet(searchParams.get("f")), [searchParams]);
  const filterCount = filterSetConditions(filters).length;

  function changeFilters(next: ContactFilterSet) {
    const params = new URLSearchParams(searchParams);
    const encoded = encodeContactFilterSet(next);
    if (encoded) params.set("f", encoded); else params.delete("f");
    setSearchParams(params);
  }

  // Salvar a visão dentro de uma etapa guarda a etapa junto, como primeiro
  // grupo E — abrir a visão depois reproduz o que se via ao salvar.
  function filtersToSave(): ContactFilterSet {
    if (statusFilter === "all") return filters;
    const stage = { combinator: "and" as const, conditions: [{ field: "leadStatus", operator: "is", value: statusFilter } as ContactFilter] };
    return filters.combinator === "and" || filters.groups.length <= 1
      ? { combinator: "and", groups: [stage, ...filters.groups] }
      : { combinator: "or", groups: filters.groups.map((group) => ({ ...group, conditions: [...stage.conditions, ...group.conditions] })) };
  }

  // Uma visualização salva guarda o recorte inteiro num só campo — aplicar
  // manda tudo para `f`, então o item de menu da etapa (que aponta para
  // `?status=`) não acende para uma visualização que inclua etapa. É um
  // detalhe cosmético: o filtro em si aplica certo, só o destaque do menu
  // lateral que não acompanha.
  function applySavedView(encoded: string) {
    const params = new URLSearchParams();
    if (encoded) params.set("f", encoded);
    setSearchParams(params);
    setSavedViewsOpen(false);
  }

  async function saveCurrentView() {
    const trimmedName = saveViewName.trim();
    if (!trimmedName) return;
    const session = getSession();
    if (!session) return;
    try {
      const transaction = savedViewsCollection.insert(optimisticSavedView({ name: trimmedName, entityType: "contact", filters: encodeContactFilterSet(filtersToSave()), visibility: saveViewVisibility }, session.orgId, userIdFactory.from(session.userId)));
      await transaction.isPersisted.promise;
      setSaveViewOpen(false);
      setSaveViewName("");
      notify({ title: "Visualização salva", description: trimmedName, tone: "success" });
    } catch {
      notify({ title: "Não foi possível salvar a visualização", tone: "error" });
    }
  }

  async function removeSavedView(view: { id: string; name: string }) {
    try {
      const transaction = savedViewsCollection.update(view.id, (draft) => { draft.archivedAt = new Date().toISOString(); });
      await transaction.isPersisted.promise;
      notify({ title: "Visualização removida", description: view.name, tone: "success" });
    } catch {
      notify({ title: "Não foi possível remover a visualização", tone: "error" });
    }
  }
  const [archiveView, setArchiveView] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // segue a pessoa entre dispositivos (app/lib/preferences.client.ts)
  const [storedHiddenColumns, setStoredHiddenColumns, hasHiddenColumns] = usePreference<string[]>("contacts.hiddenColumns", []);
  const [bulkRunning, setBulkRunning] = useState(false);
  const firstRun = !isLoading && contacts.length === 0 && !archiveView && !search && statusFilter === "all" && filterCount === 0;
  const viewTitle = archiveView ? "Pessoas arquivadas" : ({ new: "Novos leads", qualified: "Leads qualificados", nurturing: "Em nutrição", customer: "Clientes", unqualified: "Desqualificados" } as Record<string, string>)[statusFilter] ?? "Pessoas";
  const filteredContacts = contacts.filter((contact) =>
    (archiveView ? contact.deletedAt !== null : contact.deletedAt === null) &&
    contactMatches(contact, search) &&
    (statusFilter === "all" || contact.leadStatus === statusFilter) && contactMatchesFilterSet(contact, filters),
  );
  const columns = useMemo<TableColumn<Contact>[]>(() => {
    const userNames = new Map(users.map((user) => [user.id, user.name]));
    const companyNames = new Map(companies.map((company) => [company.id, company.name]));
    return [
    {
      id: "name",
      label: "Pessoa",
      alwaysVisible: true,
      cell: (contact) => <div className={styles.contactCell}><Avatar name={contact.name} /><div><strong>{contact.name}</strong><span className={styles.secondary}>{contact.email ?? "Sem e-mail"}</span></div></div>,
      sortValue: (contact) => contact.name,
    },
    {
      id: "company",
      group: "Dados da pessoa",
      label: "Empresa",
      cell: (contact) => contact.companyId ? companyNames.get(contact.companyId) ?? "Empresa indisponível" : <span className={styles.muted}>Não vinculada</span>,
      sortValue: (contact) => contact.companyId ? companyNames.get(contact.companyId) ?? "" : "",
    },
    {
      id: "phone",
      group: "Dados da pessoa",
      label: "Telefone",
      cell: (contact) => contact.phone ? formatPhone(contact.phone) : <span className={styles.muted}>Não informado</span>,
      sortValue: (contact) => contact.phone ?? "",
    },
    {
      id: "status",
      group: "Dados da pessoa",
      label: "Etapa",
      cell: (contact) => <Badge tone={contact.leadStatus === "qualified" || contact.leadStatus === "customer" ? "success" : contact.leadStatus === "unqualified" ? "danger" : contact.leadStatus === "nurturing" ? "warning" : "neutral"}>{leadStatusLabel(contact.leadStatus)}</Badge>,
      sortValue: (contact) => leadStatusLabel(contact.leadStatus),
    },
    {
      id: "owner",
      group: "Dados da pessoa",
      label: "Responsável",
      cell: (contact) => contact.ownerId ? userNames.get(contact.ownerId) ?? "Usuário indisponível" : <span className={styles.muted}>Não atribuído</span>,
      sortValue: (contact) => contact.ownerId ? userNames.get(contact.ownerId) ?? "" : "",
    },
    ...customFields.filter((field) => field.entityType === "contact" && !field.archivedAt).map((field) => ({
      id: `custom:${field.key}`,
      group: "Campos personalizados",
      label: field.label,
      cell: (contact: Contact) => formatCustomFieldValue(field, contact.customFields[field.key]) || <span className={styles.muted}>—</span>,
      sortValue: (contact: Contact) => formatCustomFieldValue(field, contact.customFields[field.key]),
    })),
  ];
  }, [companies, customFields, users]);

  function resetForm() {
    setName(""); setEmail(""); setPhone("");
    setLeadStatus("new"); setSource("manual"); setOwnerId(getSession()?.userId ?? ""); setCompanyId("");
    setNameError(null); setEmailError(null); setPhoneError(null);
  }

  async function addContact() {
    const trimmedName = name.trim();
    setNameError(null); setEmailError(null); setPhoneError(null);
    if (!trimmedName) {
      setNameError("Informe o nome da pessoa.");
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
    notify({ title: "Pessoa cadastrada", description: `${trimmedName} já está disponível em Leads.`, tone: "success" });
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
        title: archived ? "Pessoa arquivada" : "Pessoa restaurada",
        description: contact.name,
        tone: "success",
        ...(offerUndo ? { actions: <Button size="sm" variant="ghost" onClick={() => void updateArchived(contact, !archived, false)}>Desfazer</Button> } : {}),
      });
    } catch {
      notify({ title: "Não foi possível atualizar a pessoa", tone: "error" });
    }
  }

  const filterFields = useMemo<FilterFieldDefinition<ContactFilter["field"]>[]>(() => [
    { id: "leadStatus", label: "Etapa", type: "select", group: "Pessoa", options: LEAD_STATUS_OPTIONS },
    { id: "ownerId", label: "Responsável", type: "select", group: "Pessoa", options: users.filter((user) => !user.deactivatedAt).map((user) => ({ value: user.id, label: user.name })) },
    { id: "companyId", label: "Empresa", type: "select", group: "Pessoa", options: companies.filter((company) => !company.deletedAt).map((company) => ({ value: company.id, label: company.name })) },
    { id: "source", label: "Origem", type: "select", group: "Pessoa", options: LEAD_SOURCE_OPTIONS },
    { id: "score", label: "Pontuação", type: "number", group: "Pessoa" },
    { id: "tags", label: "Marcações", type: "list", group: "Pessoa" },
    { id: "createdAt", label: "Criada em", type: "date", group: "Pessoa" },
    ...customFields.filter((field) => field.entityType === "contact" && !field.archivedAt).map((field): FilterFieldDefinition<ContactFilter["field"]> => ({
      id: `custom:${field.key}`,
      label: field.label,
      group: "Campos personalizados",
      type: field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "multi_select" ? "list" : field.type === "single_select" ? "select" : "text",
      ...(field.options.length > 0 ? { options: field.options.map((option) => ({ value: option, label: option })) } : {}),
    })),
  ], [companies, customFields, users]);

  // Sem preferência gravada, campo personalizado começa escondido: a lista não
  // pode nascer com uma coluna por campo que a organização tenha criado.
  const customColumnIds = useMemo(() => columns.filter((column) => column.id.startsWith("custom:")).map((column) => column.id), [columns]);
  const hiddenColumnIds = hasHiddenColumns ? storedHiddenColumns : customColumnIds;

  function changeHiddenColumns(ids: string[]) {
    setStoredHiddenColumns(ids);
  }

  const selectedContacts = useMemo(() => {
    const chosen = new Set(selectedIds);
    return filteredContacts.filter((contact) => chosen.has(contact.id));
  }, [filteredContacts, selectedIds]);

  // Trocar de visão muda o conjunto à vista; manter a seleção antiga faria a
  // ação em lote agir sobre linha que a pessoa não está mais vendo.
  useEffect(() => { setSelectedIds([]); }, [archiveView, filters, search]);

  async function updateArchivedMany(contacts: readonly Contact[], archived: boolean, offerUndo = true) {
    setBulkRunning(true);
    try {
      await Promise.all(contacts.map(async (contact) => {
        const transaction = collection.update(contact.id, (draft) => { draft.deletedAt = archived ? new Date().toISOString() : null; });
        await transaction.isPersisted.promise;
      }));
      setSelectedIds([]);
      notify({
        title: `${contacts.length} ${contacts.length === 1 ? (archived ? "pessoa arquivada" : "pessoa restaurada") : (archived ? "pessoas arquivadas" : "pessoas restauradas")}`,
        description: contacts.map((contact) => contact.name).slice(0, 3).join(", ") + (contacts.length > 3 ? ` e mais ${contacts.length - 3}` : ""),
        tone: "success",
        ...(offerUndo ? { actions: <Button size="sm" variant="ghost" onClick={() => void updateArchivedMany(contacts, !archived, false)}>Desfazer</Button> } : {}),
      });
    } catch {
      notify({ title: "Não foi possível atualizar todas as pessoas", description: "Nenhuma, algumas ou todas podem ter mudado. Confira a lista.", tone: "error" });
    } finally {
      setBulkRunning(false);
    }
  }

  return <PageFrame>
    <PageHeader icon="user" title={viewTitle} actions={canWrite && !isLoading && !firstRun ? <><Button variant="secondary" onClick={() => void navigate("/contacts/import")}>Importar CSV</Button><Button onClick={() => setModalOpen(true)}>Nova pessoa</Button></> : undefined} />
    {firstRun && <EmptyState variant="featured" icon="user" title="Cadastre a primeira pessoa" description="Reúna pessoas, empresas e conversas em uma base que a equipe pode acompanhar." action={canWrite ? <Button onClick={() => setModalOpen(true)}>Nova pessoa</Button> : undefined} />}
    {firstRun && (canWrite || canReadCompanies || canReadIntegrations) && <ActionCardGroup title="Prepare sua base de leads">
      {canWrite && <ActionCard icon="upload" title="Traga sua lista" description="Importe um CSV e revise os dados antes de salvar as pessoas." action={<Button variant="secondary" onClick={() => void navigate("/contacts/import")}>Importar pessoas</Button>} />}
      {canReadCompanies && <ActionCard icon="building" title="Organize empresas" description="Vincule as pessoas às organizações com quem você negocia." action={<Button variant="secondary" onClick={() => void navigate("/companies")}>Abrir empresas</Button>} />}
      {canReadIntegrations && <ActionCard icon="message" title="Conecte seus canais" description="Receba novas conversas por e-mail e redes sociais." action={<Button variant="secondary" onClick={() => void navigate("/integrations")}>Abrir integrações</Button>} />}
    </ActionCardGroup>}
    {!firstRun && <CollectionToolbar
      search={<Input aria-label="Buscar pessoas" startAdornment={<Icon name="search" />} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, e-mail ou telefone" />}
      filters={<>
        <FilterBar fields={filterFields} value={filters} onChange={changeFilters} />
        <Popover open={savedViewsOpen} onOpenChange={setSavedViewsOpen}>
          <PopoverTrigger render={<Button variant="secondary" icon={<Icon name="star" />}>{savedViews.length > 0 ? `Visualizações (${savedViews.length})` : "Visualizações"}</Button>} />
          <PopoverContent title="Visualizações salvas">
            <div className={styles.savedViews}>
              {savedViews.length === 0
                ? <p className={styles.savedViewsEmpty}>Nenhuma visualização salva ainda.</p>
                : savedViews.map((view) => <div key={view.id} className={styles.savedViewRow}>
                    <Button variant="ghost" className={styles.savedViewApply} onClick={() => applySavedView(view.filters)}>{view.name}</Button>
                    {view.visibility === "private" && <Badge>Só eu</Badge>}
                    {(view.createdBy === getSession()?.userId || canWrite) && <TableIconAction label={`Remover visualização ${view.name}`} icon={<Icon name="trash" />} onClick={() => void removeSavedView(view)} />}
                  </div>)}
            </div>
            <Button variant="secondary" onClick={() => { setSavedViewsOpen(false); setSaveViewOpen(true); }}>Salvar visualização atual</Button>
          </PopoverContent>
        </Popover>
      </>}
      actions={selectedContacts.length > 0
        ? <>
            <Button variant="secondary" loading={bulkRunning} onClick={() => void updateArchivedMany(selectedContacts, !archiveView)}>{archiveView ? "Restaurar" : "Arquivar"}</Button>
            <Button variant="ghost" disabled={bulkRunning} onClick={() => setSelectedIds([])}>Limpar seleção</Button>
          </>
        : <Button variant="secondary" onClick={() => setArchiveView((current) => !current)}>{archiveView ? "Ver ativos" : "Ver arquivados"}</Button>}
      count={<span role="status">{isLoading ? "Carregando pessoas…" : selectedContacts.length > 0 ? `${selectedContacts.length} de ${filteredContacts.length} selecionadas` : `${filteredContacts.length} ${filteredContacts.length === 1 ? "pessoa" : "pessoas"}`}</span>}
    />}
    {!firstRun && <DataTable
      label="Pessoas da organização"
      rows={filteredContacts}
      columns={columns}
      rowKey={(contact) => contact.id}
      rowLabel={(contact) => contact.name}
      state={isLoading && contacts.length === 0 ? "loading" : "ready"}
      {...(canWrite ? { selectedIds, onSelectionChange: setSelectedIds } : {})}
      hiddenColumnIds={hiddenColumnIds}
      onHiddenColumnsChange={changeHiddenColumns}
      emptyText={archiveView ? "Nenhuma pessoa arquivada." : search ? `Nenhuma pessoa encontrada para “${search}”.` : "Nenhuma pessoa cadastrada."}
      actions={(contact) => <><TableIconAction label={`Abrir ${contact.name}`} icon={<Icon name="right" />} onClick={() => void navigate(`/contacts/${contact.id}`)} />{canWrite && <MenuButton size="sm" variant="ghost" shape="rounded" iconOnly indicator={false} icon={<Icon name="more" />} aria-label={`Mais ações de ${contact.name}`} menu={<MenuItem onClick={() => void updateArchived(contact, !archiveView)}>{archiveView ? "Restaurar" : "Arquivar"}</MenuItem>} />}</>}
    />}
    <ActionModal open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) resetForm(); }} title="Nova pessoa" confirmLabel="Cadastrar pessoa" errorText="Não foi possível cadastrar a pessoa. Corrija os campos marcados ou tente novamente." onConfirm={addContact}>
      <form className={styles.modalFields} onSubmit={submitFromForm}>
        <Field invalid={Boolean(nameError)}><Label>Nome</Label><Input autoFocus autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); setNameError(null); }} placeholder="Nome completo" /><ErrorText>{nameError}</ErrorText></Field>
        <Field invalid={Boolean(emailError)}><Label>E-mail</Label><Input type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailError(null); }} placeholder="nome@empresa.com" /><ErrorText>{emailError}</ErrorText></Field>
        <Field invalid={Boolean(phoneError)}><Label>Telefone</Label><Input type="tel" autoComplete="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setPhoneError(null); }} placeholder="(11) 99999-9999" /><ErrorText>{phoneError}</ErrorText></Field>
        <Field><Label>Etapa</Label><Select label="Etapa do relacionamento" value={leadStatus} options={LEAD_STATUS_OPTIONS} onValueChange={(value) => { if (value) setLeadStatus(value as LeadStatus); }} /></Field>
        <Field><Label>Origem</Label><Select label="Origem do lead" value={source} options={LEAD_SOURCE_OPTIONS} onValueChange={(value) => setSource(value ?? "manual")} /></Field>
        <Field><Label>Responsável</Label><Select label="Responsável pelo lead" value={ownerId || null} placeholder="Não atribuído" options={users.filter((user) => !user.deactivatedAt).map((user) => ({ value: user.id, label: user.name, avatar: user.avatarUrl }))} onValueChange={(value) => setOwnerId(value ?? "")} /></Field>
        <Field><Label>Empresa</Label><Select label="Empresa da pessoa" value={companyId || null} placeholder="Não vinculada" options={companies.filter((company) => !company.deletedAt).map((company) => ({ value: company.id, label: company.name }))} onValueChange={(value) => setCompanyId(value ?? "")} /></Field>
      </form>
    </ActionModal>
    <ActionModal open={saveViewOpen} onOpenChange={(open) => { setSaveViewOpen(open); if (!open) setSaveViewName(""); }} title="Salvar visualização" confirmLabel="Salvar" errorText="Não foi possível salvar a visualização. Tente novamente." onConfirm={saveCurrentView}>
      <Field><Label>Nome</Label><Input autoFocus value={saveViewName} onChange={(event) => setSaveViewName(event.target.value)} placeholder="Ex.: Qualificados de São Paulo" /></Field>
      <Field><Label>Quem vê</Label><Select label="Quem vê a visualização" value={saveViewVisibility} options={[{ value: "private", label: "Só eu" }, { value: "org", label: "Toda a organização" }]} onValueChange={(value) => { if (value === "private" || value === "org") setSaveViewVisibility(value); }} /></Field>
    </ActionModal>
  </PageFrame>;
}
