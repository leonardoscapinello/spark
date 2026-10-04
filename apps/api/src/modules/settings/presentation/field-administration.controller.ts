import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { SaveCustomFieldGroupSchema, CustomFieldGroupWriteResponseSchema, UpdateCustomFieldMetadataSchema, CustomFieldWriteResponseSchema, WriteCustomFieldValueSchema, CustomFieldValueWriteResponseSchema } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { FieldAdministrationRepository } from "../infrastructure/field-administration.repository.js";
class SaveGroupDto extends createZodDto(SaveCustomFieldGroupSchema) {}
class GroupResponseDto extends createZodDto(CustomFieldGroupWriteResponseSchema) {}
class MetadataDto extends createZodDto(UpdateCustomFieldMetadataSchema) {}
class FieldResponseDto extends createZodDto(CustomFieldWriteResponseSchema) {}
class FieldValueDto extends createZodDto(WriteCustomFieldValueSchema) {}
class ValueResponseDto extends createZodDto(CustomFieldValueWriteResponseSchema) {}
@ApiTags("field-administration") @ApiBearerAuth() @UseGuards(SupabaseJwtGuard,CapabilityGuard) @RequireCapability("settings:manage") @Controller("v1/field-administration")
export class FieldAdministrationController {
  constructor(private readonly currentUser:GetCurrentUserUseCase,private readonly fields:FieldAdministrationRepository) {}
  @Post("groups") @ApiOkResponse({type:GroupResponseDto})
  async saveGroup(@CurrentSupabaseUser() claims:SupabaseJwtClaims,@Body() body:SaveGroupDto) { const user=await this.currentUser.execute(claims.sub); return this.fields.saveGroup(user.orgId,user.id,body); }
  @Patch("fields/:id") @ApiOkResponse({type:FieldResponseDto})
  async metadata(@CurrentSupabaseUser() claims:SupabaseJwtClaims,@Param("id") id:string,@Body() body:MetadataDto) { const user=await this.currentUser.execute(claims.sub); return this.fields.updateMetadata(user.orgId,user.id,id,body); }
  @Post("values/contact/:id") @RequireCapability("contacts:write") @ApiOkResponse({type:ValueResponseDto})
  async writeContact(@CurrentSupabaseUser() claims:SupabaseJwtClaims,@Param("id") id:string,@Body() body:FieldValueDto) { const user=await this.currentUser.execute(claims.sub); return this.fields.writeValue(user.orgId,user.id,"contact",id,body); }
  @Post("values/company/:id") @RequireCapability("companies:write") @ApiOkResponse({type:ValueResponseDto})
  async writeCompany(@CurrentSupabaseUser() claims:SupabaseJwtClaims,@Param("id") id:string,@Body() body:FieldValueDto) { const user=await this.currentUser.execute(claims.sub); return this.fields.writeValue(user.orgId,user.id,"company",id,body); }
  @Post("values/deal/:id") @RequireCapability("deals:write") @ApiOkResponse({type:ValueResponseDto})
  async writeDeal(@CurrentSupabaseUser() claims:SupabaseJwtClaims,@Param("id") id:string,@Body() body:FieldValueDto) { const user=await this.currentUser.execute(claims.sub); return this.fields.writeValue(user.orgId,user.id,"deal",id,body); }
  @Post("values/conversation/:id") @RequireCapability("inbox:write") @ApiOkResponse({type:ValueResponseDto})
  async writeConversation(@CurrentSupabaseUser() claims:SupabaseJwtClaims,@Param("id") id:string,@Body() body:FieldValueDto) { const user=await this.currentUser.execute(claims.sub); return this.fields.writeValue(user.orgId,user.id,"conversation",id,body); }
  @Post("values/activity/:id") @RequireCapability("activities:write") @ApiOkResponse({type:ValueResponseDto})
  async writeActivity(@CurrentSupabaseUser() claims:SupabaseJwtClaims,@Param("id") id:string,@Body() body:FieldValueDto) { const user=await this.currentUser.execute(claims.sub); return this.fields.writeValue(user.orgId,user.id,"activity",id,body); }
  @Post("values/user/:id") @RequireCapability("users:manage") @ApiOkResponse({type:ValueResponseDto})
  async writeUser(@CurrentSupabaseUser() claims:SupabaseJwtClaims,@Param("id") id:string,@Body() body:FieldValueDto) { const user=await this.currentUser.execute(claims.sub); return this.fields.writeValue(user.orgId,user.id,"user",id,body); }
  @Post("values/campaign/:id") @RequireCapability("campaigns:write") @ApiOkResponse({type:ValueResponseDto})
  async writeCampaign(@CurrentSupabaseUser() claims:SupabaseJwtClaims,@Param("id") id:string,@Body() body:FieldValueDto) { const user=await this.currentUser.execute(claims.sub); return this.fields.writeValue(user.orgId,user.id,"campaign",id,body); }
  @Post("values/service_cycle/:id") @RequireCapability("inbox:write") @ApiOkResponse({type:ValueResponseDto})
  async writeCycle(@CurrentSupabaseUser() claims:SupabaseJwtClaims,@Param("id") id:string,@Body() body:FieldValueDto) { const user=await this.currentUser.execute(claims.sub); return this.fields.writeValue(user.orgId,user.id,"service_cycle",id,body); }
}
