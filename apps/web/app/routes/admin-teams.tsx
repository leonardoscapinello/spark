import { useId, useMemo, useState } from "react";
import type { Route } from "./+types/admin-teams";
import {
  teamsControllerArchive,
  teamsControllerCreate,
  teamsControllerList,
  teamsControllerMembers,
  teamsControllerUpdate,
  usersControllerList,
  type TeamDto,
} from "@spark/api-client";
import { teamId as teamIdFactory } from "@spark/core";
import { ActionModal, Button, Checkbox, DataTable, EmptyState, Field, Input, Label, PageHeader, Textarea, notify, type TableColumn } from "@spark/ui-web";
import { requireCapability } from "../lib/route-access.client";
import styles from "./admin-teams.module.css";

export async function clientLoader() {
  await requireCapability("users:manage");
  const [teams, users] = await Promise.all([teamsControllerList(), usersControllerList()]);
  return { teams, users };
}

export default function AdminTeams({ loaderData }: Route.ComponentProps) {
  const membersLabelId = useId();
  const [teams, setTeams] = useState(loaderData.teams);
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const userNames = useMemo(() => new Map(loaderData.users.map((user) => [user.id, user.name])), [loaderData.users]);
  const visibleTeams = teams.filter((team) => showArchived ? team.archivedAt !== null : team.archivedAt === null);

  const columns: TableColumn<TeamDto>[] = [
    { id: "name", label: "Time", cell: (team) => <div><strong>{team.name}</strong><span className={styles.secondary}>{team.description || "Sem descrição"}</span></div>, sortValue: (team) => team.name },
    { id: "members", label: "Membros", cell: (team) => team.memberIds.length ? team.memberIds.map((id) => userNames.get(id) ?? "Usuário indisponível").join(", ") : "Nenhum membro", sortValue: (team) => team.memberIds.length },
    { id: "status", label: "Situação", cell: (team) => <span className={styles.status} data-archived={Boolean(team.archivedAt)}>{team.archivedAt ? "Arquivado" : "Ativo"}</span>, sortValue: (team) => team.archivedAt ?? "" },
  ];

  function openCreate() {
    setEditingId(null);
    setName("");
    setDescription("");
    setMemberIds([]);
    setModalOpen(true);
  }

  function openEdit(team: TeamDto) {
    setEditingId(team.id);
    setName(team.name);
    setDescription(team.description ?? "");
    setMemberIds([...team.memberIds]);
    setModalOpen(true);
  }

  function toggleMember(userId: string, checked: boolean) {
    setMemberIds((current) => checked ? [...current, userId] : current.filter((id) => id !== userId));
  }

  async function save() {
    const normalizedName = name.trim();
    if (!normalizedName) throw new Error("MISSING_NAME");
    if (editingId) {
      await teamsControllerUpdate(editingId, { name: normalizedName, description: description.trim() || null });
      const updated = await teamsControllerMembers(editingId, { memberIds });
      setTeams((current) => current.map((team) => team.id === updated.id ? updated : team));
      notify({ title: "Time atualizado", description: updated.name, tone: "success" });
      return;
    }
    const created = await teamsControllerCreate({ id: teamIdFactory.create(), name: normalizedName, description: description.trim() || null, memberIds });
    setTeams((current) => [created, ...current]);
    notify({ title: "Time criado", description: created.name, tone: "success" });
  }

  async function toggleArchive(team: TeamDto) {
    setBusyId(team.id);
    try {
      const updated = await teamsControllerArchive(team.id, { archived: !team.archivedAt });
      setTeams((current) => current.map((item) => item.id === updated.id ? updated : item));
      notify({ title: updated.archivedAt ? "Time arquivado" : "Time restaurado", description: updated.name, tone: "success" });
    } catch {
      notify({ title: "Não foi possível atualizar o time", tone: "error" });
    } finally {
      setBusyId(null);
    }
  }

  return <div className={styles.page}>
    <PageHeader eyebrow="Administração" title="Times" description="Organize as pessoas responsáveis por vendas, atendimento e operações." actions={<Button onClick={openCreate}>Novo time</Button>} />
    {(teams.length > 0 || showArchived) && <div className={styles.toolbar}>
      <span>{visibleTeams.length} {visibleTeams.length === 1 ? "time" : "times"}</span>
      <Button variant="secondary" onClick={() => setShowArchived((current) => !current)}>{showArchived ? "Ver ativos" : "Ver arquivados"}</Button>
    </div>}
    {teams.length === 0 ? <EmptyState icon="team" title="Organize seu primeiro time" description="Reúna as pessoas responsáveis por vendas, atendimento ou operações e defina quem participa de cada equipe." action={<Button onClick={openCreate}>Novo time</Button>} /> : <DataTable
      label="Times da organização"
      rows={visibleTeams}
      columns={columns}
      rowKey={(team) => team.id}
      rowLabel={(team) => team.name}
      emptyText={showArchived ? "Nenhum time arquivado." : "Nenhum time criado."}
      actions={(team) => <div className={styles.actions}><Button size="sm" variant="ghost" onClick={() => openEdit(team)}>Editar</Button><Button size="sm" variant="ghost" loading={busyId === team.id} onClick={() => void toggleArchive(team)}>{team.archivedAt ? "Restaurar" : "Arquivar"}</Button></div>}
    />}
    <ActionModal open={modalOpen} onOpenChange={setModalOpen} title={editingId ? "Editar time" : "Novo time"} confirmLabel={editingId ? "Salvar alterações" : "Criar time"} errorText="Não foi possível salvar o time. Revise os dados e tente novamente." onConfirm={save}>
      <div className={styles.modalFields}>
        <Field><Label>Nome</Label><Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Vendas" /></Field>
        <Field><Label>Descrição</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Responsabilidade principal deste time" /></Field>
        <div className={styles.members} role="group" aria-labelledby={membersLabelId}>
          <p id={membersLabelId}>Membros</p>
          {loaderData.users.filter((user) => !user.deactivatedAt).map((user) => <Checkbox key={user.id} checked={memberIds.includes(user.id)} onCheckedChange={(checked) => toggleMember(user.id, checked)}><span>{user.name}<small>{user.email}</small></span></Checkbox>)}
        </div>
      </div>
    </ActionModal>
  </div>;
}
