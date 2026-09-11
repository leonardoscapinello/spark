// packages/db/scripts/migrate.mjs
// Applies migrations/*.sql in order, via the postgres.js driver directly —
// not through `drizzle-kit migrate`, whose CLI hung reproducibly in this
// environment (spinner never resolves, no connection ever opens on the
// server — see this migration's commit). Deterministic beats interactive
// (docs/adr/0024).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import "dotenv/config";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";
const MIGRATIONS_DIR = new URL("../migrations", import.meta.url).pathname;

async function ensurePrivileges() {
  // supabase/postgres images don't grant CREATE on `public` or CREATE on
  // the database to the `postgres` role by default (only USAGE) — the
  // real superuser there is `supabase_admin`. CREATE PUBLICATION (migration
  // 0001) needs the latter; CREATE TABLE needs the former. On plain
  // Postgres this is a no-op (the role already owns everything). See
  // migration 0000 for context.
  const adminUrl = DATABASE_URL.replace(/postgres:([^@]+)@/, "supabase_admin:$1@");
  const admin = postgres(adminUrl, { prepare: false, max: 1 });
  try {
    await admin`GRANT CREATE ON SCHEMA public TO postgres`;
    await admin`GRANT CREATE ON DATABASE spark TO postgres`;
    console.log("✓ privileges ensured via supabase_admin (CREATE on schema + database)");
  } catch (error) {
    console.log(`  (grant via supabase_admin skipped: ${error.message})`);
  } finally {
    await admin.end();
  }
}

async function main() {
  const sql = postgres(DATABASE_URL, { prepare: false, max: 1 });

  try {
    await ensurePrivileges();

    await sql`
      CREATE TABLE IF NOT EXISTS _spark_migrations (
        tag text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      const tag = path.basename(file, ".sql");
      const [{ exists }] = await sql`
        SELECT EXISTS(SELECT 1 FROM _spark_migrations WHERE tag = ${tag}) as exists
      `;
      if (exists) {
        console.log(`— ${tag} (already applied)`);
        continue;
      }

      const contents = await readFile(path.join(MIGRATIONS_DIR, file), "utf-8");
      console.log(`→ applying ${tag}...`);
      await sql.unsafe(contents);
      await sql`INSERT INTO _spark_migrations (tag) VALUES (${tag})`;
      console.log(`✓ ${tag}`);
    }

    console.log("Migrations up to date.");
  } finally {
    // Always close the connection — without this, an error mid-loop leaves
    // the Node process alive forever (the open pool keeps the event loop
    // busy), and the script "hangs" even after printing the real error.
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
