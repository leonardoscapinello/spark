/**
 * Uma única instância da coleção de atividades por sessão de navegador —
 * mesmo motivo de contacts-collection.client.ts.
 */
import { createActivitiesCollection, type ActivitiesCollection } from "@spark/data";

let instancia: ActivitiesCollection | undefined;

export function getActivitiesCollection(): ActivitiesCollection {
  instancia ??= createActivitiesCollection();
  return instancia;
}
