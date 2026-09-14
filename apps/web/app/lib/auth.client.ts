import type { Capability, OrgId } from "@spark/core";
import { meControllerMe, setSparkApiBaseUrl, setSparkAuthTokenProvider } from "@spark/api-client";
import { getImplicitRecoveryClient, getSupabaseClient } from "./supabase.client";
import type { SupabaseClient } from "@supabase/supabase-js";

const PROFILE_KEY = "leonardo_app_profile";

// import.meta.env.VITE_API_BASE_URL is empty in local dev — the default
// in packages/api-client/src/http-client.ts (http://localhost:3000) is
// already correct. Staging/production sets the env var at build time.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (API_BASE_URL) setSparkApiBaseUrl(API_BASE_URL);

export interface AppSession {
  orgId: OrgId;
  userId: string;
  capabilities: Capability[];
  name?: string;
  avatarUrl?: string | null;
}

export type AuthFlowErrorCode = "INVALID_CREDENTIALS" | "AUTH_UNAVAILABLE" | "ACCOUNT_NOT_PROVISIONED" | "MFA_REQUIRED" | "MFA_INVALID";

export class AuthFlowError extends Error {
  constructor(readonly code: AuthFlowErrorCode) {
    super(code);
    this.name = "AuthFlowError";
  }
}

export interface MfaStatus {
  currentLevel: string | null;
  factors: Array<{ id: string; name: string; createdAt: string }>;
}

export interface MfaEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

export interface AuthSessionDetails {
  email: string;
  lastSignInAt: string | null;
  expiresAt: string | null;
}

let accessToken: string | null = null;
let listening = false;
let restoringSession: Promise<AppSession | null> | null = null;

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
  const profile = { orgId: user.orgId as OrgId, userId: user.id, capabilities: user.capabilities, ...(user.name ? { name: user.name } : {}), ...(user.avatarUrl !== undefined ? { avatarUrl: user.avatarUrl } : {}) };
  saveProfile(profile);
  return profile;
}

export async function refreshSessionProfile(): Promise<AppSession | null> {
  if (!accessToken) return null;
  try { return await resolveAppSession(); }
  catch { return null; }
}

export function getSession(): AppSession | null {
  return accessToken ? readProfile() : null;
}

export function getToken(): string | null {
  return accessToken;
}

/**
 * Token válido agora — renovado se expirou. É o que a fila de envio do
 * service worker pede antes de repetir uma escrita guardada (app/sw.ts):
 * o Authorization gravado na hora do enfileiramento pode ter vencido
 * enquanto a rede estava fora. getSession() do supabase-js renova sozinho.
 */
export async function freshToken(): Promise<string | null> {
  const { data } = await getSupabaseClient().auth.getSession();
  accessToken = data.session?.access_token ?? accessToken;
  return accessToken;
}

export function restoreSession(): Promise<AppSession | null> {
  listenForTokenRotation();
  const activeProfile = getSession();
  if (activeProfile) return Promise.resolve(activeProfile);
  restoringSession ??= loadSession().finally(() => { restoringSession = null; });
  return restoringSession;
}

async function loadSession(): Promise<AppSession | null> {
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

export async function signIn(email: string, password: string, totpCode?: string): Promise<AppSession> {
  listenForTokenRotation();
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (error) throw new AuthFlowError(error.code === "invalid_credentials" ? "INVALID_CREDENTIALS" : "AUTH_UNAVAILABLE");
  if (!data.session) throw new AuthFlowError("AUTH_UNAVAILABLE");

  accessToken = data.session.access_token;
  const { data: assurance, error: assuranceError } = await getSupabaseClient().auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) {
    await signOut();
    throw new AuthFlowError("AUTH_UNAVAILABLE");
  }

  if (assurance.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
    const { data: factors, error: factorsError } = await getSupabaseClient().auth.mfa.listFactors();
    const factor = factors?.totp[0];
    if (factorsError || !factor) {
      await signOut();
      throw new AuthFlowError("AUTH_UNAVAILABLE");
    }
    if (!totpCode) throw new AuthFlowError("MFA_REQUIRED");

    const { data: verified, error: verifyError } = await getSupabaseClient().auth.mfa.challengeAndVerify({ factorId: factor.id, code: totpCode });
    if (verifyError || !verified) throw new AuthFlowError("MFA_INVALID");
    accessToken = verified.access_token;
  }

  try {
    return await resolveAppSession();
  } catch {
    await signOut();
    throw new AuthFlowError("ACCOUNT_NOT_PROVISIONED");
  }
}

