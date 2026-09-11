import { Injectable } from "@nestjs/common";
import type { ImportContactsInput, ImportContactsResponse, OrgId } from "@spark/core";
import { ContactsRepository } from "../infrastructure/contacts.repository.js";

@Injectable()
export class ImportContactsUseCase {
  constructor(private readonly contactsRepository: ContactsRepository) {}

  execute(orgId: OrgId, input: ImportContactsInput): Promise<ImportContactsResponse> {
    return this.contactsRepository.import(orgId, input);
  }
}
