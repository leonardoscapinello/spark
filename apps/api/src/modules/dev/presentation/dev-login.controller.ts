import { Body, Controller, Post } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { SignJWT } from "jose";
import { ConfigService } from "@nestjs/config";
import { createDbClient, users, organizations } from "@spark/db";
import { eq } from "drizzle-orm";
import { orgId as orgIdFactory, userId as userIdFactory } from "@spark/core";

const DevLoginInputSchema = z.object({
  email: z.email(),
  nome: z.string().min(1).max(200).optional(),
});
class DevLoginInput extends createZodDto(DevLoginInputSchema) {}

/**
 * Login de desenvolvimento — SÓ existe quando NODE_ENV !== "production"
 * (a checagem real está em app.module.ts: o módulo inteiro não é
 * importado em produção, não é "existe mas nega"). Em produção, quem
 * emite o token é a Supabase Auth de verdade (docs/adr/0005) — isto
 * existe só porque não há projeto Supabase Cloud disponível neste estágio
 * de desenvolvimento local. Emite um JWT no MESMO formato e assinado com
 * o MESMO segredo que SupabaseJwtGuard verifica — o resto do caminho
 * (guard, resolução de usuário, RLS) é o caminho de produção de verdade,
 * só a EMISSÃO do token é simulada.
 */
@ApiExcludeController()
@Controller("v1/dev")
export class DevLoginController {
  constructor(private readonly config: ConfigService) {}

  @Post("login")
  async login(@Body() body: DevLoginInput): Promise<{ token: string; orgId: string; userId: string }> {
    const db = createDbClient(process.env.DATABASE_URL ?? "");

    const [existente] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);

    if (existente) {
      const token = await assinarToken(existente.supabaseUserId, this.config);
      return { token, orgId: existente.orgId, userId: existente.id };
    }

    const novoOrgId = orgIdFactory.novo();
    const novoUserId = userIdFactory.novo();
    const supabaseUserId = crypto.randomUUID();
    const slug = `dev-${body.email.split("@")[0]}-${novoOrgId.slice(0, 8)}`;

    await db.insert(organizations).values({ id: novoOrgId, nome: `Org de ${body.email}`, slug });
    await db.insert(users).values({
      id: novoUserId,
      orgId: novoOrgId,
      supabaseUserId,
      nome: body.nome ?? body.email.split("@")[0] ?? body.email,
      email: body.email,
    });

    const token = await assinarToken(supabaseUserId, this.config);
    return { token, orgId: novoOrgId, userId: novoUserId };
  }
}

async function assinarToken(supabaseUserId: string, config: ConfigService): Promise<string> {
  const secret = config.getOrThrow<string>("SUPABASE_JWT_SECRET");
  const chave = new TextEncoder().encode(secret);
  return new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(supabaseUserId)
    .setIssuedAt()
    .setExpirationTime("30d") // dev — sem UX de refresh token ainda
    .sign(chave);
}
