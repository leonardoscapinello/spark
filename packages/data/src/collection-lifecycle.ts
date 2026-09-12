/** HTTP/1.1 long polls can exhaust the browser's per-origin connection pool. */
export const INACTIVE_COLLECTION_GC_MS =
  typeof window !== "undefined" && window.location.protocol === "http:"
    ? 1_000
    : 300_000;
