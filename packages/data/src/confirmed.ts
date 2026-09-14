/**
 * Retorno de onInsert/onUpdate das coleções.
 *
 * Com txid, o TanStack DB espera o Electric replicar a escrita antes de
 * soltar o estado otimista (docs/adr/0018). Sem txid, a escrita ficou na
 * fila de envio do service worker — apps/web/app/sw.ts respondeu
 * 202 {queued:true} porque não havia rede — e o handler devolve void: o
 * estado otimista fica na tela, e o Electric traz a linha real quando a
 * fila repetir o envio (docs/adr/0017, "fila de envio").
 */
export function confirmed(response: { txid?: number | null | undefined }): { txid: number } | undefined {
  return typeof response.txid === "number" ? { txid: response.txid } : undefined;
}
