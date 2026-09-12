import { useState } from "react";
import { redirect } from "react-router";
import type { Route } from "./+types/admin-audit-log";
import { auditLogsControllerList, type AdminAuditLogDto } from "@spark/api-client";
import { CollectionToolbar, DataTable, Icon, Input, PageHeader, Select, type TableColumn } from "@spark/ui-web";
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
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const searchTerm = search.trim().toLocaleLowerCase("pt-BR");
  const filteredLogs = loaderData.logs.filter((entry) =>
    (actionFilter === "all" || entry.action === actionFilter) &&
    (!searchTerm || `${entry.actorName} ${entry.targetLabel} ${ACTION_LABELS[entry.action]} ${describeEntry(entry)}`.toLocaleLowerCase("pt-BR").includes(searchTerm)),
  );
  const actionOptions = [...new Set(loaderData.logs.map((entry) => entry.action))]
    .map((action) => ({ value: action, label: ACTION_LABELS[action] }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
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
      {loaderData.logs.length > 0 && <CollectionToolbar
        search={<Input aria-label="Buscar auditoria" placeholder="Buscar pessoa, registro ou ação" value={search} startAdornment={<Icon name="search" />} onChange={(event) => setSearch(event.target.value)} />}
        filters={<Select label="Filtrar auditoria por ação" value={actionFilter} options={[{ value: "all", label: "Todas as ações" }, ...actionOptions]} onValueChange={(value) => setActionFilter(value ?? "all")} />}
        count={`${filteredLogs.length} ${filteredLogs.length === 1 ? "registro" : "registros"}`}
      />}
      <DataTable
        label="Histórico de auditoria"
        rows={filteredLogs}
        columns={columns}
        rowKey={(entry) => entry.id}
        emptyText={loaderData.logs.length ? "Nenhum registro encontrado." : "Nenhuma alteração administrativa registrada."}
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
