/**
 * dev-login session, client-only (the .client.ts suffix — never enters
 * the server bundle: localStorage doesn't exist in Node, and RR8 strips
 * .client.* files from the SSR build automatically).
 *
 * Real production login (Supabase Auth, httpOnly cookie session, read on
 * the server) is a bigger decision — cookie, CSRF, refresh — outside
 * Fase 0's scope (docs/arquitetura/fase-0.md, Bloco 7). This is
 * deliberately the simplest path that already proves the real
 * architecture (same guard, same JWT, same server-side RLS — only the
 * token's ISSUANCE is dev-only, see
 * apps/api/src/modules/dev/presentation/dev-login.controller.ts).
 */
import type { OrgId } from "@spark/core";
import { setSparkApiBaseUrl, setSparkAuthTokenProvider } from "@spark/api-client";

const SESSION_KEY = "spark_dev_session";

// import.meta.env.VITE_API_BASE_URL is empty in local dev — the default
// in packages/api-client/src/http-client.ts (http://localhost:3000) is
// already correct. Staging/production sets the env var at build time.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (API_BASE_URL) setSparkApiBaseUrl(API_BASE_URL);

interface Session {
  token: string;
  orgId: OrgId;
  userId: string;
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  setSparkAuthTokenProvider(getToken);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// runs once, on this module's first import (entry.client.tsx) — if a
// session from a previous visit already exists, the provider is already
// configured before any route loader runs.
setSparkAuthTokenProvider(getToken);
