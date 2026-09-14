/**
 * Preserva a ordem das gravações de um mesmo registro sem criar uma fila
 * global. Assim, duas pessoas diferentes continuam salvando em paralelo, mas
 * editar rapidamente dois campos do mesmo negócio não deixa a resposta mais
 * lenta chegar por último e restaurar um valor antigo.
 */
const tails = new Map<string, Promise<unknown>>();

export function serializedWrite<T>(key: string, write: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(write);
  tails.set(key, current);

  void current.then(
    () => clearTail(key, current),
    () => clearTail(key, current),
  );

  return current;
}

function clearTail(key: string, current: Promise<unknown>): void {
  if (tails.get(key) === current) tails.delete(key);
}
