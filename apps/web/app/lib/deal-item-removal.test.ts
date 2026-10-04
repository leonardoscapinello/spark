import { describe, expect, it } from "vitest";
import { dealItemRemovalFailure } from "./deal-item-removal";

describe("Falha na remoção do item", () => {
  it("não apresenta atraso na réplica como falha da exclusão já aceita", () => {
    const timeout = new Error("Timeout waiting for txId: 42");
    timeout.name = "TimeoutWaitingForTxIdError";
    expect(dealItemRemovalFailure(timeout)).toMatchObject({ title: "Item removido no servidor", tone: "warning" });
  });
  it("identifica o item já ausente sem sugerir outra exclusão", () => {
    expect(dealItemRemovalFailure({ response: { status: 404 } })).toMatchObject({ title: "Este item já não está no servidor", tone: "warning" });
  });
  it.each([new Error("Network Error"), { response: { status: 403 } }, { response: { status: 500 } }, null])("não confirma uma exclusão recusada ou sem resposta (%o)", (cause) => {
    expect(dealItemRemovalFailure(cause)).toMatchObject({ title: "Não foi possível remover o item", tone: "error" });
  });
});
