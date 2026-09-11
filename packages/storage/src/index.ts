import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageConfig { endpoint?: string; region: string; bucket: string; accessKeyId: string; secretAccessKey: string; forcePathStyle?: boolean }
export interface UploadTarget { key: string; uploadUrl: string; expiresAt: string }
export interface DownloadTarget { downloadUrl: string; expiresAt: string }
export interface ObjectStorage {
  check(): Promise<void>;
  createUpload(orgId: string, key: string, contentType: string, expiresInSeconds?: number): Promise<UploadTarget>;
  createDownload(orgId: string, key: string, expiresInSeconds?: number): Promise<DownloadTarget>;
  remove(orgId: string, key: string): Promise<void>;
}

export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  constructor(private readonly config: StorageConfig) {
    this.client = new S3Client({ region: config.region, ...(config.endpoint ? { endpoint: config.endpoint } : {}), forcePathStyle: config.forcePathStyle ?? Boolean(config.endpoint), credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  }
  async check(): Promise<void> { await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket })); }
  async createUpload(orgId: string, key: string, contentType: string, expiresInSeconds = 900): Promise<UploadTarget> {
    const objectKey = safeObjectKey(orgId, key); const uploadUrl = await getSignedUrl(this.client, new PutObjectCommand({ Bucket: this.config.bucket, Key: objectKey, ContentType: contentType }), { expiresIn: expiresInSeconds });
    return { key: objectKey, uploadUrl, expiresAt: new Date(Date.now() + expiresInSeconds * 1_000).toISOString() };
  }
  async createDownload(orgId: string, key: string, expiresInSeconds = 900): Promise<DownloadTarget> {
    const downloadUrl = await getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.config.bucket, Key: safeObjectKey(orgId, key) }), { expiresIn: expiresInSeconds });
    return { downloadUrl, expiresAt: new Date(Date.now() + expiresInSeconds * 1_000).toISOString() };
  }
  async remove(orgId: string, key: string): Promise<void> { await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: safeObjectKey(orgId, key) })); }
}

export function safeObjectKey(orgId: string, key: string): string {
  const normalized = key.replace(/^\/+/, "");
  if (!normalized || normalized.includes("\\") || normalized.split("/").some((part) => part === ".." || part === "." || !part)) throw new Error("Invalid object key.");
  return `${orgId}/${normalized}`;
}
