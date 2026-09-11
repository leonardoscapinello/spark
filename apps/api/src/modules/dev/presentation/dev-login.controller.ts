import { Body, Controller, Post } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { SignJWT } from "jose";
import { ConfigService } from "@nestjs/config";
import { createDbClient, users, organizations } from "@spark/db";
import { eq } from "drizzle-orm";
import { orgId as orgIdFactory, userId as userIdFactory } from "@spark/core";
import { PermissionGroupsRepository } from "../../identity/infrastructure/permission-groups.repository.js";

const DevLoginInputSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(200).optional(),
});
class DevLoginInput extends createZodDto(DevLoginInputSchema) {}

/**
 * Development login — ONLY exists when NODE_ENV !== "production" (the real
 * check is in app.module.ts: the whole module isn't imported in
 * production, this isn't "exists but denies"). In production, the real
 * Supabase Auth issues the token (docs/adr/0005) — this exists only
 * because there's no Supabase Cloud project available at this stage of
 * local development. It issues a JWT in the SAME format, signed with the
 * SAME secret that SupabaseJwtGuard verifies — the rest of the path
 * (guard, user resolution, RLS) is the real production path, only the
 * token's ISSUANCE is simulated.
 */
@ApiExcludeController()
@Controller("v1/dev")
export class DevLoginController {
  constructor(
    private readonly config: ConfigService,
    private readonly permissionGroups: PermissionGroupsRepository,
  ) {}

  @Post("login")
  async login(@Body() body: DevLoginInput): Promise<{ token: string; orgId: string; userId: string }> {
    const db = createDbClient(process.env.DATABASE_URL ?? "");

    const [existing] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);

    if (existing) {
      // an organization created before ADR-0029 existed never received a
      // single group — without this, that account stays denied on
      // everything forever, because existing-user login never used to go
      // through here (found by testing login on a real old dev account).
      const existingOrgId = orgIdFactory.from(existing.orgId);
      if (!(await this.permissionGroups.orgHasGroups(existingOrgId))) {
        const groups = await this.permissionGroups.seedDefaultGroups(existingOrgId);
        const owner = groups.find((g) => g.name === "Proprietário");
        if (owner) {
          await this.permissionGroups.assignGroup(userIdFactory.from(existing.id), owner.id);
        }
      }

      const token = await signToken(existing.supabaseUserId, this.config);
      return { token, orgId: existing.orgId, userId: existing.id };
    }

    const newOrgId = orgIdFactory.create();
    const newUserId = userIdFactory.create();
    const supabaseUserId = crypto.randomUUID();
    const slug = `dev-${body.email.split("@")[0]}-${newOrgId.slice(0, 8)}`;

    await db.insert(organizations).values({ id: newOrgId, name: `Org for ${body.email}`, slug });
    await db.insert(users).values({
      id: newUserId,
      orgId: newOrgId,
      supabaseUserId,
      name: body.name ?? body.email.split("@")[0] ?? body.email,
      email: body.email,
    });

    // every organization is born with the five default groups; whoever
    // creates the org is its Owner (docs/adr/0029).
    const groups = await this.permissionGroups.seedDefaultGroups(newOrgId);
    const owner = groups.find((g) => g.name === "Proprietário");
    if (owner) {
      await this.permissionGroups.assignGroup(newUserId, owner.id);
    }

    const token = await signToken(supabaseUserId, this.config);
    return { token, orgId: newOrgId, userId: newUserId };
  }
}

async function signToken(supabaseUserId: string, config: ConfigService): Promise<string> {
  const secret = config.getOrThrow<string>("SUPABASE_JWT_SECRET");
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(supabaseUserId)
    .setIssuedAt()
    .setExpirationTime("30d") // dev — no refresh-token UX yet
    .sign(key);
}
