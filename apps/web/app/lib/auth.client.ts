import type { OrgId } from "@spark/core";
import { meControllerMe, setSparkApiBaseUrl, setSparkAuthTokenProvider } from "@spark/api-client";
import { getSupabaseClient } from "./supabase.client";

const PROFILE_KEY = "leonardo_app_profile";

// import.meta.env.VITE_API_BASE_URL is empty in local dev — the default
// in packages/api-client/src/http-client.ts (http://localhost:3000) is
// already correct. Staging/production sets the env var at build time.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (API_BASE_URL) setSparkApiBaseUrl(API_BASE_URL);

export interface AppSession {
  orgId: OrgId;
  userId: string;
}

let accessToken: string | null = null;
let listening = false;

function readProfile(): AppSession | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as AppSession) : null;
  } catch {
    return null;
  }
}

function saveProfile(profile: AppSession): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function clearProfile(): void {
  localStorage.removeItem(PROFILE_KEY);
}

function listenForTokenRotation(): void {
  if (listening) return;
  listening = true;
  getSupabaseClient().auth.onAuthStateChange((_event, session) => {
    accessToken = session?.access_token ?? null;
    if (!session) clearProfile();
  });
}

async function resolveAppSession(): Promise<AppSession> {
  const user = await meControllerMe();
  const profile = { orgId: user.orgId as OrgId, userId: user.id };
  saveProfile(profile);
  return profile;
}

export function getSession(): AppSession | null {
  return accessToken ? readProfile() : null;
}

export function getToken(): string | null {
  return accessToken;
}

export async function restoreSession(): Promise<AppSession | null> {
  listenForTokenRotation();
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error || !data.session) {
    accessToken = null;
    clearProfile();
    return null;
  }

  accessToken = data.session.access_token;
  try {
    return await resolveAppSession();
  } catch {
    await signOut();
    return null;
  }
}

export async function signIn(email: string, password: string): Promise<AppSession> {
  listenForTokenRotation();
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error("INVALID_CREDENTIALS");

  accessToken = data.session.access_token;
  try {
    return await resolveAppSession();
  } catch {
    await signOut();
    throw new Error("ACCOUNT_NOT_PROVISIONED");
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}/update-password`;
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error("RESET_REQUEST_FAILED");
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.updateUser({ password });
  if (error) throw new Error("PASSWORD_UPDATE_FAILED");
}

export async function signOut(): Promise<void> {
  accessToken = null;
  clearProfile();
  await getSupabaseClient().auth.signOut({ scope: "local" });
}

setSparkAuthTokenProvider(getToken);
