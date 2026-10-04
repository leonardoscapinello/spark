import { Link } from "react-router";
import type { Capability } from "@spark/core";
import { IconTile, PageFrame, PageHeader, SettingsSection, Surface, Text, type IconName } from "@spark/ui-web";
import type { Route } from "./+types/admin-home";
import { ADMIN_CAPABILITIES, requireAnyCapability } from "../lib/route-access.client";
import styles from "./admin-home.module.css";

interface AdminArea {
  title: string;
  to: string;
  icon: IconName;
  description: string;
  capability: Capability;
}

const sections: { title: string; areas: AdminArea[] }[] = [
  { title: "Atendimento", areas: [
    { title: "Catálogo de serviços", to: "/admin/service/catalog", icon: "folder", description: "Categorias de primeiro, segundo e terceiro nível.", capability: "settings:manage" },
    { title: "Status do atendimento", to: "/admin/service/statuses", icon: "list", description: "Estados, pausas e prazos de permanência.", capability: "settings:manage" },
    { title: "Impacto, urgência e prioridade", to: "/admin/service/priorities", icon: "alert", description: "Cadastre os níveis usados pela equipe.", capability: "settings:manage" },
    { title: "Matriz de prioridade", to: "/admin/service/matrix", icon: "grid", description: "Defina a prioridade de cada combinação.", capability: "settings:manage" },
    { title: "Políticas de SLA", to: "/admin/service/sla", icon: "clock", description: "Primeira resposta e atendimento total em horas úteis.", capability: "settings:manage" },
  ] },
  { title: "Pessoas e acesso", areas: [
    { title: "Usuários", to: "/admin/users", icon: "user", description: "Convide pessoas e gerencie o acesso.", capability: "users:manage" },
    { title: "Times", to: "/admin/teams", icon: "team", description: "Organize as equipes de trabalho.", capability: "users:manage" },
    { title: "Grupos de permissões", to: "/admin/permission-groups", icon: "settings", description: "Defina o que cada grupo pode fazer.", capability: "permission_groups:manage" },
  ] },
  { title: "Canais e integrações", areas: [
    { title: "Integrações", to: "/integrations", icon: "bolt", description: "Conecte canais e serviços externos.", capability: "integrations:read" },
  ] },
  { title: "CRM e dados compartilhados", areas: [
    { title: "Campos personalizados", to: "/admin/data/custom-fields", icon: "file", description: "Adapte os dados dos seus cadastros.", capability: "settings:manage" },
    { title: "Funis e etapas", to: "/admin/data/stage-fields", icon: "briefcase", description: "Selecione a etapa para configurar campos, transições e prazos.", capability: "pipelines:manage" },
    { title: "Auditoria", to: "/admin/audit-log", icon: "chart", description: "Consulte alterações de acesso e equipe.", capability: "audit_logs:read" },
  ] },
  { title: "Organização", areas: [
    { title: "Calendário útil e feriados", to: "/admin/calendar", icon: "calendar", description: "Expediente, intervalos e exceções usados nos prazos.", capability: "pipelines:manage" },
    { title: "Aparência", to: "/admin/appearance", icon: "image", description: "Personalize cores e tipografia da organização.", capability: "settings:manage" },
  ] },
];

export async function clientLoader() {
  return { session: await requireAnyCapability(ADMIN_CAPABILITIES) };
}

export default function AdminHome({ loaderData }: Route.ComponentProps) {
  const allowed = (capability: Capability) => loaderData.session.capabilities.includes(capability);

  return <PageFrame>
    <PageHeader eyebrow="Administração" title="Configurações" description="Organize os processos, os dados e o acesso da sua equipe." />
    <div className={styles.sections}>{sections.map((section) => {
      const visible = section.areas.filter((area) => allowed(area.capability));
      if (visible.length === 0) return null;
      return <SettingsSection key={section.title} title={section.title}>
        {visible.map((area) => <Surface key={area.to} as={Link} to={area.to} radius="bloco" interactive className={styles.card}>
          <IconTile icon={area.icon} />
          <span className={styles.copy}><Text weight="medium">{area.title}</Text><Text size="pequeno" tone="secondary">{area.description}</Text></span>
        </Surface>)}
      </SettingsSection>;
    })}</div>
  </PageFrame>;
}
