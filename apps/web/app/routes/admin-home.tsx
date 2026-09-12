import { Link } from "react-router";
import type { Capability } from "@spark/core";
import { Icon, PageHeader, type IconName } from "@spark/ui-web";
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
  { title: "Equipe e acesso", areas: [
    { title: "Usuários", to: "/admin/users", icon: "user", description: "Convide pessoas e gerencie o acesso.", capability: "users:manage" },
    { title: "Times", to: "/admin/teams", icon: "team", description: "Organize as equipes de trabalho.", capability: "users:manage" },
    { title: "Grupos de permissões", to: "/admin/permission-groups", icon: "settings", description: "Defina o que cada grupo pode fazer.", capability: "permission_groups:manage" },
  ] },
  { title: "Sistema", areas: [
    { title: "Integrações", to: "/integrations", icon: "bolt", description: "Conecte canais e serviços externos.", capability: "integrations:read" },
    { title: "Campos personalizados", to: "/settings", icon: "file", description: "Adapte os dados dos seus cadastros.", capability: "settings:manage" },
    { title: "Auditoria", to: "/admin/audit-log", icon: "chart", description: "Consulte alterações de acesso e equipe.", capability: "audit_logs:read" },
  ] },
];

export async function clientLoader() {
  return { session: await requireAnyCapability(ADMIN_CAPABILITIES) };
}

export default function AdminHome({ loaderData }: Route.ComponentProps) {
  const allowed = (capability: Capability) => loaderData.session.capabilities.includes(capability);

  return <div className={styles.page}>
    <div className={styles.pageHeader}><PageHeader icon="grid" title="Início" /></div>
    <div className={styles.sections}>{sections.map((section) => {
      const visible = section.areas.filter((area) => allowed(area.capability));
      if (visible.length === 0) return null;
      return <section key={section.title} className={styles.section} aria-label={section.title}>
        <h2>{section.title}</h2>
        <div className={styles.grid}>{visible.map((area) => <Link key={area.to} to={area.to} prefetch="intent" className={styles.card}>
          <span className={styles.icon}><Icon name={area.icon} /></span>
          <span className={styles.copy}><strong>{area.title}</strong><span>{area.description}</span></span>
        </Link>)}</div>
      </section>;
    })}</div>
  </div>;
}
