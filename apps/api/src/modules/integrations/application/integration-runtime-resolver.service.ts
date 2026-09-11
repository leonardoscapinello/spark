import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import {
  createDbClient,
  integrationConnections,
  integrationSecrets,
  withOrgContext,
  type SparkDb,
} from "@spark/db";
import type { IntegrationConnectionId, IntegrationProvider, OrgId } from "@spark/core";
import { SecretVault } from "../infrastructure/secret-vault.service.js";

export interface ActiveIntegration {
  connectionId: IntegrationConnectionId;
  provider: IntegrationProvider;
  config: Record<string, unknown>;
  secrets: Record<string, string>;
}

@Injectable()
export class IntegrationRuntimeResolver {
  private readonly db: SparkDb = createDbClient(process.env.DATABASE_URL ?? "");

  constructor(private readonly vault: SecretVault) {}

  async resolve(orgId: OrgId, provider: IntegrationProvider): Promise<ActiveIntegration> {
    const integration = await withOrgContext(this.db, orgId, async (tx) => {
      const [connection] = await tx
        .select()
        .from(integrationConnections)
        .where(
          and(
            eq(integrationConnections.orgId, orgId),
            eq(integrationConnections.provider, provider),
            eq(integrationConnections.status, "connected"),
          ),
        )
        .orderBy(desc(integrationConnections.updatedAt))
        .limit(1);
      if (!connection) return null;
      const [secret] = await tx
        .select()
        .from(integrationSecrets)
        .where(
          and(
            eq(integrationSecrets.orgId, orgId),
            eq(integrationSecrets.connectionId, connection.id),
          ),
        )
        .limit(1);
      return secret ? { connection, secret } : null;
    });
    if (!integration)
      throw new ServiceUnavailableException(
        `Configure e teste a integração ${provider} antes de usar este recurso.`,
      );
    return {
      connectionId: integration.connection.id as IntegrationConnectionId,
      provider: integration.connection.provider as IntegrationProvider,
      config: integration.connection.config,
      secrets: this.vault.decrypt(integration.secret),
    };
  }
}
