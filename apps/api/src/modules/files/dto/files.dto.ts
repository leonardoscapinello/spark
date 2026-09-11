import { createZodDto } from "nestjs-zod";
import { CreateFileUploadInputSchema, FileDownloadResponseSchema, FileUploadResponseSchema, FileWriteResponseSchema } from "@spark/core";
export class CreateFileUploadDto extends createZodDto(CreateFileUploadInputSchema) {}
export class FileUploadResponseDto extends createZodDto(FileUploadResponseSchema) {}
export class FileWriteResponseDto extends createZodDto(FileWriteResponseSchema) {}
export class FileDownloadResponseDto extends createZodDto(FileDownloadResponseSchema) {}
