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

/** Called once per app, with the real JWT source (e.g. the Supabase Auth session). */
export function setSparkAuthTokenProvider(fn: () => string | null): void {
  getToken = fn;
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
  const token = getToken?.();
  const res = await instance.request<T>({
    ...config,
    headers: {
      ...config.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return res.data;
}
