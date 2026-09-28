import { createContext } from "react";
import type { LinkPreview } from "@spark/core";

interface LinkPreviewContextValue {
  previews: ReadonlyMap<string, LinkPreview>;
  pending: ReadonlySet<string>;
  failures: ReadonlySet<string>;
  request: (url: string) => void;
}

// Keep context identity independent of component hot updates.
export const LinkPreviewContext = createContext<LinkPreviewContextValue | null>(null);

// Enrichment is optional: a missing preview service must not disable editing.
export const EMPTY_LINK_PREVIEW_CONTEXT: LinkPreviewContextValue = {
  previews: new Map(),
  pending: new Set(),
  failures: new Set(),
  request: () => undefined,
};
