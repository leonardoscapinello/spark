import { useEffect, useState } from "react";
import { redirect } from "react-router";
import type { Route } from "./+types/admin-users";
import { emailVerificationsControllerVerify, permissionGroupsControllerList, usersControllerAccess, usersControllerInvite, usersControllerList, usersControllerPermissionGroup, type AdminUserDto, type PermissionGroupDto } from "@spark/api-client";
import { userId as userIdFactory } from "@spark/core";
import { ActionModal, Avatar, Badge, Button, CollectionToolbar, DataTable, Field, Icon, Input, Label, PageFrame, PageHeader, Select, type TableColumn } from "@spark/ui-web";
import { restoreSession } from "../lib/auth.client";
import styles from "./admin-users.module.css";

export async function clientLoader() {
  const session = await restoreSession();
  if (!session) throw redirect("/login");
  if (!session.capabilities.includes("users:manage")) throw redirect("/");

  return { session };
}

export default function AdminUsers({ loaderData }: Route.ComponentProps) {
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [groups, setGroups] = useState<PermissionGroupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailCheck, setEmailCheck] = useState<{ accepted: boolean; message: string; cacheHit: boolean } | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [lastInvited, setLastInvited] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  useEffect(() => {
    let active = true;
    void Promise.all([usersControllerList(), permissionGroupsControllerList()]).then(([nextUsers, nextGroups]) => {
      if (!active) return;
      setUsers(nextUsers);
      setGroups(nextGroups);
      setGroupId((current) => current || nextGroups[0]?.id || "");
      setLoadError(false);
    }).catch(() => { if (active) setLoadError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);
  const searchTerm = search.trim().toLocaleLowerCase("pt-BR");
  const filteredUsers = users.filter((user) =>
    (statusFilter === "all" || accessStatus(user) === statusFilter) &&
    (!searchTerm || `${user.name} ${user.email}`.toLocaleLowerCase("pt-BR").includes(searchTerm)),
  );
  const columns: TableColumn<AdminUserDto>[] = [
    { id: "name", label: "Pessoa", cell: (user) => <div className={styles.person}><Avatar name={user.name} /><div><strong>{user.name}</strong><span className={styles.email}>{user.email}</span></div></div>, sortValue: (user) => user.name },
    { id: "group", label: "Grupo", cell: (user) => (
      <Select
        label={`Grupo de ${user.name}`}
        value={user.groupIds[0] ?? null}
        onValueChange={(value) => { if (value) void replaceGroup(user, value); }}
        options={groups.map((group) => ({ value: group.id, label: group.name }))}
        disabled={busyUserId === user.id || user.id === loaderData.session.userId}
      />
    ) },
    { id: "status", label: "Acesso", cell: (user) => <Badge tone={accessStatus(user) === "active" ? "success" : accessStatus(user) === "disabled" ? "danger" : "warning"}>{accessStatusLabel(user)}</Badge>, sortValue: accessStatusLabel },
  ];

  function resetForm() {
    setName("");
    setEmail("");
    setEmailCheck(null);
    setGroupId(groups[0]?.id ?? "");
  }

  async function invite() {
    if (!name.trim() || !email.trim() || !groupId) throw new Error("MISSING_FIELDS");
    const verified = await verifyEmail();
    if (!verified?.accepted) throw new Error("EMAIL_NOT_VERIFIED");
    const invited = await usersControllerInvite({
      id: userIdFactory.create(),
      name: name.trim(),
      email: email.trim(),
      groupId,
    });
    setUsers((current) => [invited, ...current]);
    setLastInvited(invited.email);
    resetForm();
  }

  async function verifyEmail() {
    if (!email.trim()) return null;
    setCheckingEmail(true);
    try {
      const response = await emailVerificationsControllerVerify({ email: email.trim() });
      const result = { accepted: response.accepted, message: response.message, cacheHit: response.cacheHit };
      setEmailCheck(result);
      return result;
    } catch {
      const result = { accepted: false, message: "Não foi possível verificar este e-mail agora.", cacheHit: false };
      setEmailCheck(result);
      return result;
    } finally {
      setCheckingEmail(false);
    }
  }

  async function replaceGroup(user: AdminUserDto, nextGroupId: string) {
    setBusyUserId(user.id);
    setActionError(null);
    try {
      const updated = await usersControllerPermissionGroup(user.id, { groupId: nextGroupId });
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch {
      setActionError(`Não foi possível alterar o grupo de ${user.name}.`);
    } finally {
      setBusyUserId(null);
    }
  }

  async function toggleAccess(user: AdminUserDto) {
    const active = Boolean(user.deactivatedAt);
    setBusyUserId(user.id);
    setActionError(null);
    try {
      const updated = await usersControllerAccess(user.id, { active });
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch {
      setActionError(`Não foi possível ${active ? "reativar" : "desativar"} ${user.name}.`);
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <PageFrame width="content">
      <PageHeader
        icon="user"
        eyebrow="Administração"
        title="Usuários"
        description="Controle quem acessa o sistema e quais permissões cada pessoa recebe."
        actions={<Button disabled={loading || groups.length === 0} onClick={() => setModalOpen(true)}>Convidar usuário</Button>}
      />

      {lastInvited && <p className={styles.feedback} role="status">Convite enviado para {lastInvited}.</p>}
      {actionError && <p className={styles.error} role="alert">{actionError}</p>}
      <CollectionToolbar
        search={<Input aria-label="Buscar usuários" placeholder="Buscar por nome ou e-mail" value={search} startAdornment={<Icon name="search" />} onChange={(event) => setSearch(event.target.value)} />}
        filters={<Select label="Filtrar usuários por acesso" value={statusFilter} options={[{ value: "all", label: "Todos os acessos" }, { value: "active", label: "Ativos" }, { value: "pending", label: "Convite enviado" }, { value: "disabled", label: "Desativados" }]} onValueChange={(value) => setStatusFilter(value ?? "all")} />}
        count={loading ? "Carregando usuários…" : loadError ? "Usuários indisponíveis" : `${filteredUsers.length} ${filteredUsers.length === 1 ? "usuário" : "usuários"}`}
      />

      <DataTable
        label="Usuários da organização"
        rows={filteredUsers}
        columns={columns}
        state={loading ? "loading" : loadError ? "error" : "ready"}
        onRetry={() => { setLoading(true); setReloadKey((value) => value + 1); }}
        rowKey={(user) => user.id}
        rowLabel={(user) => user.name}
        actions={(user) => (
          <Button
            variant="ghost"
            size="sm"
            loading={busyUserId === user.id}
            disabled={user.id === loaderData.session.userId && !user.deactivatedAt}
            onClick={() => void toggleAccess(user)}
          >
            {user.deactivatedAt ? "Reativar" : "Desativar"}
          </Button>
        )}
        emptyText="Nenhum usuário encontrado."
      />

      <ActionModal
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) resetForm(); }}
        title="Convidar usuário"
        confirmLabel="Enviar convite"
        errorText="Não foi possível enviar o convite. Confira os dados e tente novamente."
        onConfirm={invite}
      >
        <div className={styles.modalFields}>
          <Field>
            <Label>Nome</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
          </Field>
          <Field>
            <Label>E-mail</Label>
            <div className={styles.emailControl}>
              <Input
                type="email"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setEmailCheck(null); }}
                onBlur={() => { if (email.trim()) void verifyEmail(); }}
                autoComplete="off"
              />
              <Button type="button" variant="secondary" loading={checkingEmail} onClick={() => void verifyEmail()}>
                Verificar
              </Button>
            </div>
            {emailCheck && (
              <div className={styles.emailCheck}>
                <Badge tone={emailCheck.accepted ? "success" : "danger"}>{emailCheck.accepted ? "Verificado" : "Não confirmado"}</Badge>
                <span>{emailCheck.message}{emailCheck.cacheHit ? " Resultado salvo." : ""}</span>
              </div>
            )}
          </Field>
          <Field>
            <Label>Grupo de permissão</Label>
            <Select
              label="Grupo de permissão"
              value={groupId}
              onValueChange={(value) => setGroupId(value ?? "")}
              options={groups.map((group) => ({ value: group.id, label: group.name }))}
            />
          </Field>
        </div>
      </ActionModal>
    </PageFrame>
  );
}

function accessStatus(user: AdminUserDto): "active" | "pending" | "disabled" {
  if (user.deactivatedAt) return "disabled";
  return user.activatedAt ? "active" : "pending";
}

function accessStatusLabel(user: AdminUserDto): string {
  const status = accessStatus(user);
  if (status === "active") return "Ativo";
  if (status === "disabled") return "Desativado";
  return "Convite enviado";
}
