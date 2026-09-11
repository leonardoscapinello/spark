import { Module } from "@nestjs/common";
import { DomainEventWriter } from "./application/domain-event-writer.js";

@Module({ providers: [DomainEventWriter], exports: [DomainEventWriter] })
export class EventsModule {}
