import { Link } from "react-router";
import type { Capability } from "@spark/core";
import { Icon, PageFrame, PageHeader, SettingsSection, type IconName } from "@spark/ui-web";
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
  { title: "Pessoas e acesso", areas: [
    { title: "Usuários", to: "/admin/users", icon: "user", description: "Convide pessoas e gerencie o acesso.", capability: "users:manage" },
    { title: "Times", to: "/admin/teams", icon: "team", description: "Organize as equipes de trabalho.", capability: "users:manage" },
    { title: "Grupos de permissões", to: "/admin/permission-groups", icon: "settings", description: "Defina o que cada grupo pode fazer.", capability: "permission_groups:manage" },
  ] },
  { title: "Canais e integrações", areas: [
    { title: "Integrações", to: "/integrations", icon: "bolt", description: "Conecte canais e serviços externos.", capability: "integrations:read" },
  ] },
  { title: "Dados", areas: [
    { title: "Campos personalizados", to: "/admin/data/custom-fields", icon: "file", description: "Adapte os dados dos seus cadastros.", capability: "settings:manage" },
    { title: "O que cada etapa exige", to: "/admin/data/stage-fields", icon: "briefcase", description: "Campos obrigatórios e importantes por funil e etapa.", capability: "pipelines:manage" },
    { title: "Auditoria", to: "/admin/audit-log", icon: "chart", description: "Consulte alterações de acesso e equipe.", capability: "audit_logs:read" },
  ] },
];

export async function clientLoader() {
  return { session: await requireAnyCapability(ADMIN_CAPABILITIES) };
}

export default function AdminHome({ loaderData }: Route.ComponentProps) {
  const allowed = (capability: Capability) => loaderData.session.capabilities.includes(capability);

  return <PageFrame>
    <PageHeader icon="grid" title="Início" />
    <div className={styles.sections}>{sections.map((section) => {
      const visible = section.areas.filter((area) => allowed(area.capability));
      if (visible.length === 0) return null;
      return <SettingsSection key={section.title} title={section.title}>
        {visible.map((area) => <Link key={area.to} to={area.to} className={styles.card}>
          <span className={styles.icon}><Icon name={area.icon} /></span>
          <span className={styles.copy}><strong>{area.title}</strong><span>{area.description}</span></span>
        </Link>)}
      </SettingsSection>;
    })}</div>
  </PageFrame>;
}
