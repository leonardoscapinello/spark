import { Injectable } from "@nestjs/common";
import type { Contact, UpdateContactInput, OrgId, ContactId } from "@spark/core";
import { ContactsRepository } from "../infrastructure/contacts.repository.js";

@Injectable()
export class UpdateContactUseCase {
  constructor(private readonly contactsRepository: ContactsRepository) {}

  async execute(orgId: OrgId, id: ContactId, input: UpdateContactInput): Promise<{ contact: Contact; txid: number }> {
    return this.contactsRepository.update(orgId, id, input);
  }
}
