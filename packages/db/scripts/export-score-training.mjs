// Offline export: matured outcomes only, no names/emails or message bodies.
// pnpm --filter @spark/db exec node scripts/export-score-training.mjs --org UUID --from YYYY-MM-DD --to YYYY-MM-DD --output /path/samples.jsonl
import { open } from "node:fs/promises";
import postgres from "postgres";
import { config } from "dotenv";
config({ path: ["../../apps/api/.env", ".env"], quiet: true });
const args = new Map();
for (let i=2;i<process.argv.length;i+=2) args.set(process.argv[i],process.argv[i+1]);
const org = args.get("--org"), from=args.get("--from"), to=args.get("--to"), output=args.get("--output");
if (!org || !/^[a-f0-9-]{36}$/i.test(org) || !from || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !to || !/^\d{4}-\d{2}-\d{2}$/.test(to) || !output) throw new Error("Provide --org, --from, --to and --output.");
const db = postgres(process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL, { prepare:false,max:1 });
const file = await open(output,"wx");
let afterDay=from, afterId="00000000-0000-0000-0000-000000000000", total=0;
try {
 while (true) {
  const rows = await db`SELECT s.id,s.day::text,s.contact_id,s.model_id,s.value,s.contributions,s.captured_at,m.definition->>'horizonDays' AS horizon_days,
   EXISTS(SELECT 1 FROM events e WHERE e.org_id=s.org_id AND e.contact_id=s.contact_id AND e.type='deal.won' AND e.occurred_at>s.captured_at AND e.occurred_at<=s.captured_at+make_interval(days=>(m.definition->>'horizonDays')::integer)) AS purchased
   FROM score_snapshots s JOIN score_models m ON m.id=s.model_id AND m.org_id=s.org_id
   WHERE s.org_id=${org} AND s.scope='general' AND s.day>=${from}::date AND s.day<=${to}::date
   AND (s.day,s.id)>(${afterDay}::date,${afterId}::uuid)
   AND s.captured_at+make_interval(days=>(m.definition->>'horizonDays')::integer)<now()
   ORDER BY s.day,s.id LIMIT 1000`;
  if (!rows.length) break;
  for (const row of rows) await file.write(JSON.stringify(row)+"\n");
  total+=rows.length; afterDay=rows.at(-1).day; afterId=rows.at(-1).id;
 }
 process.stderr.write(`Exported ${total} matured samples. Keep contact_id grouped across train/test splits.\n`);
} finally { await file.close(); await db.end(); }
