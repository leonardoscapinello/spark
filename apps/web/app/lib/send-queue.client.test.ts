import { describe, expect, it } from "vitest";
import { sendQueueNotice } from "./send-queue.client";

describe("sendQueueNotice", () => {
  it("says nothing when online with an empty queue", () => {
    expect(sendQueueNotice({ pending: 0, online: true })).toBeNull();
  });
  it("tells the user what is held while offline", () => {
    expect(sendQueueNotice({ pending: 0, online: false })).toEqual({ title: "Sem conexão", description: "O que você fizer fica guardado e sai quando o sinal voltar." });
    expect(sendQueueNotice({ pending: 1, online: false })?.description).toBe("1 envio guardado — saem sozinhos quando o sinal voltar.");
    expect(sendQueueNotice({ pending: 3, online: false })?.description).toBe("3 envios guardados — saem sozinhos quando o sinal voltar.");
  });
  it("shows the replay while back online with a queue", () => {
    expect(sendQueueNotice({ pending: 2, online: true })).toEqual({ title: "Enviando o que ficou pendente", description: "2 envios guardados na fila." });
  });
});
