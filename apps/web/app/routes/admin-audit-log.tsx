import { redirect } from "react-router";
import type { Route } from "./+types/admin-audit-log";
import { auditLogsControllerList, type AdminAuditLogDto } from "@spark/api-client";
import { DataTable, PageHeader, type TableColumn } from "@spark/ui-web";
import { restoreSession } from "../lib/auth.client";
import styles from "./admin-audit-log.module.css";

const ACTION_LABELS: Record<AdminAuditLogDto["action"], string> = {
  "permission_group.created": "Criou grupo",
  "permission_group.updated": "Alterou grupo",
  "permission_group.user_assigned": "Adicionou usuário ao grupo",
  "user.invited": "Convidou usuário",
  "user.owner_bootstrapped": "Configurou proprietário",
  "user.access_updated": "Alterou acesso",
  "user.permission_group_replaced": "Trocou grupo do usuário",
  "team.created": "Criou time",
  "team.updated": "Alterou time",
  "team.members_replaced": "Alterou membros do time",
  "team.archived": "Arquivou time",
  "team.restored": "Restaurou time",
};

export async function clientLoader() {
  const session = await restoreSession();
  if (!session) throw redirect("/login");
  if (!session.capabilities.includes("audit_logs:read")) throw redirect("/");
  return { logs: await auditLogsControllerList() };
}

export default function AdminAuditLog({ loaderData }: Route.ComponentProps) {
  const columns: TableColumn<AdminAuditLogDto>[] = [
    {
      id: "date",
      label: "Data e hora",
      cell: (entry) => formatDate(entry.createdAt),
      sortValue: (entry) => entry.createdAt,
    },
    { id: "actor", label: "Responsável", cell: (entry) => entry.actorName, sortValue: (entry) => entry.actorName },
    { id: "action", label: "Ação", cell: (entry) => ACTION_LABELS[entry.action], sortValue: (entry) => ACTION_LABELS[entry.action] },
    { id: "target", label: "Registro", cell: (entry) => entry.targetLabel, sortValue: (entry) => entry.targetLabel },
    { id: "details", label: "Detalhes", cell: describeEntry },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Administração"
        title="Auditoria"
        description="Acompanhe alterações de acesso, usuários, times e grupos de permissão."
      />
      <DataTable
        label="Histórico de auditoria"
        rows={loaderData.logs}
        columns={columns}
        rowKey={(entry) => entry.id}
        emptyText="Nenhuma alteração administrativa registrada."
      />
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function describeEntry(entry: AdminAuditLogDto): string {
  if (entry.action === "user.access_updated") return entry.data?.active ? "Acesso reativado" : "Acesso desativado";
  if (entry.action === "user.invited" && typeof entry.data?.email === "string") return entry.data.email;
  return "—";
}
