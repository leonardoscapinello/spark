import { Injectable } from "@nestjs/common";
import type { FileDownloadResponse, FileId, OrgId } from "@spark/core";
import { FilesRepository } from "../infrastructure/files.repository.js";
@Injectable() export class GetFileDownloadUseCase { constructor(private readonly files: FilesRepository) {} execute(orgId: OrgId, id: FileId): Promise<FileDownloadResponse> { return this.files.download(orgId, id); } }
