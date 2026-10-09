interface SessionCollection { cleanup(): Promise<void> }
const collections = new Set<WeakRef<SessionCollection>>();

/** Registra só coleções de dados autenticados; não prolonga sua vida após o GC. */
export function registerSessionCollection<T extends SessionCollection>(collection: T): T {
  collections.add(new WeakRef(collection));
  return collection;
}

/** Interrompe sync e apaga linhas antes de liberar uma nova identidade no app. */
export async function clearSessionCollections(): Promise<void> {
  const results = await Promise.allSettled([...collections].map(reference => {
    const collection = reference.deref();
    if (!collection) { collections.delete(reference); return Promise.resolve(); }
    return collection.cleanup();
  }));
  const failed = results.find(result => result.status === "rejected");
  if (failed?.status === "rejected") throw failed.reason;
}
