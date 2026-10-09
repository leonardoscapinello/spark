import { clearSessionCollections } from "@spark/data";

/** Também elimina rascunhos e estado React: contas nunca compartilham o documento. */
export function leaveSessionDocument(): void {
  const leave = () => window.location.replace("/login");
  void clearSessionCollections().then(leave, leave);
}
