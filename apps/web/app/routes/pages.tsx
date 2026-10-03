import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { Link, useNavigate } from "react-router";
import { pagesControllerCreate } from "@spark/api-client";
import { pageId, type Page } from "@spark/core";
import { ActionCard, ActionCardGroup, ActionModal, Button, Card, Chip, CollectionToolbar, DataTable, EmptyState, Field, Input, Label, PageFrame, PageHeader, RecordIdentity, SearchField, Select, Skeleton, Text, ViewSwitcher, notify, type TableColumn } from "@spark/ui-web";
import { getPagesCollection } from "../lib/pages-collections.client";
import { getSession } from "../lib/auth.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./pages.module.css";

export async function clientLoader() {
  await requireCapability("pages:read");
  void getPagesCollection().preload().catch(() => undefined);
  return null;
}

export default function Pages() {
  const navigate = useNavigate();
  // Regra do produto: a linha abre a página do registro; Cmd/Ctrl ou botão do meio abre em outra aba.
  const openRecord = (url: string, newTab: boolean) => { if (newTab) window.open(url, "_blank"); else void navigate(url); };
  const capabilities = getSession()?.capabilities ?? [];
  const canWrite = capabilities.includes("pages:write");
  const canReadForms = capabilities.includes("forms:read");
  const canReadFiles = capabilities.includes("files:read");
  const { data: pages, isLoading } = useLiveQuery({ query: (q) => q.from({ pages: getPagesCollection() }).orderBy(({ pages: item }) => item.updatedAt, "desc") });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [layout, setLayout] = useState<"cards" | "table">("table");
  const firstRun = !isLoading && pages.length === 0 && !search && status === "all";
  const term = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = pages.filter((page) => (status === "all" || page.status === status)
    && (!term || page.name.toLocaleLowerCase("pt-BR").includes(term) || page.slug.toLocaleLowerCase("pt-BR").includes(term)));

  const columns: TableColumn<Page>[] = [
    { id: "name", label: "Página", cell: (item) => <RecordIdentity icon="page" title={item.name} subtitle={`Identificador: ${item.slug}`} />, sortValue: (item) => item.name },
    { id: "status", label: "Situação", cell: (item) => pageStatusBadge(item), sortValue: (item) => item.status },
    { id: "updated", label: "Atualizada", cell: (item) => formatDate(item.updatedAt), sortValue: (item) => item.updatedAt },
  ];

  async function create() {
    if (!name.trim() || !slug.trim()) throw new Error("MISSING_PAGE");
    const response = await pagesControllerCreate({ id: pageId.create(), name: name.trim(), slug: slug.trim() });
    notify({ title: "Página criada", tone: "success" });
    void navigate(`/pages/${response.page.id}`);
  }

  return <PageFrame className={styles.page}>
    <PageHeader title="Páginas" actions={canWrite && !isLoading && !firstRun ? <Button onClick={() => setOpen(true)}>Nova página</Button> : undefined} />
    {firstRun && <EmptyState variant="featured" icon="page" title="Crie sua primeira página" description="Monte uma página de captação com blocos e publique quando estiver pronta." action={canWrite ? <Button onClick={() => setOpen(true)}>Nova página</Button> : undefined} />}
    {firstRun && (canReadForms || canReadFiles) && <ActionCardGroup title="Prepare sua página">
      {canReadForms && <ActionCard icon="form" title="Capture respostas" description="Use um formulário para receber novas pessoas pela página." action={<Button variant="secondary" onClick={() => void navigate("/forms")}>Abrir formulários</Button>} />}
      {canReadFiles && <ActionCard icon="folder" title="Prepare os arquivos" description="Encontre imagens e documentos para usar no conteúdo." action={<Button variant="secondary" onClick={() => void navigate("/files")}>Abrir arquivos</Button>} />}
    </ActionCardGroup>}
      {!firstRun && <><CollectionToolbar
        search={<SearchField label="Buscar páginas" placeholder="Buscar por nome ou endereço" value={search} onValueChange={setSearch} />}
        filters={<Select appearance="filter" label="Filtrar páginas por situação" value={status} options={[{ value: "all", label: "Todas as situações" }, { value: "draft", label: "Rascunhos" }, { value: "published", label: "Publicadas" }, { value: "archived", label: "Arquivadas" }]} onValueChange={(value) => setStatus(value ?? "all")} />}
        count={`${filtered.length} ${filtered.length === 1 ? "página" : "páginas"}`}
        actions={<ViewSwitcher label="Visualização das páginas" value={layout} onValueChange={setLayout} />}
      />
      {layout === "table" ? <DataTable label="Páginas" rows={filtered} columns={columns} rowKey={(item) => item.id} rowLabel={(item) => item.name} state={isLoading && !pages.length ? "loading" : "ready"} emptyText="Nenhuma página encontrada." onRowOpen={(item, { newTab }) => openRecord(`/pages/${item.id}`, newTab)} /> : <div className={styles.cardGrid} aria-label="Páginas">
        {isLoading && !pages.length && [0, 1, 2].map((item) => <Skeleton key={item} className={styles.cardLoading} />)}
        {!isLoading && filtered.length === 0 && !firstRun && <div className={styles.empty}><EmptyState icon="search" title="Nenhuma página encontrada" description="Tente outro nome ou situação." /></div>}
        {filtered.map((item) => <Card key={item.id} linkRender={<Link to={`/pages/${item.id}`} />} title={item.name} description={`Identificador: ${item.slug}`} actions={pageStatusBadge(item)} footer={<div className={styles.cardFooter}><Text size="pequeno" tone="secondary" truncate>Atualizada {formatDate(item.updatedAt)}</Text></div>}><Text size="pequeno" tone="secondary">{item.status === "published" ? "Página disponível para visitantes" : item.status === "archived" ? "Página arquivada" : "Página em edição"}</Text></Card>)}
      </div>}</>}
    <ActionModal open={open} onOpenChange={setOpen} title="Nova página" confirmLabel="Criar e editar" errorText="Informe nome e endereço válidos." onConfirm={create}>
      <div className={styles.form}>
        <Field><Label>Nome interno</Label><Input value={name} placeholder="Landing de campanha" onChange={(event) => { setName(event.target.value); if (!slug) setSlug(toSlug(event.target.value)); }} /></Field>
        <Field><Label>Identificador interno</Label><Input value={slug} placeholder="landing-de-campanha" onChange={(event) => setSlug(toSlug(event.target.value))} /></Field>
      </div>
    </ActionModal>
  </PageFrame>;
}

function toSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function formatDate(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function pageStatusBadge(item: Page) { return <Chip dot={item.status === "published" ? "var(--ok)" : "var(--tx3)"}>{item.status === "published" ? "Publicada" : item.status === "archived" ? "Arquivada" : "Rascunho"}</Chip>; }