export async function getMfaStatus(): Promise<MfaStatus> {
  const client = getSupabaseClient();
  const [{ data: factors, error: factorsError }, { data: assurance, error: assuranceError }] = await Promise.all([
    client.auth.mfa.listFactors(),
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (factorsError || assuranceError || !factors || !assurance) throw new Error("MFA_STATUS_FAILED");
  return {
    currentLevel: assurance.currentLevel,
    factors: factors.totp.map((factor) => ({
      id: factor.id,
      name: factor.friendly_name ?? "Aplicativo autenticador",
      createdAt: factor.created_at,
    })),
  };
}

export async function getAuthSessionDetails(): Promise<AuthSessionDetails> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  const session = data.session;
  if (error || !session) throw new Error("SESSION_DETAILS_FAILED");

  return {
    email: session.user.email ?? "",
    lastSignInAt: session.user.last_sign_in_at ?? null,
    expiresAt: session.expires_at ? new Date(session.expires_at * 1_000).toISOString() : null,
  };
}

export async function beginMfaEnrollment(): Promise<MfaEnrollment> {
  const client = getSupabaseClient();
  const { data: listed } = await client.auth.mfa.listFactors();
  await Promise.all((listed?.all ?? []).filter((factor) => factor.factor_type === "totp" && factor.status === "unverified").map((factor) => client.auth.mfa.unenroll({ factorId: factor.id })));

  const { data, error } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Leonardo Scapinello" });
  if (error || !data) throw new Error("MFA_ENROLL_FAILED");
  return {
    factorId: data.id,
    qrCode: `data:image/svg+xml;utf8,${encodeURIComponent(data.totp.qr_code)}`,
    secret: data.totp.secret,
  };
}

export async function verifyMfaEnrollment(factorId: string, code: string): Promise<void> {
  const { data, error } = await getSupabaseClient().auth.mfa.challengeAndVerify({ factorId, code });
  if (error || !data) throw new Error("MFA_VERIFY_FAILED");
  accessToken = data.access_token;
}

export async function removeMfaFactor(factorId: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.mfa.unenroll({ factorId });
  if (error) throw new Error("MFA_UNENROLL_FAILED");
}

export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}/update-password`;
  // Recovery emails must work even when the request and the email are opened in different browsers.
  const { error } = await getImplicitRecoveryClient().auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error("RESET_REQUEST_FAILED");
}

export async function updatePassword(password: string): Promise<void> {
  const provider = await passwordRecoveryProvider();
  if (!provider) throw new Error("PASSWORD_RECOVERY_SESSION_MISSING");
  const { error } = await provider.auth.updateUser({ password });
  if (error) throw new Error("PASSWORD_UPDATE_FAILED");
  await provider.auth.signOut({ scope: "local" });
}

export async function hasPasswordRecoverySession(): Promise<boolean> {
  return Boolean(await passwordRecoveryProvider());
}

async function passwordRecoveryProvider(): Promise<SupabaseClient | null> {
  const recovery = getImplicitRecoveryClient();
  const { data: implicit } = await recovery.auth.getSession();
  const provider = implicit.session ? recovery : getSupabaseClient();
  const { data: session, error: sessionError } = await provider.auth.getSession();
  return sessionError || !session.session ? null : provider;
}

export async function signOut(): Promise<void> {
  accessToken = null;
  clearProfile();
  await getSupabaseClient().auth.signOut({ scope: "local" });
}

export async function signOutOtherSessions(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut({ scope: "others" });
  if (error) throw new Error("SIGN_OUT_OTHERS_FAILED");
}

export async function signOutEverywhere(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut({ scope: "global" });
  accessToken = null;
  clearProfile();
  if (error) throw new Error("SIGN_OUT_GLOBAL_FAILED");
}

setSparkAuthTokenProvider(getToken);
