import { Injectable } from "@nestjs/common";
import type { Activity, OrgId, CreateActivityInput } from "@spark/core";
import { ActivitiesRepository } from "../infrastructure/activities.repository.js";

@Injectable()
export class CreateActivityUseCase {
  constructor(private readonly activitiesRepository: ActivitiesRepository) {}

  async execute(orgId: OrgId, input: CreateActivityInput): Promise<{ activity: Activity; txid: number }> {
    return this.activitiesRepository.create(orgId, input);
  }
}
