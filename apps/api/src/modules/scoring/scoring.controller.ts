import { BadRequestException, Body, Controller, Get, Injectable, NotFoundException, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { sql, and, eq } from "drizzle-orm";
import { createAppDbClient, contacts, scoreModels, scorePolicies, scoreSignals, withOrgContext } from "@spark/db";
import { PublishScoreModelSchema, RecordScoreSignalSchema, ScoreModelSchema, evaluateScore, type OrgId, type UserId } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../auth/index.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
class PublishModelDto extends createZodDto(PublishScoreModelSchema) {}
class SignalDto extends createZodDto(RecordScoreSignalSchema) {}
class WriteResultDto extends createZodDto(z.object({ id: z.string(), status: z.string() })) {}
class PreviewDto extends createZodDto(z.object({ model: ScoreModelSchema, at: z.iso.datetime(), days: z.array(z.object({ signal: z.string(), day: z.iso.date(), count: z.number().int().nonnegative() })).max(25000) })) {}

@Injectable()
export class ScoringService {
  private readonly db = createAppDbClient();
  async publish(orgId: OrgId, userId: UserId, input: PublishModelDto) {
    return withOrgContext(this.db, orgId, async tx => {
      const [model] = await tx.insert(scoreModels).values({ orgId, scope: input.scope, definition: input.model, createdBy: userId }).returning();
      if (!model) throw new Error("Model could not be created.");
      // Candidate creation never silently changes the active model.
      return { id: model.id, status: "candidate" };
    });
  }
  async activate(orgId: OrgId, id: string) {
    if (!z.uuid().safeParse(id).success) throw new BadRequestException("Invalid model ID.");
    return withOrgContext(this.db, orgId, async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${orgId},0))`);
      const [model] = await tx.select().from(scoreModels).where(and(eq(scoreModels.id,id),eq(scoreModels.orgId,orgId))).limit(1);
      if (!model) throw new NotFoundException("Model not found.");
      ScoreModelSchema.parse(model.definition);
      const scopes = await tx.select().from(scorePolicies).where(eq(scorePolicies.orgId,orgId));
      if (scopes.length >= 32 && !scopes.some(policy => policy.scope === model.scope)) throw new BadRequestException("Maximum of 32 active score contexts.");
      await tx.insert(scorePolicies).values({ orgId, scope: model.scope, modelId: model.id }).onConflictDoUpdate({ target: [scorePolicies.orgId,scorePolicies.scope], set: { modelId: model.id } });
      await tx.execute(sql`INSERT INTO score_rebuilds(org_id) VALUES(${orgId}) ON CONFLICT(org_id) DO UPDATE SET cursor=NULL,requested_at=now()`);
      return { id, status: "rebuild_queued" };
    });
  }
  async signal(orgId: OrgId, input: SignalDto) {
    const occurredAt = new Date(input.occurredAt);
    if (occurredAt.getTime() > Date.now() || occurredAt.getTime() < Date.now()-365*86400000) throw new BadRequestException("Signal must be within the past 365 days.");
    return withOrgContext(this.db, orgId, async tx => {
      const [contact] = await tx.select({ id: contacts.id }).from(contacts).where(and(eq(contacts.id,input.contactId),eq(contacts.orgId,orgId))).limit(1);
      if (!contact) throw new NotFoundException("Contact not found.");
      const inserted = await tx.insert(scoreSignals).values({ orgId, contactId: contact.id, sourceKey: `api:${input.key}`, scope: input.scope, signal: input.signal, occurredAt }).onConflictDoNothing().returning();
      if (!inserted.length) {
        const [existing] = await tx.select().from(scoreSignals).where(and(eq(scoreSignals.orgId,orgId),eq(scoreSignals.sourceKey,`api:${input.key}`)));
        if (!existing || existing.contactId !== contact.id || existing.signal !== input.signal || existing.scope !== input.scope || existing.occurredAt.getTime() !== occurredAt.getTime()) throw new BadRequestException("Idempotency key already used for another signal.");
      }
      return { id: input.key, status: inserted.length ? "queued" : "already_recorded" };
    });
  }
  async models(orgId: OrgId) {
    return withOrgContext(this.db, orgId, tx => tx.execute(sql`SELECT m.id,m.scope,m.definition,m.created_at,(p.model_id=m.id) IS TRUE AS active FROM score_models m LEFT JOIN score_policies p ON p.org_id=m.org_id AND p.scope=m.scope WHERE m.org_id=${orgId} ORDER BY m.created_at DESC LIMIT 100`));
  }
}
@ApiTags("scoring") @ApiBearerAuth() @UseGuards(SupabaseJwtGuard,CapabilityGuard) @Controller("v1/scoring")
export class ScoringController {
  constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly scoring: ScoringService) {}
  @Post("models") @RequireCapability("settings:manage") @ApiCreatedResponse({ type: WriteResultDto })
  async publish(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() input: PublishModelDto) { const user = await this.currentUser.execute(claims.sub); return this.scoring.publish(user.orgId,user.id,input); }
  @Post("models/:id/activate") @RequireCapability("settings:manage") @ApiOkResponse({ type: WriteResultDto })
  async activate(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string) { const user = await this.currentUser.execute(claims.sub); return this.scoring.activate(user.orgId,id); }
  @Get("models") @RequireCapability("settings:manage")
  async models(@CurrentSupabaseUser() claims: SupabaseJwtClaims) { const user = await this.currentUser.execute(claims.sub); return this.scoring.models(user.orgId); }
  @Post("preview") @RequireCapability("settings:manage")
  preview(@Body() input: PreviewDto) { return evaluateScore(input.model,input.days,new Date(input.at)); }
  @Post("signals") @RequireCapability("contacts:write") @ApiCreatedResponse({ type: WriteResultDto })
  async signal(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() input: SignalDto) { const user = await this.currentUser.execute(claims.sub); return this.scoring.signal(user.orgId,input); }
}
