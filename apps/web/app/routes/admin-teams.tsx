import { useEffect, useId, useMemo, useState } from "react";
import {
  teamsControllerArchive,
  teamsControllerCreate,
  teamsControllerList,
  teamsControllerMembers,
  teamsControllerUpdate,
  usersControllerList,
  type AdminUserDto,
  type TeamDto,
} from "@spark/api-client";
import { teamId as teamIdFactory } from "@spark/core";
import { ActionModal, Badge, Button, Checkbox, CollectionToolbar, DataTable, EmptyState, Field, Icon, Input, Label, PageFrame, PageHeader, Select, Textarea, notify, type TableColumn } from "@spark/ui-web";
import { requireCapability } from "../lib/route-access.client";
import styles from "./admin-teams.module.css";

export async function clientLoader() {
  await requireCapability("users:manage");
  return null;
}

export default function AdminTeams() {
  const membersLabelId = useId();
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([teamsControllerList(), usersControllerList()]).then(([nextTeams, nextUsers]) => {
      if (!active) return;
      setTeams(nextTeams);
      setUsers(nextUsers);
      setLoadError(false);
    }).catch(() => { if (active) setLoadError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);
  const userNames = useMemo(() => new Map(users.map((user) => [user.id, user.name])), [users]);
  const searchTerm = search.trim().toLocaleLowerCase("pt-BR");
  const visibleTeams = teams.filter((team) =>
    (showArchived ? team.archivedAt !== null : team.archivedAt === null) &&
    (!searchTerm || `${team.name} ${team.description ?? ""}`.toLocaleLowerCase("pt-BR").includes(searchTerm)),
  );

  const columns: TableColumn<TeamDto>[] = [
    { id: "name", label: "Time", cell: (team) => <div><strong>{team.name}</strong><span className={styles.secondary}>{team.description || "Sem descrição"}</span></div>, sortValue: (team) => team.name },
    { id: "members", label: "Membros", cell: (team) => team.memberIds.length ? team.memberIds.map((id) => userNames.get(id) ?? "Usuário indisponível").join(", ") : "Nenhum membro", sortValue: (team) => team.memberIds.length },
    { id: "status", label: "Situação", cell: (team) => <Badge tone={team.archivedAt ? "neutral" : "success"}>{team.archivedAt ? "Arquivado" : "Ativo"}</Badge>, sortValue: (team) => team.archivedAt ?? "" },
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

  const firstRun = !loading && !loadError && teams.length === 0 && !search && !showArchived;

  return <PageFrame width="content">
    <PageHeader icon="team" eyebrow="Administração" title={showArchived ? "Times arquivados" : "Times"} description="Organize as pessoas responsáveis por vendas, atendimento e operações." actions={teams.length > 0 ? <Button onClick={openCreate}>Novo time</Button> : undefined} />
    {loadError ? <EmptyState icon="team" title="Não foi possível carregar os times" description="Tente novamente para consultar a equipe." action={<Button onClick={() => { setLoading(true); setReloadKey((value) => value + 1); }}>Tentar novamente</Button>} /> : <>
    {firstRun && <EmptyState variant="featured" icon="team" title="Organize seu primeiro time" description="Reúna as pessoas responsáveis por vendas, atendimento ou operações e defina quem participa de cada equipe." action={<Button onClick={openCreate}>Novo time</Button>} />}
    {!firstRun && <><CollectionToolbar
      search={<Input aria-label="Buscar times" placeholder="Buscar por nome ou descrição" value={search} startAdornment={<Icon name="search" />} onChange={(event) => setSearch(event.target.value)} />}
      filters={<Select appearance="filter" label="Situação dos times" value={showArchived ? "archived" : "active"} options={[{ value: "active", label: "Ativos" }, { value: "archived", label: "Arquivados" }]} onValueChange={(value) => setShowArchived(value === "archived")} />}
      count={loading ? "Carregando times…" : `${visibleTeams.length} ${visibleTeams.length === 1 ? "time" : "times"}`}
    />
    <DataTable
      label="Times da organização"
      rows={visibleTeams}
      columns={columns}
      state={loading ? "loading" : "ready"}
      rowKey={(team) => team.id}
      rowLabel={(team) => team.name}
      emptyText={showArchived ? "Nenhum time arquivado." : "Nenhum time criado."}
      actions={(team) => <div className={styles.actions}><Button size="sm" variant="ghost" onClick={() => openEdit(team)}>Editar</Button><Button size="sm" variant="ghost" loading={busyId === team.id} onClick={() => void toggleArchive(team)}>{team.archivedAt ? "Restaurar" : "Arquivar"}</Button></div>}
    /></>}</>}
    <ActionModal open={modalOpen} onOpenChange={setModalOpen} title={editingId ? "Editar time" : "Novo time"} confirmLabel={editingId ? "Salvar alterações" : "Criar time"} errorText="Não foi possível salvar o time. Revise os dados e tente novamente." onConfirm={save}>
      <div className={styles.modalFields}>
        <Field><Label>Nome</Label><Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Vendas" /></Field>
        <Field><Label>Descrição</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Responsabilidade principal deste time" /></Field>
        <div className={styles.members} role="group" aria-labelledby={membersLabelId}>
          <p id={membersLabelId}>Membros</p>
          {users.filter((user) => !user.deactivatedAt).map((user) => <Checkbox key={user.id} checked={memberIds.includes(user.id)} onCheckedChange={(checked) => toggleMember(user.id, checked)}><span>{user.name}<small>{user.email}</small></span></Checkbox>)}
        </div>
      </div>
    </ActionModal>
  </PageFrame>;
}
