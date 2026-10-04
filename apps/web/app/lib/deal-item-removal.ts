/** A API já aceitou a exclusão quando apenas a confirmação da réplica expira. */
export function dealItemRemovalFailure(cause: unknown): {
  title: string;
  description: string;
  tone: "warning" | "error";
} {
  if (cause instanceof Error && cause.name === "TimeoutWaitingForTxIdError") {
    return {
      title: "Item removido no servidor",
      description: "A sincronização está indisponível. O item pode continuar na lista até a conexão voltar; não é preciso removê-lo novamente.",
      tone: "warning",
    };
  }
  if (typeof cause === "object" && cause !== null && "response" in cause) {
    const response = cause.response;
    if (typeof response === "object" && response !== null && "status" in response && response.status === 404) {
      return {
        title: "Este item já não está no servidor",
        description: "A lista local está desatualizada. Ela será corrigida quando a sincronização voltar.",
        tone: "warning",
      };
    }
  }
  return {
    title: "Não foi possível remover o item",
    description: "A exclusão não foi confirmada. Confira a conexão e tente novamente.",
    tone: "error",
  };
}
