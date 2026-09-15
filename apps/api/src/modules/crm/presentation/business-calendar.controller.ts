import { Body, Controller, Delete, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { holidayId } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { BusinessHourWriteResponseDto, HolidayWriteResponseDto, SaveBusinessHourDto, SaveHolidayDto } from "../dto/business-calendar.dto.js";
import { BusinessCalendarRepository } from "../infrastructure/business-calendar.repository.js";

@ApiTags("crm")
@Controller("v1/business-calendar")
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("pipelines:manage")
@ApiBearerAuth()
export class BusinessCalendarController {
  constructor(private readonly getCurrentUser: GetCurrentUserUseCase, private readonly calendar: BusinessCalendarRepository) {}
  @Post("hours") @ApiCreatedResponse({ type: BusinessHourWriteResponseDto })
  async saveHour(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: SaveBusinessHourDto) { const user = await this.getCurrentUser.execute(claims.sub); return this.calendar.saveBusinessHour(user.orgId, body); }
  @Post("holidays") @ApiCreatedResponse({ type: HolidayWriteResponseDto })
  async saveHoliday(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: SaveHolidayDto) { const user = await this.getCurrentUser.execute(claims.sub); return this.calendar.saveHoliday(user.orgId, body); }
  @Delete("holidays/:id") @ApiOkResponse({ type: HolidayWriteResponseDto })
  async removeHoliday(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string) { const user = await this.getCurrentUser.execute(claims.sub); return this.calendar.removeHoliday(user.orgId, holidayId.from(id)); }
}
