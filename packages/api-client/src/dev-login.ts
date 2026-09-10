/**
 * POST /v1/dev/login — escrito à mão porque o endpoint é
 * @ApiExcludeController (nunca aparece no openapi.json/gerado de
 * propósito: não existe em produção, ver
 * apps/api/src/modules/dev/dev.module.ts). NUNCA chamar isto fora de
 * apps/web em modo dev local — produção usa a Supabase Auth de verdade
 * (docs/adr/0005).
 */
import { sparkHttpClient } from "./http-client.js";

export interface DevLoginInput {
  email: string;
  nome?: string;
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
