import { Injectable } from "@nestjs/common";
import type { Activity, OrgId, ActivityId } from "@spark/core";
import { ActivitiesRepository } from "../infrastructure/activities.repository.js";

@Injectable()
export class CompleteActivityUseCase {
  constructor(private readonly activitiesRepository: ActivitiesRepository) {}

  async execute(orgId: OrgId, id: ActivityId, completed: boolean): Promise<{ activity: Activity; txid: number }> {
    return this.activitiesRepository.complete(orgId, id, completed);
  }
}
