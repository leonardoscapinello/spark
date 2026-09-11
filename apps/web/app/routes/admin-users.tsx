import { useState } from "react";
import { redirect } from "react-router";
import type { Route } from "./+types/admin-users";
import { permissionGroupsControllerList, usersControllerAccess, usersControllerInvite, usersControllerList, usersControllerPermissionGroup, type AdminUserDto } from "@spark/api-client";
import { userId as userIdFactory } from "@spark/core";
import { ActionModal, Button, DataTable, Field, Input, Label, PageHeader, Select, type TableColumn } from "@spark/ui-web";
import { restoreSession } from "../lib/auth.client";
import styles from "./admin-users.module.css";

export async function clientLoader() {
  const session = await restoreSession();
  if (!session) throw redirect("/login");
  if (!session.capabilities.includes("users:manage")) throw redirect("/");

  const [users, groups] = await Promise.all([
    usersControllerList(),
    permissionGroupsControllerList(),
  ]);
  return { users, groups, session };
}

export default function AdminUsers({ loaderData }: Route.ComponentProps) {
  const [users, setUsers] = useState(loaderData.users);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [groupId, setGroupId] = useState(loaderData.groups[0]?.id ?? "");
  const [lastInvited, setLastInvited] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const columns: TableColumn<AdminUserDto>[] = [
    { id: "name", label: "Pessoa", cell: (user) => <div><strong>{user.name}</strong><span className={styles.email}>{user.email}</span></div>, sortValue: (user) => user.name },
    { id: "group", label: "Grupo", cell: (user) => (
      <Select
        label={`Grupo de ${user.name}`}
        value={user.groupIds[0] ?? null}
        onValueChange={(value) => { if (value) void replaceGroup(user, value); }}
        options={loaderData.groups.map((group) => ({ value: group.id, label: group.name }))}
        disabled={busyUserId === user.id || user.id === loaderData.session.userId}
      />
    ) },
    { id: "status", label: "Acesso", cell: (user) => <span className={styles.status} data-status={accessStatus(user)}>{accessStatusLabel(user)}</span>, sortValue: accessStatusLabel },
  ];

  function resetForm() {
    setName("");
    setEmail("");
    setGroupId(loaderData.groups[0]?.id ?? "");
  }

  async function invite() {
    if (!name.trim() || !email.trim() || !groupId) throw new Error("MISSING_FIELDS");
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
    <div className={styles.page}>
      <PageHeader
        eyebrow="Administração"
        title="Usuários"
        description="Controle quem acessa o sistema e quais permissões cada pessoa recebe."
        actions={<Button onClick={() => setModalOpen(true)}>Convidar usuário</Button>}
      />

      {lastInvited && <p className={styles.feedback} role="status">Convite enviado para {lastInvited}.</p>}
      {actionError && <p className={styles.error} role="alert">{actionError}</p>}

      <DataTable
        label="Usuários da organização"
        rows={users}
        columns={columns}
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
        emptyText="Nenhum usuário cadastrado."
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
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" />
          </Field>
          <Field>
            <Label>Grupo de permissão</Label>
            <Select
              label="Grupo de permissão"
              value={groupId}
              onValueChange={(value) => setGroupId(value ?? "")}
              options={loaderData.groups.map((group) => ({ value: group.id, label: group.name }))}
            />
          </Field>
        </div>
      </ActionModal>
    </div>
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
