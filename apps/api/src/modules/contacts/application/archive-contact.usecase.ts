import { Injectable } from "@nestjs/common";
import type { Contact, ContactId, OrgId } from "@spark/core";
import { ContactsRepository } from "../infrastructure/contacts.repository.js";

@Injectable()
export class ArchiveContactUseCase {
  constructor(private readonly contactsRepository: ContactsRepository) {}

  execute(orgId: OrgId, id: ContactId, archived: boolean): Promise<{ contact: Contact; txid: number }> {
    return this.contactsRepository.archive(orgId, id, archived);
  }
}
