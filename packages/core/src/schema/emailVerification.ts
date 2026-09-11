import { z } from "zod";
import { zEmail, zServerTimestamp } from "./zodHelpers.js";

export const EMAIL_VERIFICATION_STATUSES = [
  "safe",
  "invalid",
  "disabled",
  "disposable",
  "inbox_full",
  "catch_all",
  "role_account",
  "spamtrap",
  "unknown",
] as const;

export type EmailVerificationStatus = (typeof EMAIL_VERIFICATION_STATUSES)[number];

export const VerifyEmailInputSchema = z.object({ email: zEmail });
export type VerifyEmailInput = z.infer<typeof VerifyEmailInputSchema>;

export const EmailVerificationResultSchema = z.object({
  email: zEmail,
  status: z.enum(EMAIL_VERIFICATION_STATUSES),
  overallScore: z.number().int().min(0).max(100).nullable(),
  isSafeToSend: z.boolean(),
  isValidSyntax: z.boolean(),
  isDisposable: z.boolean(),
  isRoleAccount: z.boolean(),
  canConnectSmtp: z.boolean(),
  hasInboxFull: z.boolean(),
  isCatchAll: z.boolean(),
  isDeliverable: z.boolean(),
  isDisabled: z.boolean(),
  isSpamtrap: z.boolean(),
  isFreeEmail: z.boolean(),
  mxAcceptsMail: z.boolean(),
  mxRecords: z.array(z.string()),
  verificationMode: z.literal("power"),
  checkedAt: zServerTimestamp,
  expiresAt: zServerTimestamp,
});
export type EmailVerificationResult = z.infer<typeof EmailVerificationResultSchema>;

export const VerifyEmailResponseSchema = z.object({
  result: EmailVerificationResultSchema,
  cacheHit: z.boolean(),
  accepted: z.boolean(),
  message: z.string(),
});
export type VerifyEmailResponse = z.infer<typeof VerifyEmailResponseSchema>;

export function canUseVerifiedEmail(result: EmailVerificationResult): boolean {
  return result.status === "safe" && result.isSafeToSend && result.isDeliverable;
}

export function emailVerificationMessage(result: EmailVerificationResult): string {
  if (canUseVerifiedEmail(result)) return "E-mail verificado e apto a receber mensagens.";
  if (result.status === "invalid") return "Esse endereço de e-mail não existe.";
  if (result.status === "disabled") return "Essa caixa de e-mail está desativada.";
  if (result.status === "disposable") return "E-mails temporários não são aceitos.";
  if (result.status === "inbox_full") return "A caixa de entrada deste e-mail está cheia.";
  if (result.status === "spamtrap") return "Esse endereço foi identificado como armadilha de spam.";
  if (result.status === "catch_all")
    return "O domínio aceita qualquer endereço e não confirmou esta caixa.";
  if (result.status === "role_account")
    return "Use o e-mail pessoal do colaborador, não uma caixa de função.";
  return "Não foi possível confirmar que essa caixa de e-mail existe.";
}
