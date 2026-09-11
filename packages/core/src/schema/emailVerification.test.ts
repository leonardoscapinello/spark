import { describe, expect, it } from "vitest";
import {
  canUseVerifiedEmail,
  emailVerificationMessage,
  type EmailVerificationResult,
} from "./emailVerification.js";

function result(status: EmailVerificationResult["status"], safe = false): EmailVerificationResult {
  return {
    email: "person@example.com" as EmailVerificationResult["email"],
    status,
    overallScore: safe ? 98 : 0,
    isSafeToSend: safe,
    isValidSyntax: true,
    isDisposable: false,
    isRoleAccount: false,
    canConnectSmtp: true,
    hasInboxFull: false,
    isCatchAll: false,
    isDeliverable: safe,
    isDisabled: false,
    isSpamtrap: false,
    isFreeEmail: false,
    mxAcceptsMail: true,
    mxRecords: ["mx.example.com"],
    verificationMode: "power",
    checkedAt: "2026-09-11T12:00:00.000Z",
    expiresAt: "2026-12-10T12:00:00.000Z",
  };
}

describe("email verification decision", () => {
  it("accepts only a safe and deliverable inbox", () => {
    expect(canUseVerifiedEmail(result("safe", true))).toBe(true);
    expect(canUseVerifiedEmail(result("catch_all"))).toBe(false);
    expect(canUseVerifiedEmail({ ...result("safe", true), isDeliverable: false })).toBe(false);
  });

  it("explains why an address cannot be used", () => {
    expect(emailVerificationMessage(result("invalid"))).toBe("Esse endereço de e-mail não existe.");
    expect(emailVerificationMessage(result("disposable"))).toBe(
      "E-mails temporários não são aceitos.",
    );
  });
});
