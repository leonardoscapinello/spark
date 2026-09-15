/**
 * Confirmação curta para a interface de escrita local-first.
 *
 * `transaction.isPersisted` das coleções Electric só termina depois que a
 * gravação volta pela réplica. Isso é uma garantia útil para a coleção, mas
 * não é o tempo que um campo deve exibir como "salvando": a API de produção
 * já confirmou a escrita antes dessa volta. Este metadado liga os dois lados
 * sem enfraquecer a confirmação por txid que continua rodando na coleção.
 */
const WRITE_ACCEPTANCE = Symbol("spark.writeAcceptance");

interface AcceptanceController {
  resolve: () => void;
  reject: (cause: unknown) => void;
}

export type WriteAcceptanceMetadata = Record<string, unknown> & {
  [WRITE_ACCEPTANCE]: AcceptanceController;
};

interface ReplicatedTransaction {
  isPersisted: { promise: Promise<unknown> };
  mutations?: ReadonlyArray<unknown>;
}

/**
 * Inicia uma mutação e termina quando a API aceitou a escrita. A confirmação
 * mais lenta da réplica continua em segundo plano, sem prender o campo.
 */
export function writeAccepted<T extends ReplicatedTransaction>(
  mutate: (metadata: WriteAcceptanceMetadata) => T,
): Promise<void> {
  let resolve!: () => void;
  let reject!: (cause: unknown) => void;
  const accepted = new Promise<void>((acceptedResolve, acceptedReject) => {
    resolve = acceptedResolve;
    reject = acceptedReject;
  });

  let transaction: T;
  try {
    const metadata = { [WRITE_ACCEPTANCE]: { resolve, reject } } as WriteAcceptanceMetadata;
    transaction = mutate(metadata);
  } catch (cause) {
    return Promise.reject(cause);
  }

  if (transaction.mutations?.length === 0) resolve();

  // A coleção ainda usa o txid para reconciliar o estado otimista com a
  // réplica. O campo não espera por isso, mas a rejeição também não pode virar
  // uma Promise não tratada no navegador.
  void transaction.isPersisted.promise.catch(() => undefined);
  return accepted;
}

/** Marca a aceitação exatamente na fronteira da chamada HTTP da coleção. */
export async function reportWriteAcceptance<T>(
  metadata: unknown,
  write: () => Promise<T>,
): Promise<T> {
  const controller = acceptanceController(metadata);
  try {
    const result = await write();
    controller?.resolve();
    return result;
  } catch (cause) {
    controller?.reject(cause);
    throw cause;
  }
}

function acceptanceController(metadata: unknown): AcceptanceController | undefined {
  if (typeof metadata !== "object" || metadata === null) return undefined;
  return (metadata as Partial<WriteAcceptanceMetadata>)[WRITE_ACCEPTANCE];
}
