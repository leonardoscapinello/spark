/**
 * orval's mutator — every generated request goes through here. A single
 * place for the base URL, the auth header, and error handling
 * (docs/adr/0004, 0026).
 *
 * Base URL and token are configured via setter, never read straight from
 * `process.env` in the module — this runs in four targets (web, desktop,
 * mobile, and Node tests), and `process.env` doesn't exist the same way
 * in a browser bundle. Each app calls the setters once, at startup.
 */
import axios, { type AxiosRequestConfig } from "axios";

const instance = axios.create({ baseURL: "http://localhost:3000" });

let getToken: (() => string | null) | undefined;
let refreshToken: (() => Promise<string | null>) | undefined;
let refreshInFlight: Promise<string | null> | null = null;

/** Called once per app, with the real JWT source (e.g. the Supabase Auth session). */
export function setSparkAuthTokenProvider(fn: () => string | null): void {
  getToken = fn;
}

/** Renovação configurada pelo app dono da sessão (Supabase no web). */
export function setSparkAuthTokenRefreshProvider(fn: () => Promise<string | null>): void {
  refreshToken = fn;
}

/** Uma renovação compartilhada: todas as shapes podem receber 401 juntas. */
export function refreshSparkAuthToken(): Promise<string | null> {
  if (!refreshToken) return Promise.resolve(getToken?.() ?? null);
  refreshInFlight ??= refreshToken().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

/** Called once per app — already correct in local dev (localhost:3000). */
export function setSparkApiBaseUrl(baseUrl: string): void {
  instance.defaults.baseURL = baseUrl;
}

/**
 * Getters — packages/data uses these to build the shape proxy's URL
 * (`${baseUrl}/v1/shapes/:table`) and Electric's ShapeStream auth header,
 * without duplicating the configuration the app already did via
 * setSparkApiBaseUrl/setSparkAuthTokenProvider (docs/adr/0018).
 */
export function getSparkApiBaseUrl(): string {
  return instance.defaults.baseURL ?? "http://localhost:3000";
}

export function getSparkAuthToken(): string | null {
  return getToken?.() ?? null;
}

export async function sparkHttpClient<T>(config: AxiosRequestConfig): Promise<T> {
  const request = (token: string | null | undefined) => instance.request<T>({
    ...config,
    headers: { ...config.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  try {
    return (await request(getToken?.())).data;
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 401 || !refreshToken) throw error;
    const renewed = await refreshSparkAuthToken();
    if (!renewed) throw error;
    return (await request(renewed)).data;
  }
}
