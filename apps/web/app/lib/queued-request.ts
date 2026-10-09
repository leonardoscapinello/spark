/** O servidor continua validando o JWT; aqui só impedimos trocar o dono de uma escrita guardada. */
function identity(token: string): { sub: string; iss: string } | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const claims: unknown = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (!claims || typeof claims !== "object" || !("sub" in claims) || !("iss" in claims)) return null;
    return typeof claims.sub === "string" && typeof claims.iss === "string" ? { sub: claims.sub, iss: claims.iss } : null;
  } catch { return null; }
}

export function refreshQueuedAuthorization(request: Request, token: string | null): Request {
  const original = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  const before = original ? identity(original) : null;
  const after = token ? identity(token) : null;
  if (!token || !before || !after || before.sub !== after.sub || before.iss !== after.iss) return request.clone();
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return new Request(request, { headers });
}

export function retryQueuedResponse(status: number): boolean {
  return status === 401 || status === 408 || status === 429 || status >= 500;
}
