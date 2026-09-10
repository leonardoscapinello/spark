import { z } from "zod";

/**
 * Formato do JWT emitido pela Supabase Auth (docs/adr/0005). `sub` é o id
 * do usuário no espaço da Supabase Auth — diferente do nosso `users.id`
 * (UUID v7 próprio); a ligação entre os dois é `users.supabase_user_id`
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
