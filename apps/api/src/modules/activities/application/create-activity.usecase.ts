import { Injectable } from "@nestjs/common";
import type { Activity, OrgId, CreateActivityInput, UserId } from "@spark/core";
import { ActivitiesRepository } from "../infrastructure/activities.repository.js";

@Injectable()
export class CreateActivityUseCase {
  constructor(private readonly activitiesRepository: ActivitiesRepository) {}

  async execute(orgId: OrgId, actorUserId: UserId, input: CreateActivityInput): Promise<{ activity: Activity; txid: number }> {
    return this.activitiesRepository.create(orgId, actorUserId, input);
  }
}
