import { describe, expect, it } from "vitest";
import { S3ObjectStorage, safeObjectKey } from "./index.js";
describe("safeObjectKey", () => {
  it("forces every object under the organization prefix", () => expect(safeObjectKey("org-1", "/contacts/avatar.png")).toBe("org-1/contacts/avatar.png"));
  it("rejects traversal and platform-specific separators", () => { expect(() => safeObjectKey("org-1", "../secret.txt")).toThrow(); expect(() => safeObjectKey("org-1", "x\\y")).toThrow(); });
});

describe("upload assinado", () => {
  it("vincula tamanho e tipo à assinatura sem acessar a rede", async () => {
    const storage = new S3ObjectStorage({ region: "us-east-1", bucket: "test-bucket", accessKeyId: "test-access", secretAccessKey: "test-secret" });
    const target = await storage.createUpload("org-1", "photo.png", "image/png", 512);
    expect(target.uploadUrl).toContain("/org-1/photo.png?");
    const signedHeaders = target.uploadUrl.match(/[?&]X-Amz-SignedHeaders=([^&]+)/)?.[1] ?? "";
    expect(decodeURIComponent(signedHeaders).split(";")).toEqual(expect.arrayContaining(["content-length", "content-type"]));
  });
});
