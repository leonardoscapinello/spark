import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { SaveTagInputSchema, TagWriteResponseSchema, TagSchema, tagSlug } from "@spark/core";
import { createAppDbClient, withOrgContext, tags } from "@spark/db";
import { sql } from "drizzle-orm";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
class SaveTagDto extends createZodDto(SaveTagInputSchema) {}
class TagWriteResponseDto extends createZodDto(TagWriteResponseSchema) {}
@ApiTags("settings") @ApiBearerAuth() @UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("settings:manage") @Controller("v1/settings/tags")
export class TagsController {
  private readonly db = createAppDbClient();
  constructor(private readonly currentUser: GetCurrentUserUseCase) {}
  @Post() @ApiCreatedResponse({ type: TagWriteResponseDto })
  async save(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: SaveTagDto) {
    const user = await this.currentUser.execute(claims.sub);
    return withOrgContext(this.db, user.orgId, async (tx) => {
      const [clock] = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
      const [row] = await tx.insert(tags).values({ orgId: user.orgId, name: body.name, slug: tagSlug(body.name), color: body.color })
        .onConflictDoUpdate({ target: [tags.orgId, tags.slug], set: { name: body.name, color: body.color, archivedAt: null } }).returning();
      if (!row || !clock) throw new Error("Não foi possível salvar a etiqueta.");
      return { tag: TagSchema.parse({ ...row, createdAt: row.createdAt.toISOString(), archivedAt: row.archivedAt?.toISOString() ?? null }), txid: Number(clock.txid) };
    });
  }
}
