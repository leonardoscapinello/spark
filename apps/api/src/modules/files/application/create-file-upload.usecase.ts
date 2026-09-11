import { Injectable } from "@nestjs/common";
import type { CreateFileUploadInput, FileUploadResponse, OrgId, UserId } from "@spark/core";
import { FilesRepository } from "../infrastructure/files.repository.js";
@Injectable() export class CreateFileUploadUseCase { constructor(private readonly files: FilesRepository) {} execute(orgId: OrgId, userId: UserId, input: CreateFileUploadInput): Promise<FileUploadResponse> { return this.files.createUpload(orgId, userId, input); } }
