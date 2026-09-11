/**
 * POST /v1/dev/login — hand-written because the endpoint is
 * @ApiExcludeController (deliberately never shows up in
 * openapi.json/the generated client: doesn't exist in production, see
 * apps/api/src/modules/dev/dev.module.ts). NEVER call this outside
 * apps/web in local dev mode — production uses real Supabase Auth
 * (docs/adr/0005).
 */
import { sparkHttpClient } from "./http-client.js";

export interface DevLoginInput {
  email: string;
  name?: string;
}

export interface DevLoginResponse {
  token: string;
  orgId: string;
  userId: string;
}

export function devLogin(input: DevLoginInput): Promise<DevLoginResponse> {
  return sparkHttpClient<DevLoginResponse>({
    url: "/v1/dev/login",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: input,
  });
}
