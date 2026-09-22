/**
 * A Cloud API só aceita mensagem de texto livre até 24h depois da última
 * mensagem recebida do cliente — fora disso, só template pré-aprovado
 * passa. Isto é regra do WhatsApp, não nossa: modelar aqui evita que o
 * agente só descubra isso pelo erro que a Meta devolve na hora de enviar.
 */
export const WHATSAPP_SESSION_WINDOW_HOURS = 24;

export function isWithinWhatsAppSessionWindow(lastInboundMessageAt: string | null, now: Date): boolean {
  if (!lastInboundMessageAt) return false;
  const elapsedHours = (now.getTime() - new Date(lastInboundMessageAt).getTime()) / 3_600_000;
  return elapsedHours < WHATSAPP_SESSION_WINDOW_HOURS;
}
