// packages/db/scripts/migrate.mjs
// Aplica migrations/*.sql em ordem, via driver postgres.js direto — não
// pelo `drizzle-kit migrate`, cuja CLI travou de forma reproduzível neste
// ambiente (spinner nunca resolve, sem conexão aberta no servidor — ver
// commit desta migration). Determinístico bate interativo (docs/adr/0024).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import "dotenv/config";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";
const MIGRATIONS_DIR = new URL("../migrations", import.meta.url).pathname;

async function garantirPrivilegios() {
  // Imagens supabase/postgres não dão CREATE em `public` nem CREATE no
  // banco pro papel `postgres` por padrão (só USAGE) — o superusuário real
  // ali é `supabase_admin`. CREATE PUBLICATION (migration 0002) precisa do
  // segundo; CREATE TABLE precisa do primeiro. Em Postgres comum isto é
  // no-op (o role já é dono de tudo). Ver migration 0000 para o contexto.
  const adminUrl = DATABASE_URL.replace(/postgres:([^@]+)@/, "supabase_admin:$1@");
  const admin = postgres(adminUrl, { prepare: false, max: 1 });
  try {
    await admin`GRANT CREATE ON SCHEMA public TO postgres`;
    await admin`GRANT CREATE ON DATABASE spark TO postgres`;
    console.log("✓ privilégios garantidos via supabase_admin (CREATE em schema + banco)");
  } catch (erro) {
    console.log(`  (grant via supabase_admin pulado: ${erro.message})`);
  } finally {
    await admin.end();
  }
}

async function main() {
  const sql = postgres(DATABASE_URL, { prepare: false, max: 1 });

  try {
    await garantirPrivilegios();

    await sql`
      CREATE TABLE IF NOT EXISTS _spark_migrations (
        tag text PRIMARY KEY,
        aplicada_em timestamptz NOT NULL DEFAULT now()
      )
    `;

    const arquivos = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const arquivo of arquivos) {
      const tag = path.basename(arquivo, ".sql");
      const [{ existe }] = await sql`
        SELECT EXISTS(SELECT 1 FROM _spark_migrations WHERE tag = ${tag}) as existe
      `;
      if (existe) {
        console.log(`— ${tag} (já aplicada)`);
        continue;
      }

      const conteudo = await readFile(path.join(MIGRATIONS_DIR, arquivo), "utf-8");
      console.log(`→ aplicando ${tag}...`);
      await sql.unsafe(conteudo);
      await sql`INSERT INTO _spark_migrations (tag) VALUES (${tag})`;
      console.log(`✓ ${tag}`);
    }

    console.log("Migrations em dia.");
  } finally {
    // Sempre fechar a conexão — sem isto, um erro no meio do loop deixa o
    // processo Node vivo pra sempre (o pool aberto mantém o event loop
    // ocupado), e o script "trava" mesmo já tendo impresso o erro real.
    await sql.end();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
