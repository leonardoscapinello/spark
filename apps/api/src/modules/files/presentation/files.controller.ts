import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { fileId } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CompleteFileUploadUseCase } from "../application/complete-file-upload.usecase.js";
import { CreateFileUploadUseCase } from "../application/create-file-upload.usecase.js";
import { DeleteFileUseCase } from "../application/delete-file.usecase.js";
import { GetFileDownloadUseCase } from "../application/get-file-download.usecase.js";
import { CreateFileUploadDto, FileDownloadResponseDto, FileUploadResponseDto, FileWriteResponseDto } from "../dto/files.dto.js";
@ApiTags("files") @ApiBearerAuth() @UseGuards(SupabaseJwtGuard, CapabilityGuard) @Controller("v1/files")
export class FilesController {
  constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly createUpload: CreateFileUploadUseCase, private readonly completeUpload: CompleteFileUploadUseCase, private readonly getDownload: GetFileDownloadUseCase, private readonly deleteFile: DeleteFileUseCase) {}
  @Post("uploads") @RequireCapability("files:write") @ApiCreatedResponse({ type: FileUploadResponseDto }) async upload(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: CreateFileUploadDto): Promise<FileUploadResponseDto> { const user = await this.currentUser.execute(claims.sub); return this.createUpload.execute(user.orgId, user.id, body) as Promise<FileUploadResponseDto>; }
  @Post(":id/complete") @RequireCapability("files:write") @ApiOkResponse({ type: FileWriteResponseDto }) async complete(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string): Promise<FileWriteResponseDto> { const user = await this.currentUser.execute(claims.sub); return this.completeUpload.execute(user.orgId, user.id, fileId.from(id)) as Promise<FileWriteResponseDto>; }
  @Get(":id/download") @RequireCapability("files:read") @ApiOkResponse({ type: FileDownloadResponseDto }) async download(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string): Promise<FileDownloadResponseDto> { const user = await this.currentUser.execute(claims.sub); return this.getDownload.execute(user.orgId, fileId.from(id)) as Promise<FileDownloadResponseDto>; }
  @Delete(":id") @RequireCapability("files:write") @ApiOkResponse({ type: FileWriteResponseDto }) async remove(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string): Promise<FileWriteResponseDto> { const user = await this.currentUser.execute(claims.sub); return this.deleteFile.execute(user.orgId, user.id, fileId.from(id)) as Promise<FileWriteResponseDto>; }
}
