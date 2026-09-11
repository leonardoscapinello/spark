import type { Capability } from "@spark/core";
import { redirect } from "react-router";
import { restoreSession, type AppSession } from "./auth.client";

const LANDING_ROUTES: ReadonlyArray<readonly [Capability, string]> = [
  ["contacts:read", "/"],
  ["companies:read", "/companies"],
  ["deals:read", "/deals"],
  ["activities:read", "/activities"],
  ["users:manage", "/admin/users"],
  ["permission_groups:manage", "/admin/permission-groups"],
  ["audit_logs:read", "/admin/audit-log"],
];

export async function requireCapability(capability: Capability): Promise<AppSession> {
  const session = await restoreSession();
  if (!session) throw redirect("/login");
  if (!session.capabilities.includes(capability)) throw redirect(firstAccessibleRoute(session));
  return session;
}

function firstAccessibleRoute(session: AppSession): string {
  return LANDING_ROUTES.find(([capability]) => session.capabilities.includes(capability))?.[1] ?? "/security";
}
