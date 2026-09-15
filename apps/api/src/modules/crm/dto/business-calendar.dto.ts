import { createZodDto } from "nestjs-zod";
import { BusinessHourWriteResponseSchema, HolidayWriteResponseSchema, SaveBusinessHourInputSchema, SaveHolidayInputSchema } from "@spark/core";

export class SaveBusinessHourDto extends createZodDto(SaveBusinessHourInputSchema) {}
export class BusinessHourWriteResponseDto extends createZodDto(BusinessHourWriteResponseSchema) {}
export class SaveHolidayDto extends createZodDto(SaveHolidayInputSchema) {}
export class HolidayWriteResponseDto extends createZodDto(HolidayWriteResponseSchema) {}
