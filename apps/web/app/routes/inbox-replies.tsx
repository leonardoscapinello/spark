import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { inboxControllerArchiveCannedReply, inboxControllerCreateCannedReply, inboxControllerUpdateCannedReply } from "@spark/api-client";
import { cannedReplyId, type CannedReply } from "@spark/core";
import { ActionModal, Badge, Button, DataTable, Field, Input, Label, PageHeader, Select, Textarea, notify, type TableColumn } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getCannedRepliesCollection } from "../lib/canned-replies-collection.client";
import { requireCapability } from "../lib/route-access.client";
import { getTeamsCollection } from "../lib/teams-collection.client";
import styles from "./inbox-replies.module.css";

export async function clientLoader() {
  await requireCapability("inbox:read");
  void Promise.allSettled([getCannedRepliesCollection().preload(), getTeamsCollection().preload()]);
  return null;
}

export default function InboxReplies() {
  const navigate = useNavigate();
  const canWrite = getSession()?.capabilities.includes("inbox:write") ?? false;
  const { data: replies, isLoading } = useLiveQuery({ query: (q) => q.from({ replies: getCannedRepliesCollection() }).orderBy(({ replies: item }) => item.shortcut, "asc") });
  const { data: teams = [] } = useLiveQuery({ query: (q) => q.from({ teams: getTeamsCollection() }).orderBy(({ teams: item }) => item.name, "asc") });
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [body, setBody] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const teamNames = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams]);
  const visible = replies.filter((reply) => Boolean(reply.archivedAt) === showArchived && `${reply.title} ${reply.shortcut} ${reply.body}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));

  const columns: TableColumn<CannedReply>[] = [
    { id: "title", label: "Resposta", cell: (reply) => <div className={styles.primary}><strong>{reply.title}</strong><span>/{reply.shortcut}</span></div>, sortValue: (reply) => reply.title },
    { id: "body", label: "Texto", cell: (reply) => <span className={styles.excerpt}>{reply.body}</span> },
    { id: "team", label: "Disponível para", cell: (reply) => reply.teamId ? teamNames.get(reply.teamId) ?? "Equipe" : "Todas as equipes", sortValue: (reply) => reply.teamId ? teamNames.get(reply.teamId) ?? "" : "" },
    { id: "status", label: "Situação", cell: (reply) => <Badge tone={reply.archivedAt ? "neutral" : "success"}>{reply.archivedAt ? "Arquivada" : "Ativa"}</Badge> },
  ];

  function openCreate() {
    setEditingId(null); setTitle(""); setShortcut(""); setBody(""); setTeamId(null); setModalOpen(true);
  }
  function openEdit(reply: CannedReply) {
    setEditingId(reply.id); setTitle(reply.title); setShortcut(reply.shortcut); setBody(reply.body); setTeamId(reply.teamId); setModalOpen(true);
  }
  async function save() {
    const payload = { title: title.trim(), shortcut: shortcut.trim(), body: body.trim(), teamId };
    if (editingId) {
      await inboxControllerUpdateCannedReply(editingId, payload);
      notify({ title: "Resposta atualizada", description: payload.title, tone: "success" });
    } else {
      await inboxControllerCreateCannedReply({ id: cannedReplyId.create(), ...payload });
      notify({ title: "Resposta criada", description: payload.title, tone: "success" });
    }
  }
  async function toggleArchive(reply: CannedReply) {
    setBusyId(reply.id);
    try {
      await inboxControllerArchiveCannedReply(reply.id, { archived: !reply.archivedAt });
      notify({ title: reply.archivedAt ? "Resposta restaurada" : "Resposta arquivada", description: reply.title, tone: "success" });
    } catch {
      notify({ title: "Não foi possível atualizar a resposta", tone: "error" });
    } finally { setBusyId(null); }
  }

  return <div className={styles.page}>
    <PageHeader eyebrow="Atendimento" title="Respostas prontas" description="Mantenha mensagens consistentes e disponíveis para a equipe certa." actions={canWrite ? <Button onClick={openCreate}>Nova resposta</Button> : undefined} />
    <div className={styles.toolbar}><Button variant="ghost" onClick={() => navigate("/inbox")}>Voltar ao Inbox</Button><Input aria-label="Buscar respostas" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar resposta ou atalho" /><Button variant="secondary" onClick={() => setShowArchived((current) => !current)}>{showArchived ? "Ver ativas" : "Ver arquivadas"}</Button></div>
    <DataTable label="Respostas prontas" rows={visible} columns={columns} rowKey={(reply) => reply.id} rowLabel={(reply) => reply.title} state={isLoading && !replies.length ? "loading" : "ready"} emptyText={showArchived ? "Nenhuma resposta arquivada." : "Nenhuma resposta pronta."} {...(canWrite ? { actions: (reply: CannedReply) => <div className={styles.actions}><Button size="sm" variant="ghost" onClick={() => openEdit(reply)}>Editar</Button><Button size="sm" variant="ghost" loading={busyId === reply.id} onClick={() => void toggleArchive(reply)}>{reply.archivedAt ? "Restaurar" : "Arquivar"}</Button></div> } : {})} />
    <ActionModal open={modalOpen} onOpenChange={setModalOpen} title={editingId ? "Editar resposta pronta" : "Nova resposta pronta"} confirmLabel={editingId ? "Salvar alterações" : "Criar resposta"} errorText="Revise o título, o atalho e o conteúdo. O atalho deve ser único." onConfirm={save}>
      <div className={styles.form}><Field><Label>Título</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Boas-vindas" maxLength={120} /></Field><Field><Label>Atalho</Label><Input value={shortcut} onChange={(event) => setShortcut(event.target.value)} placeholder="boas-vindas" maxLength={50} /></Field><Field><Label>Equipe</Label><Select label="Equipe que pode usar a resposta" value={teamId} options={[{ value: "", label: "Todas as equipes" }, ...teams.filter((team) => !team.archivedAt).map((team) => ({ value: team.id, label: team.name }))]} onValueChange={(value) => setTeamId(value || null)} /></Field><Field><Label>Mensagem</Label><Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={8} maxLength={20_000} placeholder="Olá! Como posso ajudar?" /></Field></div>
    </ActionModal>
  </div>;
}
