import { describe, expect, it } from "vitest";
import { serializedWrite } from "../src/serialized-write.js";

describe("serializedWrite", () => {
  it("preserva a ordem das gravações do mesmo registro", async () => {
    const order: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    let signalStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { signalStarted = resolve; });

    const first = serializedWrite("deal:1", async () => {
      order.push("first:start");
      signalStarted?.();
      await firstGate;
      order.push("first:end");
      return 1;
    });
    const second = serializedWrite("deal:1", async () => {
      order.push("second:start");
      return 2;
    });

    await started;
    expect(order).toEqual(["first:start"]);
    releaseFirst?.();
    await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
    expect(order).toEqual(["first:start", "first:end", "second:start"]);
  });

  it("não bloqueia registros diferentes e continua depois de uma falha", async () => {
    const order: string[] = [];
    let releaseBlocked: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => { releaseBlocked = resolve; });

    const failing = serializedWrite("contact:1", async () => {
      await blocked;
      throw new Error("offline");
    });
    const afterFailure = serializedWrite("contact:1", async () => {
      order.push("recovered");
    });
    const parallel = serializedWrite("contact:2", async () => {
      order.push("parallel");
    });

    await parallel;
    expect(order).toEqual(["parallel"]);
    releaseBlocked?.();
    await expect(failing).rejects.toThrow("offline");
    await afterFailure;
    expect(order).toEqual(["parallel", "recovered"]);
  });
});
