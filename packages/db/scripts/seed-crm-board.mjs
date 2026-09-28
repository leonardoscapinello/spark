/** Cards de teste adicionais. Idempotente; não altera os negócios existentes. */
import postgres from "postgres";
import { v7 as uuid } from "uuid";
import { config } from "dotenv";
config({ path: ["../../apps/api/.env", ".env"], quiet: true });
const sql = postgres(process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  await sql.begin(async (tx) => {
    const pipelines = await tx`SELECT id, org_id FROM pipelines WHERE archived_at IS NULL AND name = 'Funil de demonstração'`;
    if (pipelines.length !== 1) throw new Error("Escolha explicitamente o funil de demonstração antes de semear.");
    const pipeline = pipelines[0];
    const stages = await tx`SELECT id, name FROM stages WHERE pipeline_id = ${pipeline.id} AND archived_at IS NULL ORDER BY sort_order`;
    const people = await tx`SELECT id, company_id FROM contacts WHERE org_id = ${pipeline.org_id} AND deleted_at IS NULL ORDER BY created_at LIMIT 5`;
    const [owner] = await tx`SELECT id FROM users WHERE org_id = ${pipeline.org_id} LIMIT 1`;
    const [tag] = await tx`INSERT INTO tags(id,org_id,name,slug,color) VALUES (${uuid()},${pipeline.org_id},'Teste CRM','teste crm','purple') ON CONFLICT(org_id,slug) DO UPDATE SET color = tags.color RETURNING id`;
    let created = 0;
    for (const [index, stage] of stages.entries()) {
      const name = `[Teste] ${['Consultoria comercial','Projeto de implantação','Plano de expansão','Proposta anual','Renovação de contrato'][index % 5]} · ${stage.name}`;
      const existing = await tx`SELECT id FROM deals WHERE org_id=${pipeline.org_id} AND pipeline_id=${pipeline.id} AND name=${name}`;
      if (existing.length) continue;
      const person = people[index % people.length];
      const id = uuid();
      await tx`INSERT INTO deals(id,org_id,pipeline_id,stage_id,contact_id,company_id,owner_id,name,amount,status,expected_close_date) VALUES(${id},${pipeline.org_id},${pipeline.id},${stage.id},${person?.id ?? null},${person?.company_id ?? null},${owner?.id ?? null},${name},${(index+1)*250000},'open',now()+interval '14 days')`;
      await tx`INSERT INTO deal_tags(org_id,deal_id,tag_id) VALUES(${pipeline.org_id},${id},${tag.id})`;
      created++;
    }
    process.stdout.write(`${created} cards de teste criados.\n`);
  });
} finally { await sql.end(); }
