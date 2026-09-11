export const IDENTITY_ADMIN_GATEWAY = Symbol("IDENTITY_ADMIN_GATEWAY");

export interface IdentityAdminGateway {
  invite(email: string, name: string): Promise<string>;
  revoke(userId: string): Promise<void>;
}
