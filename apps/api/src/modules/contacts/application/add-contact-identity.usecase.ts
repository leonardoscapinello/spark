import { Injectable } from "@nestjs/common";
import type { AddContactIdentityInput, ContactId, Identity, OrgId } from "@spark/core";
import { IdentitiesRepository } from "../infrastructure/identities.repository.js";

@Injectable()
export class AddContactIdentityUseCase {
  constructor(private readonly identitiesRepository: IdentitiesRepository) {}

  execute(orgId: OrgId, contactId: ContactId, input: AddContactIdentityInput): Promise<{ identity: Identity; txid: number }> {
    return this.identitiesRepository.add(orgId, contactId, input);
  }
}
