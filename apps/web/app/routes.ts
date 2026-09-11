import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/auth-layout.tsx", [
    route("login", "routes/login.tsx"),
    route("forgot-password", "routes/forgot-password.tsx"),
    route("update-password", "routes/update-password.tsx"),
  ]),
  layout("routes/app-layout.tsx", [
    index("routes/contacts.tsx"),
    route("dashboard", "routes/dashboard.tsx"),
    route("inbox", "routes/inbox.tsx"),
    route("automations", "routes/automations.tsx"),
    route("automations/:automationId", "routes/automation-builder.tsx"),
    route("integrations", "routes/integrations.tsx"),
    route("contacts/import", "routes/contact-import.tsx"),
    route("contacts/:contactId", "routes/contact-detail.tsx"),
    route("companies", "routes/companies.tsx"),
    route("companies/:companyId", "routes/company-detail.tsx"),
    route("deals", "routes/deals.tsx"),
    route("deals/:dealId", "routes/deal-detail.tsx"),
    route("activities", "routes/activities.tsx"),
    route("security", "routes/security.tsx"),
    route("admin/users", "routes/admin-users.tsx"),
    route("admin/teams", "routes/admin-teams.tsx"),
    route("admin/permission-groups", "routes/admin-permission-groups.tsx"),
    route("admin/audit-log", "routes/admin-audit-log.tsx"),
  ]),
] satisfies RouteConfig;
