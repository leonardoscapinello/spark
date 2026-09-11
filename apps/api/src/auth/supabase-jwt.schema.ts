import { z } from "zod";

/**
 * Shape of the JWT issued by Supabase Auth (docs/adr/0005). `sub` is the
 * user's id in Supabase Auth's own space — different from our `users.id`
 * (our own UUID v7); the link between the two is `users.supabase_user_id`
 * (packages/core/src/schema/user.ts, migration 0001).
 */
export const SupabaseJwtClaimsSchema = z.object({
  sub: z.uuid(),
  email: z.email().optional(),
  role: z.string().optional(),
  aud: z.union([z.string(), z.array(z.string())]).optional(),
  exp: z.number(),
  iat: z.number(),
});

export type SupabaseJwtClaims = z.infer<typeof SupabaseJwtClaimsSchema>;
