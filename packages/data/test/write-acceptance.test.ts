import { describe, expect, it, vi } from "vitest";
import { reportWriteAcceptance, writeAccepted } from "../src/write-acceptance.js";

function pendingReplication() {
  return new Promise<void>(() => undefined);
}

describe("writeAccepted", () => {
  it("confirma no retorno da API sem esperar a réplica", async () => {
    let releaseApi!: () => void;
    const api = new Promise<void>((resolve) => { releaseApi = resolve; });
    const accepted = writeAccepted((metadata) => {
      const replication = reportWriteAcceptance(metadata, async () => api)
        .then(() => pendingReplication());
      return { isPersisted: { promise: replication }, mutations: [{}] };
    });

    const observer = vi.fn();
    void accepted.then(observer);
    await Promise.resolve();
    expect(observer).not.toHaveBeenCalled();

    releaseApi();
    await accepted;
    expect(observer).toHaveBeenCalledOnce();
  });

  it("repassa a falha da API para o campo", async () => {
    const accepted = writeAccepted((metadata) => {
      const replication = reportWriteAcceptance(metadata, async () => { throw new Error("offline"); });
      return { isPersisted: { promise: replication }, mutations: [{}] };
    });

    await expect(accepted).rejects.toThrow("offline");
  });

  it("termina imediatamente quando a atualização não tem mudanças", async () => {
    await expect(writeAccepted(() => ({
      isPersisted: { promise: Promise.resolve() },
      mutations: [],
    }))).resolves.toBeUndefined();
  });
});
