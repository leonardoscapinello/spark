import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { S3ObjectStorage, type ObjectStorage, type StorageConfig } from "@spark/storage";
import { createDbClient, integrationConnections, integrationSecrets, withOrgContext, type SparkDb } from "@spark/db";
import type { IntegrationConnectionId, OrgId } from "@spark/core";
import { SecretVault } from "../../integrations/infrastructure/secret-vault.service.js";

@Injectable()
export class StorageResolver {
  private readonly db: SparkDb = createDbClient(process.env.DATABASE_URL ?? "");
  constructor(private readonly vault: SecretVault) {}
  async forNewUpload(orgId: OrgId): Promise<{ connectionId: IntegrationConnectionId; storage: ObjectStorage }> {
    const loaded = await withOrgContext(this.db, orgId, async (tx) => {
      const [connection] = await tx.select().from(integrationConnections).where(and(eq(integrationConnections.orgId, orgId), eq(integrationConnections.provider, "s3"), eq(integrationConnections.status, "connected"))).orderBy(desc(integrationConnections.updatedAt)).limit(1);
      if (!connection) throw new ServiceUnavailableException("Conecte e teste um armazenamento S3 antes de enviar arquivos.");
      const [secret] = await tx.select().from(integrationSecrets).where(and(eq(integrationSecrets.connectionId, connection.id), eq(integrationSecrets.orgId, orgId))).limit(1);
      if (!secret) throw new ServiceUnavailableException("As credenciais do armazenamento não estão configuradas.");
      return { connection, credentials: this.vault.decrypt(secret) };
    });
    return { connectionId: loaded.connection.id as IntegrationConnectionId, storage: buildStorage(loaded.connection.config, loaded.credentials) };
  }
  async byConnection(orgId: OrgId, connectionId: IntegrationConnectionId): Promise<ObjectStorage> {
    const loaded = await withOrgContext(this.db, orgId, async (tx) => {
      const [connection] = await tx.select().from(integrationConnections).where(and(eq(integrationConnections.id, connectionId), eq(integrationConnections.orgId, orgId), eq(integrationConnections.provider, "s3"))).limit(1);
      if (!connection) throw new NotFoundException("O provedor original deste arquivo não está mais disponível.");
      const [secret] = await tx.select().from(integrationSecrets).where(and(eq(integrationSecrets.connectionId, connection.id), eq(integrationSecrets.orgId, orgId))).limit(1);
      if (!secret) throw new ServiceUnavailableException("As credenciais do provedor original estão indisponíveis.");
      return { connection, credentials: this.vault.decrypt(secret) };
    });
    return buildStorage(loaded.connection.config, loaded.credentials);
  }
}
function buildStorage(config: Record<string, unknown>, credentials: Record<string, string>): ObjectStorage {
  const region = stringValue(config.region) || "auto"; const bucket = stringValue(config.bucket);
  const accessKeyId = credentials.accessKeyId; const secretAccessKey = credentials.secretAccessKey;
  if (!bucket || !accessKeyId || !secretAccessKey) throw new ServiceUnavailableException("A configuração do armazenamento está incompleta.");
  const storageConfig: StorageConfig = { region, bucket, accessKeyId, secretAccessKey, forcePathStyle: config.forcePathStyle === true };
  const endpoint = stringValue(config.endpoint); if (endpoint) storageConfig.endpoint = endpoint;
  return new S3ObjectStorage(storageConfig);
}
function stringValue(value: unknown): string { return typeof value === "string" ? value : ""; }
