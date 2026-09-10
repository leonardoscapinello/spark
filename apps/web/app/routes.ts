import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  layout("routes/app-layout.tsx", [
    index("routes/contacts.tsx"),
    route("contacts/:contactId", "routes/contact-detail.tsx"),
    route("deals", "routes/deals.tsx"),
  ]),
] satisfies RouteConfig;
