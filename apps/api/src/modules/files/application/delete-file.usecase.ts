import { Injectable } from "@nestjs/common";
import type { FileId, FileWriteResponse, OrgId, UserId } from "@spark/core";
import { FilesRepository } from "../infrastructure/files.repository.js";
@Injectable() export class DeleteFileUseCase { constructor(private readonly files: FilesRepository) {} execute(orgId: OrgId, userId: UserId, id: FileId): Promise<FileWriteResponse> { return this.files.remove(orgId, userId, id); } }
