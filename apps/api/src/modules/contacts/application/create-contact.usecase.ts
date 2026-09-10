import { Injectable } from "@nestjs/common";
import type { Contact, CreateContactInput, OrgId } from "@spark/core";
import { ContactsRepository } from "../infrastructure/contacts.repository.js";

@Injectable()
export class CreateContactUseCase {
  constructor(private readonly contactsRepository: ContactsRepository) {}

  async execute(orgId: OrgId, input: CreateContactInput): Promise<{ contact: Contact; txid: number }> {
    return this.contactsRepository.create(orgId, input);
  }
}
