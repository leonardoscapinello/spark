import { Injectable } from "@nestjs/common";
import type { Pipeline, CreatePipelineInput, OrgId } from "@spark/core";
import { PipelinesRepository } from "../infrastructure/pipelines.repository.js";

@Injectable()
export class CreatePipelineUseCase {
  constructor(private readonly pipelinesRepository: PipelinesRepository) {}

  async execute(orgId: OrgId, input: CreatePipelineInput): Promise<{ pipeline: Pipeline; txid: number }> {
    return this.pipelinesRepository.create(orgId, input);
  }
}
