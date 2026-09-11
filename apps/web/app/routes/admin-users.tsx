import { useMemo, useState } from "react";
import { redirect } from "react-router";
import type { Route } from "./+types/admin-users";
import { permissionGroupsControllerList, usersControllerInvite, usersControllerList, type AdminUserDto } from "@spark/api-client";
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
  return { users, groups };
}

export default function AdminUsers({ loaderData }: Route.ComponentProps) {
  const [users, setUsers] = useState(loaderData.users);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [groupId, setGroupId] = useState(loaderData.groups[0]?.id ?? "");
  const [lastInvited, setLastInvited] = useState<string | null>(null);
  const groupNames = useMemo(
    () => new Map(loaderData.groups.map((group) => [group.id, group.name])),
    [loaderData.groups],
  );
  const columns = useMemo<TableColumn<AdminUserDto>[]>(() => [
    { id: "name", label: "Pessoa", cell: (user) => <div><strong>{user.name}</strong><span className={styles.email}>{user.email}</span></div>, sortValue: (user) => user.name },
    { id: "group", label: "Grupo", cell: (user) => user.groupIds.map((id) => groupNames.get(id) ?? "Grupo removido").join(", ") },
    { id: "status", label: "Acesso", cell: (user) => <span className={styles.status} data-status={accessStatus(user)}>{accessStatusLabel(user)}</span>, sortValue: accessStatusLabel },
  ], [groupNames]);

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

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Administração"
        title="Usuários"
        description="Controle quem acessa o sistema e quais permissões cada pessoa recebe."
        actions={<Button onClick={() => setModalOpen(true)}>Convidar usuário</Button>}
      />

      {lastInvited && <p className={styles.feedback} role="status">Convite enviado para {lastInvited}.</p>}

      <DataTable
        label="Usuários da organização"
        rows={users}
        columns={columns}
        rowKey={(user) => user.id}
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
