import { Injectable } from "@nestjs/common";
import nodemailer from "nodemailer";
import { S3ObjectStorage } from "@spark/storage";
import type { IntegrationProvider } from "@spark/core";

type PublicConfig = Record<string, unknown>;
@Injectable()
export class IntegrationProviderRegistry {
  async check(
    provider: IntegrationProvider,
    config: PublicConfig,
    secrets: Record<string, string>,
  ): Promise<void> {
    if (provider === "smtp") return this.checkSmtp(config, secrets);
    if (provider === "s3") return this.checkS3(config, secrets);
    if (provider === "reoon") return this.checkReoon(config, secrets);
    if (provider === "google_workspace")
      return this.checkJsonEndpoint(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        secrets.accessToken,
      );
    if (provider === "instagram")
      return this.checkJsonEndpoint(
        `https://graph.facebook.com/${requiredString(config, "apiVersion")}/me?fields=id,name`,
        secrets.accessToken,
      );
    return this.checkBuffer(secrets.accessToken);
  }
  private async checkSmtp(config: PublicConfig, secrets: Record<string, string>): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: requiredString(config, "host"),
      port: requiredNumber(config, "port"),
      secure: config.secure === true,
      auth: {
        user: requiredSecret(secrets, "username"),
        pass: requiredSecret(secrets, "password"),
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
    });
    await transporter.verify();
    transporter.close();
  }
  private async checkS3(config: PublicConfig, secrets: Record<string, string>): Promise<void> {
    const endpoint = optionalString(config, "endpoint");
    await new S3ObjectStorage({
      ...(endpoint ? { endpoint } : {}),
      region: requiredString(config, "region"),
      bucket: requiredString(config, "bucket"),
      accessKeyId: requiredSecret(secrets, "accessKeyId"),
      secretAccessKey: requiredSecret(secrets, "secretAccessKey"),
      forcePathStyle: config.forcePathStyle === true,
    }).check();
  }
  private async checkReoon(config: PublicConfig, secrets: Record<string, string>): Promise<void> {
    const email = requiredString(config, "testEmail");
    const key = requiredSecret(secrets, "apiKey");
    const response = await fetch(
      `https://emailverifier.reoon.com/api/v1/verify?email=${encodeURIComponent(email)}&key=${encodeURIComponent(key)}&mode=quick`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!response.ok) throw new Error(`Reoon returned HTTP ${response.status}.`);
    const body = (await response.json()) as { status?: string };
    if (!body.status) throw new Error("Reoon returned an invalid response.");
  }
  private async checkBuffer(accessToken: string | undefined): Promise<void> {
    if (!accessToken) throw new Error("accessToken is required.");
    const response = await fetch("https://api.buffer.com", {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ query: "query SparkConnectionCheck { account { id } }" }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Buffer returned HTTP ${response.status}.`);
    const body = (await response.json()) as {
      data?: { account?: { id?: string } };
      errors?: Array<{ message?: string }>;
    };
    if (!body.data?.account?.id || body.errors?.length)
      throw new Error(body.errors?.[0]?.message || "Buffer returned an invalid response.");
  }
  private async checkJsonEndpoint(url: string, accessToken: string | undefined): Promise<void> {
    if (!accessToken) throw new Error("accessToken is required.");
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}.`);
  }
}
function requiredString(config: PublicConfig, key: string): string {
  const value = config[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${key} is required.`);
  return value;
}
function optionalString(config: PublicConfig, key: string): string | undefined {
  const value = config[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}
function requiredNumber(config: PublicConfig, key: string): number {
  const value = config[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${key} is required.`);
  return value;
}
function requiredSecret(secrets: Record<string, string>, key: string): string {
  const value = secrets[key];
  if (!value) throw new Error(`${key} credential is required.`);
  return value;
}
