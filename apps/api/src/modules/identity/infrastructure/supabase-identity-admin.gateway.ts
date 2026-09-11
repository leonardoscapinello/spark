import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { IdentityAdminGateway } from "../application/identity-admin.gateway.js";

@Injectable()
export class SupabaseIdentityAdminGateway implements IdentityAdminGateway {
  private client?: SupabaseClient;

  constructor(private readonly config: ConfigService) {}

  async invite(email: string, name: string): Promise<string> {
    const { data, error } = await this.getClient().auth.admin.inviteUserByEmail(email, {
      data: { name },
      redirectTo: `${this.config.getOrThrow<string>("WEB_ORIGIN")}/update-password`,
    });
    if (error || !data.user) throw new Error("IDENTITY_INVITE_FAILED");
    return data.user.id;
  }

  async revoke(userId: string): Promise<void> {
    await this.getClient().auth.admin.deleteUser(userId);
  }

  private getClient(): SupabaseClient {
    this.client ??= createClient(
      this.config.getOrThrow<string>("SUPABASE_URL"),
      this.config.getOrThrow<string>("SUPABASE_SECRET_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    return this.client;
  }
}
