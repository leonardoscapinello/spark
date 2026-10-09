import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// pnpm executa esta suíte na raiz de apps/web; o Vite pode transformar import.meta.url em HTTP.
const source = readFileSync("public/widget.js", "utf8");
function embed() {
  const frame = { style: { width: "", height: "" }, contentWindow: {} };
  let receive: ((event: { origin: string; source: object; data: object }) => void) | undefined;
  runInNewContext(source, {
    URL,
    document: { currentScript: { src: "https://app.example/widget.js", getAttribute: () => "public-key" }, createElement: () => frame, body: { appendChild: () => undefined } },
    window: { innerWidth: 360, innerHeight: 640, addEventListener: (_name: string, callback: typeof receive) => { receive = callback; } },
  });
  return { frame, send: (data: object, origin = "https://app.example") => receive?.({ data: { source: "spark-widget", ...data }, origin, source: frame.contentWindow }) };
}

describe("widget iframe messages", () => {
  it("ignores messages from an iframe navigated to another origin", () => {
    const { frame, send } = embed();
    send({ type: "size", width: 300, height: 500 }, "https://other.example");
    expect(frame.style.width).toBe("64px");
  });
  it("clamps panel dimensions to the viewport and rejects malformed sizes", () => {
    const { frame, send } = embed();
    send({ type: "size", width: 376, height: 600 });
    expect(frame.style.width).toBe("320px");
    expect(frame.style.height).toBe("600px");
    send({ type: "size", width: "100%", height: -1 });
    expect(frame.style.width).toBe("320px");
    send({ type: "size", width: Infinity, height: 600 });
    expect(frame.style.width).toBe("320px");
  });
});
