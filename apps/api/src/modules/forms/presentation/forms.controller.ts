import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { leadFormId } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { FormsService } from "../application/forms.service.js";
import { CreateLeadFormDto, LeadFormWriteResponseDto, PublicLeadFormDto, SubmitLeadFormDto, SubmitLeadFormResponseDto, UpdateLeadFormDto, UpdateLeadFormStatusDto } from "../dto/forms.dto.js";
@ApiTags("forms") @ApiBearerAuth() @UseGuards(SupabaseJwtGuard, CapabilityGuard) @Controller("v1/forms")
export class FormsController { constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly forms: FormsService) {}
  @Post() @RequireCapability("forms:write") @ApiCreatedResponse({ type: LeadFormWriteResponseDto }) async create(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: CreateLeadFormDto): Promise<LeadFormWriteResponseDto> { const user = await this.currentUser.execute(claims.sub); return this.forms.create(user.orgId, body) as Promise<LeadFormWriteResponseDto>; }
  @Patch(":id") @RequireCapability("forms:write") @ApiOkResponse({ type: LeadFormWriteResponseDto }) async update(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: UpdateLeadFormDto): Promise<LeadFormWriteResponseDto> { const user = await this.currentUser.execute(claims.sub); return this.forms.update(user.orgId, leadFormId.from(id), body) as Promise<LeadFormWriteResponseDto>; }
  @Patch(":id/status") @RequireCapability("forms:write") @ApiOkResponse({ type: LeadFormWriteResponseDto }) async status(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: UpdateLeadFormStatusDto): Promise<LeadFormWriteResponseDto> { const user = await this.currentUser.execute(claims.sub); return this.forms.publish(user.orgId, leadFormId.from(id), body.published) as Promise<LeadFormWriteResponseDto>; }
}
@ApiTags("public-forms") @Controller("v1/public/forms")
export class PublicFormsController { constructor(private readonly forms: FormsService) {}
  @Get(":publicKey") @ApiOkResponse({ type: PublicLeadFormDto }) async get(@Param("publicKey") publicKey: string): Promise<PublicLeadFormDto> { const form = await this.forms.publicForm(publicKey); return { title: form.title, description: form.description, fields: form.fields, submitLabel: form.submitLabel, successMessage: form.successMessage, publicKey: form.publicKey } as PublicLeadFormDto; }
  @Post(":publicKey/submissions") @ApiCreatedResponse({ type: SubmitLeadFormResponseDto }) submit(@Param("publicKey") publicKey: string, @Body() body: SubmitLeadFormDto): Promise<SubmitLeadFormResponseDto> { return this.forms.submit(publicKey, body) as Promise<SubmitLeadFormResponseDto>; }
}
