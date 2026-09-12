import { useMemo, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { filesControllerComplete, filesControllerDownload, filesControllerRemove, filesControllerUpload } from "@spark/api-client";
import { fileId, type StoredFile } from "@spark/core";
import { Badge, Card, CollectionToolbar, DataTable, EmptyState, FilePicker, Icon, Input, PageHeader, Select, Skeleton, TableIconAction, ViewSwitcher, notify, type TableColumn } from "@spark/ui-web";
import { getFilesCollection } from "../lib/files-collection.client";
import { getSession } from "../lib/auth.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./files.module.css";

export async function clientLoader() { await requireCapability("files:read"); void getFilesCollection().preload().catch(() => undefined); return null; }

export default function Files() {
  const session = getSession(); const canWrite = session?.capabilities.includes("files:write") ?? false;
  const { data: allFiles, isLoading } = useLiveQuery({ query: (q) => q.from({ files: getFilesCollection() }).orderBy(({ files: item }) => item.createdAt, "desc") });
  const [search, setSearch] = useState(""); const [kind, setKind] = useState("all"); const [status, setStatus] = useState("all"); const [layout, setLayout] = useState<"cards" | "table">("table"); const [uploading, setUploading] = useState<string | null>(null); const [busyId, setBusyId] = useState<string | null>(null);
  const hasFiles = allFiles.some((item) => !item.deletedAt);
  const firstRun = !hasFiles && !isLoading && !search && kind === "all" && status === "all";
  const emptyText = firstRun ? "Os arquivos enviados aparecerão nesta tabela." : "Nenhum arquivo corresponde aos filtros.";
  const files = useMemo(() => allFiles.filter((item) => !item.deletedAt && (kind === "all" || fileKind(item.mimeType) === kind) && (status === "all" || item.status === status) && (!search.trim() || item.name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")))), [allFiles, kind, search, status]);
  const columns: TableColumn<StoredFile>[] = [
    { id: "name", label: "Arquivo", cell: (item) => <div className={styles.fileName}><span className={styles.fileIcon}><Icon name={fileKind(item.mimeType) === "image" ? "image" : "file"} /></span><span><strong>{item.name}</strong><small>{item.mimeType}</small></span></div>, sortValue: (item) => item.name },
    { id: "folder", label: "Pasta", cell: (item) => item.folder ?? "Geral", sortValue: (item) => item.folder ?? "" },
    { id: "size", label: "Tamanho", cell: (item) => formatBytes(item.sizeBytes), sortValue: (item) => item.sizeBytes },
    { id: "status", label: "Status", cell: (item) => fileStatusBadge(item), sortValue: (item) => item.status },
    { id: "created", label: "Enviado em", cell: (item) => formatDate(item.createdAt), sortValue: (item) => item.createdAt },
  ];
  async function upload(selected: File[]) {
    for (let index = 0; index < selected.length; index += 1) { const browserFile = selected[index]; if (!browserFile) continue; setUploading(`${index + 1} de ${selected.length}: ${browserFile.name}`); try { const id = fileId.create(); const response = await filesControllerUpload({ id, name: browserFile.name, mimeType: browserFile.type || "application/octet-stream", sizeBytes: browserFile.size, folder: null }); const put = await fetch(response.uploadUrl, { method: "PUT", headers: { "Content-Type": browserFile.type || "application/octet-stream" }, body: browserFile }); if (!put.ok) throw new Error(`O armazenamento respondeu ${put.status}.`); await filesControllerComplete(id); notify({ title: "Arquivo enviado", description: browserFile.name, tone: "success" }); } catch (error) { notify({ title: "Falha no envio", description: error instanceof Error ? error.message : browserFile.name, tone: "error" }); } }
    setUploading(null);
  }
  async function download(item: StoredFile) { setBusyId(item.id); try { const target = await filesControllerDownload(item.id); window.open(target.downloadUrl, "_blank", "noopener,noreferrer"); } finally { setBusyId(null); } }
  async function remove(item: StoredFile) { setBusyId(item.id); try { await filesControllerRemove(item.id); notify({ title: "Arquivo excluído", description: item.name, tone: "success" }); } catch { notify({ title: "Não foi possível excluir", description: item.name, tone: "error" }); } finally { setBusyId(null); } }
  function fileActions(item: StoredFile) { return <><TableIconAction label={`Baixar ${item.name}`} icon={<Icon name="download" />} disabled={item.status !== "ready" || busyId === item.id} onClick={() => void download(item)} />{canWrite && <TableIconAction label={`Excluir ${item.name}`} icon={<Icon name="trash" />} disabled={item.status !== "ready" || busyId === item.id} onClick={() => void remove(item)} />}</>; }
  return <div className={styles.page}>
    <PageHeader icon="file" title="Arquivos" description="Use o mesmo arquivo em contatos, campanhas, conversas e automações." actions={canWrite && hasFiles ? <FilePicker appearance="button" disabled={Boolean(uploading)} onFiles={(selected) => void upload(selected)} label={uploading ? `Enviando ${uploading}` : "Enviar arquivos"} /> : undefined} />
    {firstRun && <EmptyState variant="featured" icon="file" title="Envie seu primeiro arquivo" description="Organize imagens e documentos para reutilizá-los em toda a equipe." action={canWrite ? <FilePicker appearance="button" disabled={Boolean(uploading)} onFiles={(selected) => void upload(selected)} label={uploading ? `Enviando ${uploading}` : "Enviar arquivos"} /> : undefined} />}
      <><CollectionToolbar
        search={<Input aria-label="Buscar arquivos" placeholder="Buscar por nome" value={search} startAdornment={<Icon name="search" />} onChange={(event) => setSearch(event.target.value)} />}
        filters={<><Select appearance="filter" label="Tipo de arquivo" value={kind} options={[{ value: "all", label: "Todos os tipos" }, { value: "image", label: "Imagens" }, { value: "video", label: "Vídeos" }, { value: "document", label: "Documentos" }, { value: "other", label: "Outros" }]} onValueChange={(value) => setKind(value ?? "all")} /><Select appearance="filter" label="Status do arquivo" value={status} options={[{ value: "all", label: "Todos os status" }, { value: "ready", label: "Disponíveis" }, { value: "pending", label: "Processando" }, { value: "failed", label: "Com falha" }]} onValueChange={(value) => setStatus(value ?? "all")} /></>}
        count={`${files.length} ${files.length === 1 ? "arquivo" : "arquivos"}`}
        actions={<ViewSwitcher label="Visualização dos arquivos" value={layout} onValueChange={setLayout} />}
      />
      {layout === "table" ? <DataTable label="Biblioteca de arquivos" rows={files} columns={columns} rowKey={(item) => item.id} rowLabel={(item) => item.name} state={isLoading && !allFiles.length ? "loading" : "ready"} emptyText={emptyText} actions={fileActions} /> : <div className={styles.fileGrid} aria-label="Biblioteca de arquivos">
        {isLoading && !allFiles.length && [0, 1, 2].map((item) => <Skeleton key={item} className={styles.cardLoading} />)}
        {!isLoading && files.length === 0 && <p className={styles.empty}>{firstRun ? "Os arquivos enviados aparecerão aqui." : emptyText}</p>}
        {files.map((item) => <Card key={item.id} title={item.name} description={`${item.folder ?? "Geral"} · ${formatBytes(item.sizeBytes)}`} actions={fileStatusBadge(item)} footer={<div className={styles.cardFooter}><span>{formatDate(item.createdAt)}</span><div>{fileActions(item)}</div></div>}><div className={styles.cardBody}><span className={styles.fileIcon}><Icon name={fileKind(item.mimeType) === "image" ? "image" : "file"} /></span><span>{fileTypeLabel(item.mimeType)}</span></div></Card>)}
      </div>}</>
  </div>;
}
function fileKind(mime: string): string { if (mime.startsWith("image/")) return "image"; if (mime.startsWith("video/")) return "video"; if (mime.includes("pdf") || mime.includes("document") || mime.includes("sheet") || mime.startsWith("text/")) return "document"; return "other"; }
function fileTypeLabel(mime: string): string { return ({ image: "Imagem", video: "Vídeo", document: "Documento", other: "Arquivo" } as Record<string, string>)[fileKind(mime)] ?? "Arquivo"; }
function fileStatusBadge(item: StoredFile) { return <Badge tone={item.status === "ready" ? "success" : item.status === "failed" ? "danger" : "warning"}>{item.status === "ready" ? "Disponível" : item.status === "failed" ? "Falhou" : "Processando"}</Badge>; }
function formatBytes(value: number): string { if (value < 1024) return `${value} B`; const units = ["KB", "MB", "GB"]; let size = value / 1024; let unit = units[0]; for (let index = 1; size >= 1024 && index < units.length; index += 1) { size /= 1024; unit = units[index]; } return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(size)} ${unit}`; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
