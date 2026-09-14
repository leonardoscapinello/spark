import { Injectable } from "@nestjs/common";
import { buildContactSearchQuery, type Contact, type OrgId, type SearchContactsQuery } from "@spark/core";
import { ContactsRepository } from "../infrastructure/contacts.repository.js";

@Injectable()
export class SearchContactsUseCase {
  constructor(private readonly contactsRepository: ContactsRepository) {}

  async execute(orgId: OrgId, input: SearchContactsQuery): Promise<{ contacts: Contact[] }> {
    const query = buildContactSearchQuery(input.q);
    // Sem termo útil não há o que perguntar ao banco — e não é "nada combina".
    if (!query) return { contacts: [] };
    return { contacts: await this.contactsRepository.search(orgId, query, input.limit) };
  }
}
