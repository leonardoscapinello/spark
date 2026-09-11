import { BadGatewayException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { and, eq, gt } from "drizzle-orm";
import {
  EMAIL_VERIFICATION_STATUSES,
  EmailVerificationResultSchema,
  canUseVerifiedEmail,
  emailVerificationMessage,
  type Email,
  type EmailVerificationResult,
  type EmailVerificationStatus,
  type OrgId,
  type VerifyEmailResponse,
} from "@spark/core";
import { createDbClient, emailVerifications, withOrgContext, type SparkDb } from "@spark/db";
import { IntegrationRuntimeResolver } from "../../integrations/application/integration-runtime-resolver.service.js";

const CACHE_DURATION_MS = 90 * 24 * 60 * 60 * 1_000;

@Injectable()
export class EmailVerificationService {
  private readonly db: SparkDb;

  constructor(private readonly integrations: IntegrationRuntimeResolver) {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  async verify(orgId: OrgId, email: Email): Promise<VerifyEmailResponse> {
    const now = new Date();
    const cached = await withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx
        .select()
        .from(emailVerifications)
        .where(
          and(
            eq(emailVerifications.orgId, orgId),
            eq(emailVerifications.email, email),
            gt(emailVerifications.expiresAt, now),
          ),
        )
        .limit(1);
      return row;
    });
    if (cached) return responseFor(toResult(cached), true);

    const provider = await this.integrations.resolve(orgId, "reoon");
    if (!provider.secrets.apiKey) {
      throw new ServiceUnavailableException(
        "Configure e teste o Reoon em Integrações antes de validar e-mails.",
      );
    }

    const response = await fetch(
      `https://emailverifier.reoon.com/api/v1/verify?email=${encodeURIComponent(email)}&key=${encodeURIComponent(provider.secrets.apiKey)}&mode=power`,
      { signal: AbortSignal.timeout(75_000) },
    ).catch((cause: unknown) => {
      throw new BadGatewayException(
        cause instanceof Error ? cause.message : "O verificador de e-mail não respondeu.",
      );
    });
    if (!response.ok)
      throw new BadGatewayException(`O verificador de e-mail respondeu HTTP ${response.status}.`);

    const raw: unknown = await response.json();
    const checkedAt = new Date();
    const expiresAt = new Date(checkedAt.getTime() + CACHE_DURATION_MS);
    const result = fromProvider(raw, email, checkedAt, expiresAt);

    await withOrgContext(this.db, orgId, async (tx) => {
      await tx
        .insert(emailVerifications)
        .values({
          orgId,
          ...result,
          rawResult: raw as Record<string, unknown>,
          providerConnectionId: provider.connectionId,
          checkedAt,
          expiresAt,
          updatedAt: checkedAt,
        })
        .onConflictDoUpdate({
          target: [emailVerifications.orgId, emailVerifications.email],
          set: {
            status: result.status,
            overallScore: result.overallScore,
            isSafeToSend: result.isSafeToSend,
            isValidSyntax: result.isValidSyntax,
            isDisposable: result.isDisposable,
            isRoleAccount: result.isRoleAccount,
            canConnectSmtp: result.canConnectSmtp,
            hasInboxFull: result.hasInboxFull,
            isCatchAll: result.isCatchAll,
            isDeliverable: result.isDeliverable,
            isDisabled: result.isDisabled,
            isSpamtrap: result.isSpamtrap,
            isFreeEmail: result.isFreeEmail,
            mxAcceptsMail: result.mxAcceptsMail,
            mxRecords: result.mxRecords,
            rawResult: raw as Record<string, unknown>,
            providerConnectionId: provider.connectionId,
            checkedAt,
            expiresAt,
            updatedAt: checkedAt,
          },
        });
    });
    return responseFor(result, false);
  }
}

function responseFor(result: EmailVerificationResult, cacheHit: boolean): VerifyEmailResponse {
  return {
    result,
    cacheHit,
    accepted: canUseVerifiedEmail(result),
    message: emailVerificationMessage(result),
  };
}

function fromProvider(
  raw: unknown,
  requestedEmail: Email,
  checkedAt: Date,
  expiresAt: Date,
): EmailVerificationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new BadGatewayException("O verificador retornou uma resposta inválida.");
  const body = raw as Record<string, unknown>;
  const status = body.status;
  if (
    typeof status !== "string" ||
    !(EMAIL_VERIFICATION_STATUSES as readonly string[]).includes(status)
  ) {
    throw new BadGatewayException("O verificador retornou um status desconhecido.");
  }
  return EmailVerificationResultSchema.parse({
    email: requestedEmail,
    status: status as EmailVerificationStatus,
    overallScore: typeof body.overall_score === "number" ? body.overall_score : null,
    isSafeToSend: body.is_safe_to_send === true,
    isValidSyntax: body.is_valid_syntax === true,
    isDisposable: body.is_disposable === true,
    isRoleAccount: body.is_role_account === true,
    canConnectSmtp: body.can_connect_smtp === true,
    hasInboxFull: body.has_inbox_full === true,
    isCatchAll: body.is_catch_all === true,
    isDeliverable: body.is_deliverable === true,
    isDisabled: body.is_disabled === true,
    isSpamtrap: body.is_spamtrap === true,
    isFreeEmail: body.is_free_email === true,
    mxAcceptsMail: body.mx_accepts_mail === true,
    mxRecords: Array.isArray(body.mx_records)
      ? body.mx_records.filter((item): item is string => typeof item === "string")
      : [],
    verificationMode: "power",
    checkedAt: checkedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
}

function toResult(row: typeof emailVerifications.$inferSelect): EmailVerificationResult {
  return EmailVerificationResultSchema.parse({
    ...row,
    verificationMode: "power",
    checkedAt: row.checkedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  });
}
