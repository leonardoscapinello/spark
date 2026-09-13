import { useMemo, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { useNavigate } from "react-router";
import { formsControllerCreate, formsControllerStatus } from "@spark/api-client";
import { leadFormId, type LeadForm } from "@spark/core";
import { ActionCard, ActionCardGroup, ActionModal, Badge, Button, Card, CollectionToolbar, DataTable, EmptyState, Field, Icon, Input, Label, MenuButton, MenuItem, PageFrame, PageHeader, RecordIdentity, Select, Skeleton, TableIconAction, ViewSwitcher, notify, type TableColumn } from "@spark/ui-web";
import { getFormSubmissionsCollection, getLeadFormsCollection } from "../lib/forms-collections.client";
import { getSession } from "../lib/auth.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./forms.module.css";

export async function clientLoader() {
  await requireCapability("forms:read");
  void Promise.allSettled([getLeadFormsCollection().preload(), getFormSubmissionsCollection().preload()]);
  return null;
}

export default function Forms() {
  const navigate = useNavigate();
  const capabilities = getSession()?.capabilities ?? [];
  const canWrite = capabilities.includes("forms:write");
  const canReadPages = capabilities.includes("pages:read");
  const canReadContacts = capabilities.includes("contacts:read");
  const { data: forms, isLoading } = useLiveQuery({ query: (q) => q.from({ forms: getLeadFormsCollection() }).orderBy(({ forms: item }) => item.updatedAt, "desc") });
  const { data: submissions } = useLiveQuery({ query: (q) => q.from({ submissions: getFormSubmissionsCollection() }) });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [layout, setLayout] = useState<"cards" | "table">("table");
  const firstRun = !isLoading && forms.length === 0 && !search && status === "all";
  const term = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = forms.filter((form) => (status === "all" || form.status === status)
    && (!term || form.name.toLocaleLowerCase("pt-BR").includes(term) || form.title.toLocaleLowerCase("pt-BR").includes(term)));
  const counts = useMemo(() => submissions.reduce((map, item) => map.set(item.formId, (map.get(item.formId) ?? 0) + 1), new Map<string, number>()), [submissions]);

  const columns: TableColumn<LeadForm>[] = [
    { id: "name", label: "Formulário", cell: (item) => <RecordIdentity icon="form" title={item.name} subtitle={item.title} />, sortValue: (item) => item.name },
    { id: "fields", label: "Campos", cell: (item) => item.fields.length, sortValue: (item) => item.fields.length },
    { id: "submissions", label: "Respostas", cell: (item) => counts.get(item.id) ?? 0, sortValue: (item) => counts.get(item.id) ?? 0 },
    { id: "status", label: "Situação", cell: (item) => formStatusBadge(item), sortValue: (item) => item.status },
    { id: "updated", label: "Atualizado", cell: (item) => formatDate(item.updatedAt), sortValue: (item) => item.updatedAt },
  ];

  async function create() {
    if (!name.trim() || !title.trim()) throw new Error("MISSING_FORM");
    const response = await formsControllerCreate({ id: leadFormId.create(), name: name.trim(), title: title.trim() });
    notify({ title: "Formulário criado", description: name, tone: "success" });
    void navigate(`/forms/${response.form.id}`);
  }

  async function toggle(item: LeadForm) {
    setBusy(item.id);
    try {
      await formsControllerStatus(item.id, { published: item.status !== "published" });
      notify({ title: item.status === "published" ? "Formulário retirado do ar" : "Formulário publicado", tone: "success" });
    } finally {
      setBusy(null);
    }
  }

  function formActions(item: LeadForm) { return canWrite
    ? <MenuButton size="sm" variant="ghost" shape="rounded" iconOnly indicator={false} icon={<Icon name="more" />} aria-label={`Ações de ${item.name}`} loading={busy === item.id} menu={<><MenuItem onClick={() => void navigate(`/forms/${item.id}`)}>Abrir editor</MenuItem><MenuItem onClick={() => void toggle(item)}>{item.status === "published" ? "Despublicar formulário" : "Publicar formulário"}</MenuItem></>} />
    : <TableIconAction label={`Abrir ${item.name}`} icon={<Icon name="right" />} onClick={() => void navigate(`/forms/${item.id}`)} />; }

  return <PageFrame className={styles.page}>
    <PageHeader icon="form" title="Formulários" actions={canWrite && !isLoading && !firstRun ? <Button onClick={() => setOpen(true)}>Novo formulário</Button> : undefined} />
    {firstRun && <EmptyState variant="featured" icon="form" title="Crie seu primeiro formulário" description="Capture pessoas com os campos que sua equipe precisa e acompanhe as respostas aqui." action={canWrite ? <Button onClick={() => setOpen(true)}>Novo formulário</Button> : undefined} />}
    {firstRun && (canReadPages || canReadContacts) && <ActionCardGroup title="Prepare a captação">
      {canReadPages && <ActionCard icon="page" title="Use em uma página" description="Coloque o formulário em uma página de captação." action={<Button variant="secondary" onClick={() => void navigate("/pages")}>Abrir páginas</Button>} />}
      {canReadContacts && <ActionCard icon="team" title="Acompanhe pessoas" description="Veja as pessoas que chegam pelos seus formulários." action={<Button variant="secondary" onClick={() => void navigate("/")}>Abrir pessoas</Button>} />}
    </ActionCardGroup>}
      {!firstRun && <><CollectionToolbar
        search={<Input aria-label="Buscar formulários" startAdornment={<Icon name="search" />} placeholder="Buscar por nome ou título" value={search} onChange={(event) => setSearch(event.target.value)} />}
        filters={<Select appearance="filter" label="Filtrar formulários por situação" value={status} options={[{ value: "all", label: "Todas as situações" }, { value: "draft", label: "Rascunhos" }, { value: "published", label: "Publicados" }, { value: "archived", label: "Arquivados" }]} onValueChange={(value) => setStatus(value ?? "all")} />}
        count={`${filtered.length} ${filtered.length === 1 ? "formulário" : "formulários"}`}
        actions={<ViewSwitcher label="Visualização dos formulários" value={layout} onValueChange={setLayout} />}
      />
      {layout === "table" ? <DataTable label="Formulários" rows={filtered} columns={columns} rowKey={(item) => item.id} rowLabel={(item) => item.name} state={isLoading && !forms.length ? "loading" : "ready"} emptyText="Nenhum formulário encontrado." actions={formActions} /> : <div className={styles.cardGrid} aria-label="Formulários">
        {isLoading && !forms.length && [0, 1, 2].map((item) => <Skeleton key={item} className={styles.cardLoading} />)}
        {!isLoading && filtered.length === 0 && !firstRun && <p className={styles.empty}>Nenhum formulário encontrado.</p>}
        {filtered.map((item) => <Card key={item.id} title={item.name} description={item.title} actions={formStatusBadge(item)} footer={<div className={styles.cardFooter}><span>Atualizado {formatDate(item.updatedAt)}</span><div>{formActions(item)}</div></div>}><div className={styles.cardMeta}><span><Icon name="form" />{item.fields.length} {item.fields.length === 1 ? "campo" : "campos"}</span><span>{counts.get(item.id) ?? 0} {counts.get(item.id) === 1 ? "resposta" : "respostas"}</span></div></Card>)}
      </div>}</>}
    <ActionModal open={open} onOpenChange={setOpen} title="Novo formulário" confirmLabel="Criar e editar" errorText="Informe o nome interno e o título público." onConfirm={create}>
      <div className={styles.form}>
        <Field><Label>Nome interno</Label><Input value={name} placeholder="Captação do site" onChange={(event) => setName(event.target.value)} /></Field>
        <Field><Label>Título público</Label><Input value={title} placeholder="Fale com nossa equipe" onChange={(event) => setTitle(event.target.value)} /></Field>
      </div>
    </ActionModal>
  </PageFrame>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
function formStatusBadge(item: LeadForm) { return <Badge tone={item.status === "published" ? "success" : "neutral"}>{item.status === "published" ? "Publicado" : item.status === "archived" ? "Arquivado" : "Rascunho"}</Badge>; }
