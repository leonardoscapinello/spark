import { SetMetadata } from "@nestjs/common";
import type { Capability, SyncResource } from "@spark/core";

export const REQUIRED_CAPABILITY_KEY = "requiredCapability";

/** Every route that mutates or reads business data declares this (docs/adr/0029). */
export const RequireCapability = (capability: Capability): ReturnType<typeof SetMetadata> =>
  SetMetadata(REQUIRED_CAPABILITY_KEY, capability);

export const REQUIRED_RESOURCE_KEY = "requiredSyncResource";

/** Uses the exact policy shared with local-first sync for cached resources. */
export const RequireResourceAccess = (resource: SyncResource): ReturnType<typeof SetMetadata> =>
  SetMetadata(REQUIRED_RESOURCE_KEY, resource);
