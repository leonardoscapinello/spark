import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface EncryptedSecret { ciphertext: string; iv: string; authTag: string }

@Injectable()
export class SecretVault {
  encrypt(value: Record<string, string>): EncryptedSecret {
    const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
    return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64") };
  }
  decrypt(value: EncryptedSecret): Record<string, string> {
    const decipher = createDecipheriv("aes-256-gcm", this.key(), Buffer.from(value.iv, "base64"));
    decipher.setAuthTag(Buffer.from(value.authTag, "base64"));
    const parsed: unknown = JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid encrypted integration payload.");
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  }
  private key(): Buffer {
    const encoded = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (!encoded) throw new Error("INTEGRATION_ENCRYPTION_KEY is required.");
    const key = Buffer.from(encoded, "base64");
    if (key.length !== 32) throw new Error("INTEGRATION_ENCRYPTION_KEY must decode to 32 bytes.");
    return key;
  }
}
