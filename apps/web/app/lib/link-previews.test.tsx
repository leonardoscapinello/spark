import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LinkPreviewContext, EMPTY_LINK_PREVIEW_CONTEXT } from "./link-preview-context";
import { useLinkPreview, useLinkPreviewRequest } from "./link-previews.client";

function Consumer({ url }: { url: string | null }) {
  const state = useLinkPreview(url);
  const request = useLinkPreviewRequest();
  state.request();
  request("https://example.com/");
  return <>{state.loading ? "loading" : "ready"}</>;
}

describe("optional link enrichment", () => {
  it("keeps the record usable without a provider, including non-URL fields", () => {
    expect(renderToStaticMarkup(<Consumer url={null} />)).toBe("ready");
    expect(renderToStaticMarkup(<Consumer url="https://example.com/" />)).toBe("ready");
  });

  it("uses the shared provider for preview requests when available", () => {
    const requested: string[] = [];
    const context = { ...EMPTY_LINK_PREVIEW_CONTEXT, pending: new Set(["https://example.com/"]), request: (url: string) => { requested.push(url); } };
    expect(renderToStaticMarkup(<LinkPreviewContext.Provider value={context}><Consumer url="https://example.com/" /></LinkPreviewContext.Provider>)).toBe("loading");
    expect(requested).toEqual(["https://example.com/", "https://example.com/"]);
  });
});
