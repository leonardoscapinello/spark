import { Module } from "@nestjs/common";
import { ResourcePresenceService } from "./resource-presence.service.js";

/** A single pair of Valkey connections shared by CRM and inbox. */
@Module({ providers: [ResourcePresenceService], exports: [ResourcePresenceService] })
export class PresenceModule {}
