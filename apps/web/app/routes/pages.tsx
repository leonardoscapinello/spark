import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { useNavigate } from "react-router";
import { pagesControllerCreate } from "@spark/api-client";
import { pageId, type Page } from "@spark/core";
import { ActionModal, Badge, Button, CollectionToolbar, DataTable, EmptyState, Field, Icon, Input, Label, PageHeader, Select, TableIconAction, notify, type TableColumn } from "@spark/ui-web";
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
  const canWrite = getSession()?.capabilities.includes("pages:write") ?? false;
  const { data: pages, isLoading } = useLiveQuery({ query: (q) => q.from({ pages: getPagesCollection() }).orderBy(({ pages: item }) => item.updatedAt, "desc") });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const firstRun = !isLoading && pages.length === 0 && !search && status === "all";
  const term = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = pages.filter((page) => (status === "all" || page.status === status)
    && (!term || page.name.toLocaleLowerCase("pt-BR").includes(term) || page.slug.toLocaleLowerCase("pt-BR").includes(term)));

  const columns: TableColumn<Page>[] = [
    { id: "name", label: "Página", cell: (item) => <div className={styles.primary}><strong>{item.name}</strong><span>/{item.slug}</span></div>, sortValue: (item) => item.name },
    { id: "status", label: "Situação", cell: (item) => <Badge tone={item.status === "published" ? "success" : "neutral"}>{item.status === "published" ? "Publicada" : item.status === "archived" ? "Arquivada" : "Rascunho"}</Badge>, sortValue: (item) => item.status },
    { id: "updated", label: "Atualizada", cell: (item) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.updatedAt)), sortValue: (item) => item.updatedAt },
  ];

  async function create() {
    if (!name.trim() || !slug.trim()) throw new Error("MISSING_PAGE");
    const response = await pagesControllerCreate({ id: pageId.create(), name: name.trim(), slug: slug.trim() });
    notify({ title: "Página criada", tone: "success" });
    void navigate(`/pages/${response.page.id}`);
  }

  return <div className={styles.page}>
    <PageHeader title="Páginas" description="Crie, publique e acompanhe páginas de captação." actions={canWrite && !firstRun && !isLoading ? <Button onClick={() => setOpen(true)}>Nova página</Button> : undefined} />
    {firstRun && <EmptyState variant="onboarding" icon="file" title="Crie sua primeira página" description="Monte uma página de captação com blocos e publique quando estiver pronta." action={canWrite ? <Button onClick={() => setOpen(true)}>Nova página</Button> : undefined} />}
      <CollectionToolbar
        search={<Input aria-label="Buscar páginas" startAdornment={<Icon name="search" />} placeholder="Buscar por nome ou endereço" value={search} onChange={(event) => setSearch(event.target.value)} />}
        filters={<Select label="Filtrar páginas por situação" value={status} options={[{ value: "all", label: "Todas as situações" }, { value: "draft", label: "Rascunhos" }, { value: "published", label: "Publicadas" }, { value: "archived", label: "Arquivadas" }]} onValueChange={(value) => setStatus(value ?? "all")} />}
        count={`${filtered.length} ${filtered.length === 1 ? "página" : "páginas"}`}
      />
      <DataTable label="Páginas" rows={filtered} columns={columns} rowKey={(item) => item.id} rowLabel={(item) => item.name} state={isLoading && !pages.length ? "loading" : "ready"} emptyText={firstRun ? "As páginas aparecerão aqui após a primeira criação." : "Nenhuma página encontrada."} actions={(item) => <TableIconAction label={`Editar ${item.name}`} icon={<Icon name="right" />} onClick={() => void navigate(`/pages/${item.id}`)} />} />
    <ActionModal open={open} onOpenChange={setOpen} title="Nova página" confirmLabel="Criar e editar" errorText="Informe nome e endereço válidos." onConfirm={create}>
      <div className={styles.form}>
        <Field><Label>Nome interno</Label><Input value={name} placeholder="Landing de campanha" onChange={(event) => { setName(event.target.value); if (!slug) setSlug(toSlug(event.target.value)); }} /></Field>
        <Field><Label>Endereço</Label><Input value={slug} placeholder="landing-de-campanha" onChange={(event) => setSlug(toSlug(event.target.value))} /></Field>
      </div>
    </ActionModal>
  </div>;
}

function toSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
