/**
 * Uma única instância da coleção de contatos por sessão de navegador —
 * criada sob demanda, não no import do módulo (createContactsCollection
 * lê a base URL/token configurados NA HORA da chamada, não do import;
 * ver packages/data/src/contacts-collection.ts). Compartilhada entre a
 * rota de lista e a de detalhe: é o que faz a navegação entre elas não
 * refazer sincronização nenhuma (docs/arquitetura/fase-0.md, Bloco 7).
 */
import { createContactsCollection, type ContactsCollection } from "@spark/data";

let instancia: ContactsCollection | undefined;

export function getContactsCollection(): ContactsCollection {
  instancia ??= createContactsCollection();
  return instancia;
}
