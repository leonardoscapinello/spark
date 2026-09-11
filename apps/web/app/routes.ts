import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/auth-layout.tsx", [
    route("login", "routes/login.tsx"),
    route("forgot-password", "routes/forgot-password.tsx"),
    route("update-password", "routes/update-password.tsx"),
  ]),
  layout("routes/app-layout.tsx", [
    index("routes/contacts.tsx"),
    route("contacts/:contactId", "routes/contact-detail.tsx"),
    route("deals", "routes/deals.tsx"),
    route("admin/users", "routes/admin-users.tsx"),
    route("admin/permission-groups", "routes/admin-permission-groups.tsx"),
    route("admin/audit-log", "routes/admin-audit-log.tsx"),
  ]),
] satisfies RouteConfig;
