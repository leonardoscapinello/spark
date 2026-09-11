import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_GROUPS,
  email as normalizeEmail,
  permissionGroupId,
  userId,
} from "@spark/core";
import {
  auditLogs,
  createDbClient,
  permissionGroups,
  userPermissionGroups,
  users,
} from "@spark/db";
import { and, eq } from "drizzle-orm";

const localUserId = argument("--local-user-id");
if (!localUserId) {
  fail("Uso: pnpm identity:bootstrap-owner -- --local-user-id <uuid>");
}

const databaseUrl = requiredEnvironment("DATABASE_URL");
const supabaseUrl = requiredEnvironment("SUPABASE_URL");
const supabaseSecretKey = requiredEnvironment("SUPABASE_SECRET_KEY");
const webOrigin = requiredEnvironment("WEB_ORIGIN");

const db = createDbClient(databaseUrl);
const parsedUserId = userId.from(localUserId);
const [localUser] = await db.select().from(users).where(eq(users.id, parsedUserId)).limit(1);

if (!localUser) {
  fail("Usuário local não encontrado.");
}

const normalizedEmail = normalizeEmail(localUser.email);
const identity = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const existingIdentity = await findIdentityByEmail(normalizedEmail);
let identityUserId = existingIdentity?.id;
let createdIdentity = false;
let delivery: "invitation" | "recovery";

if (identityUserId) {
  const { error } = await identity.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${webOrigin}/update-password`,
  });
  if (error) fail("O Supabase não conseguiu enviar a recuperação de acesso.");
  delivery = "recovery";
} else {
  const { data, error } = await identity.auth.admin.inviteUserByEmail(normalizedEmail, {
    data: { name: localUser.name },
    redirectTo: `${webOrigin}/update-password`,
  });
  if (error || !data.user) fail("O Supabase não conseguiu criar o convite.");
  identityUserId = data.user.id;
  createdIdentity = true;
  delivery = "invitation";
}

const linkedIdentityUserId = identityUserId;
if (!linkedIdentityUserId) fail("O Supabase não retornou a identidade do proprietário.");

try {
  await db.transaction(async (tx) => {
    const groups = await tx.select().from(permissionGroups).where(eq(permissionGroups.orgId, localUser.orgId));
    const canonicalGroups = new Map(groups.map((group) => [group.name, group]));

    for (const definition of DEFAULT_GROUPS) {
      if (canonicalGroups.has(definition.name)) continue;
      const [created] = await tx.insert(permissionGroups).values({
        id: permissionGroupId.create(),
        orgId: localUser.orgId,
        name: definition.name,
        capabilities: [...definition.capabilities],
      }).returning();
      if (!created) throw new Error(`Não foi possível criar o grupo ${definition.name}.`);
      canonicalGroups.set(created.name, created);
    }

    const owner = canonicalGroups.get("Proprietário");
    if (!owner) throw new Error("Grupo Proprietário não encontrado.");

    const ownerDefinition = DEFAULT_GROUPS.find((group) => group.name === "Proprietário");
    if (!ownerDefinition) throw new Error("Definição do grupo Proprietário não encontrada.");

    await tx.update(permissionGroups).set({
      capabilities: [...ownerDefinition.capabilities],
      updatedAt: new Date(),
    }).where(and(eq(permissionGroups.id, owner.id), eq(permissionGroups.orgId, localUser.orgId)));

    await tx.update(users).set({
      supabaseUserId: linkedIdentityUserId,
      invitedAt: localUser.invitedAt ?? new Date(),
      activatedAt: null,
      deactivatedAt: null,
      updatedAt: new Date(),
    }).where(eq(users.id, localUser.id));

    await tx.delete(userPermissionGroups).where(eq(userPermissionGroups.userId, localUser.id));
    await tx.insert(userPermissionGroups).values({
      orgId: localUser.orgId,
      userId: localUser.id,
      groupId: owner.id,
    });
    await tx.insert(auditLogs).values({
      orgId: localUser.orgId,
      actorUserId: localUser.id,
      action: "user.owner_bootstrapped",
      targetType: "user",
      targetId: localUser.id,
      data: { identityProvider: "supabase", delivery },
    });
  });
} catch (error) {
  if (createdIdentity) {
    await identity.auth.admin.deleteUser(linkedIdentityUserId);
  }
  throw error;
}

console.log(delivery === "invitation"
  ? "Proprietário vinculado. O convite foi enviado pelo Supabase."
  : "Proprietário vinculado. A recuperação de acesso foi enviada pelo Supabase.");
process.exit(0);

async function findIdentityByEmail(targetEmail: string) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await identity.auth.admin.listUsers({ page, perPage: 100 });
    if (error) fail("O Supabase não conseguiu consultar as identidades existentes.");
    const found = data.users.find((candidate) => candidate.email?.toLowerCase() === targetEmail);
    if (found) return found;
    if (data.users.length < 100) return undefined;
  }
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) fail(`Variável ${name} não configurada.`);
  return value;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
