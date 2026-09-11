import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { createDbClient, permissionGroups, userPermissionGroups, type SparkDb } from "@spark/db";
import { GRUPOS_PADRAO, type Capacidade, type OrgId, type PermissionGroup, type UserId } from "@spark/core";

/**
 * Conexão admin, não withOrgContext — mesmo motivo de UsersRepository:
 * semearGruposPadrao roda no meio do provisionamento de uma organização
 * nova, antes de haver uma requisição "dentro" dela pra abrir contexto de
 * RLS (docs/adr/0022, docs/adr/0026).
 */
@Injectable()
export class PermissionGroupsRepository {
  private readonly db: SparkDb;

  constructor() {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  /**
   * Organização criada antes do ADR-0029 existir nunca ganhou os cinco
   * grupos padrão — achado testando login de uma conta de dev antiga: sem
   * grupo nenhum, `temCapacidade` nega tudo, pra sempre, sem forma de se
   * curar sozinha. `dev-login.controller.ts` chama isto no caminho de
   * usuário EXISTENTE antes de decidir se semeia — sem esta checagem,
   * `semearGruposPadrao` (um INSERT sem verificação) duplicaria os cinco
   * grupos a cada novo login.
   */
  async orgTemGrupos(orgId: OrgId): Promise<boolean> {
    const [linha] = await this.db.select({ id: permissionGroups.id }).from(permissionGroups).where(eq(permissionGroups.orgId, orgId)).limit(1);
    return !!linha;
  }

  /** Chamado uma vez, na criação da organização (docs/adr/0029). */
  async semearGruposPadrao(orgId: OrgId): Promise<PermissionGroup[]> {
    const linhas = await this.db
      .insert(permissionGroups)
      .values(GRUPOS_PADRAO.map((grupo) => ({ orgId, nome: grupo.nome, capacidades: [...grupo.capacidades] })))
      .returning();

    return linhas.map(paraPermissionGroup);
  }

  async atribuirGrupo(userId: UserId, groupId: PermissionGroup["id"]): Promise<void> {
    await this.db.insert(userPermissionGroups).values({ orgId: await this.orgIdDoGrupo(groupId), userId, groupId });
  }

  async buscarCapacidadesDoUsuario(userId: UserId): Promise<PermissionGroup[]> {
    const linhas = await this.db
      .select({ grupo: permissionGroups })
      .from(userPermissionGroups)
      .innerJoin(permissionGroups, eq(userPermissionGroups.groupId, permissionGroups.id))
      .where(eq(userPermissionGroups.userId, userId));

    return linhas.map((l) => paraPermissionGroup(l.grupo));
  }

  private async orgIdDoGrupo(groupId: PermissionGroup["id"]): Promise<OrgId> {
    const [linha] = await this.db.select({ orgId: permissionGroups.orgId }).from(permissionGroups).where(eq(permissionGroups.id, groupId)).limit(1);
    if (!linha) throw new Error(`Grupo de permissão ${groupId} não encontrado.`);
    return linha.orgId as OrgId;
  }
}

function paraPermissionGroup(linha: {
  id: string;
  orgId: string;
  nome: string;
  capacidades: unknown;
  criadoEm: Date;
  atualizadoEm: Date;
}): PermissionGroup {
  return {
    id: linha.id,
    orgId: linha.orgId,
    nome: linha.nome,
    capacidades: linha.capacidades as Capacidade[],
    criadoEm: linha.criadoEm.toISOString(),
    atualizadoEm: linha.atualizadoEm.toISOString(),
  } as PermissionGroup;
}
