import { Injectable } from "@nestjs/common";
import { events, type SparkDb } from "@spark/db";
import { eventId, type CompanyId, type ContactId, type DealId, type DomainEventType, type OrgId } from "@spark/core";

export interface AppendDomainEventInput {
  orgId: OrgId;
  contactId?: ContactId | null;
  dealId?: DealId | null;
  companyId?: CompanyId | null;
  type: DomainEventType;
  data?: Record<string, unknown>;
}

/** Public write boundary for the append-only events module. */
@Injectable()
export class DomainEventWriter {
  async append(tx: SparkDb, input: AppendDomainEventInput): Promise<void> {
    await tx.insert(events).values({
      id: eventId.create(),
      orgId: input.orgId,
      contactId: input.contactId ?? null,
      dealId: input.dealId ?? null,
      companyId: input.companyId ?? null,
      type: input.type,
      data: input.data ?? {},
    });
  }
}
