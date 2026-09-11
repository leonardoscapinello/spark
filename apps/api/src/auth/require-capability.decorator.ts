import { SetMetadata } from "@nestjs/common";
import type { Capability } from "@spark/core";

export const REQUIRED_CAPABILITY_KEY = "requiredCapability";

/** Every route that mutates or reads business data declares this (docs/adr/0029). */
export const RequireCapability = (capability: Capability): ReturnType<typeof SetMetadata> =>
  SetMetadata(REQUIRED_CAPABILITY_KEY, capability);
