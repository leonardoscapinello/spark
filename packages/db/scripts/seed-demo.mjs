/**
 * Dados de demonstração para uma organização local — pessoas, empresas, funil
 * com negócios, atividades e conversas — para avaliar as telas cheias e medir
 * contra as capturas (docs/inspiration). Só desenvolvimento: escreve direto
 * no Postgres com o papel `postgres`, sem passar pela API (não gera eventos).
 *
 *   pnpm seed:demo                 # semeia na única organização (ou --org <slug|id>)
 *   pnpm seed:demo --dry-run       # roda tudo numa transação e desfaz — valida sem gravar
 *
 * Idempotente: tudo que cria leva a marca «demo» (tag, nome do funil) e o
 * script pula o que já existe. Nunca apaga nada.
 */
import postgres from "postgres";
import { v7 as uuidv7 } from "uuid";
import { config as loadEnv } from "dotenv";
// O banco do app é o da API (docs/operacao/ambientes.md): sem DATABASE_URL no ambiente, lê apps/api/.env.
loadEnv({ path: ["../../apps/api/.env", ".env"] });

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const orgArg = args[args.indexOf("--org") + 1];
const wantOrg = args.includes("--org") ? orgArg : null;

const sql = postgres(DATABASE_URL, { prepare: false, max: 1 });
const id = () => uuidv7();
const daysAgo = (n, hour = 10) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(hour, 0, 0, 0); return d; };
const daysAhead = (n, hour = 14) => daysAgo(-n, hour);

const companies = [
  { name: "Acme Brasil", industry: "Tecnologia", website: "https://acme.com.br", email: "contato@acme.com.br" },
  { name: "Vega Consultoria", industry: "Serviços", website: "https://vega.com.br", email: "ola@vega.com.br" },
  { name: "Padaria Estrela", industry: "Alimentação", email: "estrela@padaria.com.br", phone: "+5511987650001" },
  { name: "Clínica Aurora", industry: "Saúde", website: "https://clinicaaurora.com.br" },
];
const people = [
  ["Ana Souza", "ana@acme.com.br", "+5511991110001", "qualified", "site", 82, 0, ["vip"]],
  ["Bruno Lima", "bruno@vega.com.br", "+5511991110002", "new", "indicação", 35, 1, []],
  ["Carla Menezes", "carla@padaria.com.br", "+5511991110003", "customer", "whatsapp", 95, 2, ["cliente"]],
  ["Diego Alves", "diego@acme.com.br", "+5511991110004", "nurturing", "instagram", 48, 0, []],
  ["Elisa Prado", "elisa@aurora.com.br", "+5511991110005", "qualified", "site", 70, 3, ["vip"]],
  ["Fábio Rocha", "fabio@gmail.com", "+5511991110006", "new", "formulário", 20, null, []],
  ["Gabriela Nunes", "gabi@vega.com.br", "+5511991110007", "customer", "indicação", 88, 1, ["cliente", "vip"]],
  ["Henrique Dias", "henrique@outlook.com", "+5511991110008", "unqualified", "instagram", 5, null, []],
  ["Isabela Castro", "isabela@aurora.com.br", "+5511991110009", "nurturing", "whatsapp", 55, 3, []],
  ["João Pedro Farias", "joao@acme.com.br", "+5511991110010", "new", "site", 30, 0, []],
  ["Karina Melo", "karina@padaria.com.br", null, "qualified", "whatsapp", 64, 2, []],
  ["Lucas Teixeira", null, "+5511991110012", "new", "formulário", 15, null, []],
];
const stagesSeed = [["Novo", 10], ["Contato feito", 25], ["Qualificado", 45], ["Proposta enviada", 65], ["Negociação", 80]];
// valores em centavos (packages/core money: inteiro, nunca ponto flutuante)
const dealsSeed = [
  ["Implantação Acme", 0, 0, 3500000, "open", 12],
  ["Consultoria trimestral", 1, 1, 1200000, "open", 20],
  ["Renovação anual", 2, 2, 800000, "open", 8],
  ["Expansão da conta", 0, 3, 5400000, "open", 30],
  ["Plano Aurora", 4, 4, 2100000, "open", 5],
  ["Site institucional", 9, 2, 950000, "open", 15],
  ["Pacote de fotos", 10, 3, 300000, "won", -10],
  ["Mentoria", 6, 1, 600000, "lost", -20],
];
const activitiesSeed = [
  ["call", "Ligar para Ana sobre a proposta", 0, 0, daysAhead(1, 10), false],
  ["meeting", "Reunião de alinhamento com a Vega", 1, 1, daysAhead(2, 15), false],
  ["task", "Enviar contrato para Carla", 2, 2, daysAgo(1, 9), true],
  ["email", "Responder dúvidas da Elisa", 4, 4, daysAhead(0, 16), false],
  ["call", "Retorno para o Diego", 3, null, daysAgo(3, 11), true],
  ["meeting", "Apresentação para a Clínica Aurora", 8, null, daysAhead(5, 10), false],
];
/* Catálogo e itens: o valor do negócio é a soma deles (packages/core/rules/dealProducts). */
const productsSeed = [
  ["IMPL-001", "Implantação assistida", 1_500_000, "serviço"],
  ["LIC-MENSAL", "Licença mensal por usuário", 19_900, "usuário/mês"],
  ["TRE-TURMA", "Treinamento da equipe (turma)", 450_000, "turma"],
  ["SUP-PREM", "Suporte premium", 89_000, "mês"],
];
/* [índice do negócio, [índice do produto, quantidade em milésimos, desconto bp, imposto bp]] */
const dealItemsSeed = [
  [0, [[0, 1000, 0, 0], [1, 10_000, 1000, 0]]],
  [1, [[3, 12_000, 0, 500]]],
  [2, [[1, 5_000, 0, 0], [3, 12_000, 0, 500]]],
  [3, [[0, 2_000, 1500, 0], [2, 3_000, 0, 0]]],
  [4, [[2, 1_000, 0, 0]]],
];
const notesSeed = [
  [0, "Reunião com o time de operações: implantação precisa caber antes do fechamento trimestral. Enviar cronograma."],
  [0, "Decisor é o diretor de operações, não o gerente com quem falamos. Pedir apresentação para ele."],
  [1, "Cliente comparou com dois concorrentes. Diferencial que pesou: suporte em português e prazo de implantação."],
  [3, "Expansão depende da aprovação do orçamento de 2027 — retomar em janeiro."],
];
/* Campos personalizados por módulo, cobrindo os tipos novos. */
const customFieldsSeed = [
  ["deal", "origem_negocio", "Origem do negócio", "single_select", ["Indicação", "Site", "Evento", "Prospecção"]],
  ["deal", "valor_previsto", "Orçamento do cliente", "currency", []],
  ["deal", "assinatura_prevista", "Assinatura prevista", "datetime", []],
  ["deal", "contrato_url", "Link da proposta", "url", []],
  ["deal", "observacoes_internas", "Observações internas", "paragraph", []],
  ["contact", "cargo", "Cargo", "text", []],
  ["contact", "decisor", "É decisor", "boolean", []],
  ["contact", "telefone_direto", "Telefone direto", "phone", []],
  ["company", "porte", "Porte", "single_select", ["Pequena", "Média", "Grande"]],
];
/* Regras de etapa: obrigatório barra a passagem, importante só sinaliza. */
const stageRulesSeed = [
  [1, "contactId", "required"],
  [2, "products", "required"],
  [2, "custom:origem_negocio", "important"],
  [3, "expectedCloseDate", "required"],
  [3, "custom:contrato_url", "important"],
];

const conversationsSeed = [
  ["whatsapp", "Dúvida sobre o plano", 2, [["inbound", "Oi! Vocês fazem plano mensal?"], ["outbound", "Fazemos sim, Carla. Posso te mandar as opções?"], ["inbound", "Pode, por favor."]]],
  ["email", "Proposta comercial", 0, [["inbound", "Recebi a proposta, tenho algumas perguntas sobre o prazo."], ["outbound", "Claro, Ana — o prazo de implantação é de 3 semanas."]]],
  ["instagram", "Interesse no serviço", 3, [["inbound", "Vi o post de vocês, como funciona?"]]],
  ["messenger", "Agendamento", 8, [["inbound", "Quero agendar uma avaliação."], ["outbound", "Perfeito! Temos horário na quinta às 10h."], ["inbound", "Fechado!"]]],
  ["manual", "Retorno de ligação", 5, [["internal", "Ligou perguntando sobre preços; retornar amanhã."]]],
];

async function run(tx) {
  const orgs = wantOrg
    ? await tx`select id, name, slug from organizations where archived_at is null and (slug = ${wantOrg} or id::text = ${wantOrg})`
    : await tx`select id, name, slug from organizations where archived_at is null order by created_at limit 2`;
  if (!orgs.length) throw new Error("Nenhuma organização encontrada — crie a conta antes de semear.");
  if (!wantOrg && orgs.length > 1) throw new Error(`Mais de uma organização; escolha com --org <slug|id>: ${orgs.map((o) => o.slug).join(", ")}`);
  const org = orgs[0];
  const [owner] = await tx`select id, name from users where org_id = ${org.id} and deactivated_at is null order by created_at limit 1`;
  console.log(`Organização: ${org.name} (${org.slug}) · responsável: ${owner?.name ?? "nenhum"}`);

  // empresas
  const companyIds = [];
  for (const c of companies) {
    const [existing] = await tx`select id from companies where org_id = ${org.id} and name = ${c.name} and deleted_at is null`;
    if (existing) { companyIds.push(existing.id); continue; }
    const cid = id();
    await tx`insert into companies (id, org_id, owner_id, name, industry, website, email, phone, tags) values (${cid}, ${org.id}, ${owner?.id ?? null}, ${c.name}, ${c.industry}, ${c.website ?? null}, ${c.email ?? null}, ${c.phone ?? null}, ${JSON.stringify(["demo"])}::jsonb)`;
    companyIds.push(cid);
  }

  // pessoas
  const contactIds = [];
  for (const [name, email, phone, leadStatus, source, score, companyIndex, tags] of people) {
    const [existing] = await tx`select id from contacts where org_id = ${org.id} and name = ${name} and deleted_at is null`;
    if (existing) { contactIds.push(existing.id); continue; }
    const cid = id();
    await tx`insert into contacts (id, org_id, name, email, phone, lead_status, source, owner_id, company_id, score, tags, created_at) values (${cid}, ${org.id}, ${name}, ${email}, ${phone}, ${leadStatus}, ${source}, ${owner?.id ?? null}, ${companyIndex === null ? null : companyIds[companyIndex]}, ${score}, ${JSON.stringify([...tags, "demo"])}::jsonb, ${daysAgo(30 - contactIds.length * 2)})`;
    if (email) await tx`insert into identities (id, org_id, contact_id, channel, external_value, verified) values (${id()}, ${org.id}, ${cid}, 'email', ${email}, true) on conflict do nothing`;
    if (phone) await tx`insert into identities (id, org_id, contact_id, channel, external_value, verified) values (${id()}, ${org.id}, ${cid}, 'whatsapp', ${phone}, false) on conflict do nothing`;
    contactIds.push(cid);
  }

  // funil, etapas e negócios
  const pipelineName = "Funil de demonstração";
  let [pipeline] = await tx`select id from pipelines where org_id = ${org.id} and name = ${pipelineName} and archived_at is null`;
  let stageIds;
  if (!pipeline) {
    const [hasDefault] = await tx`select 1 from pipelines where org_id = ${org.id} and is_default and archived_at is null`;
    pipeline = { id: id() };
    await tx`insert into pipelines (id, org_id, name, is_default) values (${pipeline.id}, ${org.id}, ${pipelineName}, ${!hasDefault})`;
    stageIds = [];
    for (const [index, [name, probability]] of stagesSeed.entries()) {
      const sid = id();
      await tx`insert into stages (id, org_id, pipeline_id, name, sort_order, probability) values (${sid}, ${org.id}, ${pipeline.id}, ${name}, ${index}, ${probability})`;
      stageIds.push(sid);
    }
    const dealIds = [];
    for (const [name, contactIndex, stageIndex, amount, status, closeInDays] of dealsSeed) {
      const did = id();
      await tx`insert into deals (id, org_id, pipeline_id, stage_id, contact_id, company_id, owner_id, name, amount, status, expected_close_date, loss_reason) values (${did}, ${org.id}, ${pipeline.id}, ${stageIds[stageIndex]}, ${contactIds[contactIndex]}, ${people[contactIndex][6] === null ? null : companyIds[people[contactIndex][6]]}, ${owner?.id ?? null}, ${name}, ${amount}, ${status}, ${daysAhead(closeInDays)}, ${status === "lost" ? "Escolheu outro fornecedor" : null})`;
      dealIds.push(did);
    }
    for (const [type, title, contactIndex, dealIndex, scheduledAt, completed] of activitiesSeed) {
      await tx`insert into activities (id, org_id, contact_id, deal_id, type, title, scheduled_at, completed, completed_at) values (${id()}, ${org.id}, ${contactIds[contactIndex]}, ${dealIndex === null ? null : dealIds[dealIndex]}, ${type}, ${title}, ${scheduledAt}, ${completed}, ${completed ? scheduledAt : null})`;
    }
    console.log(`Funil «${pipelineName}»: ${stagesSeed.length} etapas, ${dealsSeed.length} negócios, ${activitiesSeed.length} atividades.`);
  } else {
    console.log(`Funil «${pipelineName}» já existe — negócios e atividades mantidos.`);
  }

  // conversas
  let created = 0;
  for (const [channel, subject, contactIndex, msgs] of conversationsSeed) {
    const [existing] = await tx`select id from conversations where org_id = ${org.id} and subject = ${subject} and contact_id = ${contactIds[contactIndex]}`;
    if (existing) continue;
    const convId = id(); const started = daysAgo(created + 1, 9 + created);
    await tx`insert into conversations (id, org_id, contact_id, channel, subject, assignee_id, first_response_due_at, first_responded_at, last_message_at, created_at) values (${convId}, ${org.id}, ${contactIds[contactIndex]}, ${channel}, ${subject}, ${created % 2 === 0 ? owner?.id ?? null : null}, ${new Date(started.getTime() + 4 * 3600e3)}, ${msgs.some(([d]) => d === "outbound") ? new Date(started.getTime() + 1800e3) : null}, ${new Date(started.getTime() + msgs.length * 900e3)}, ${started})`;
    for (const [index, [direction, body]] of msgs.entries()) {
      await tx`insert into messages (id, org_id, conversation_id, contact_id, author_user_id, direction, status, body, created_at) values (${id()}, ${org.id}, ${convId}, ${contactIds[contactIndex]}, ${direction === "inbound" ? null : owner?.id ?? null}, ${direction}, ${direction === "inbound" ? "received" : direction === "internal" ? "sent" : "delivered"}, ${body}, ${new Date(started.getTime() + index * 900e3)})`;
    }
    created += 1;
  }
  // campos personalizados (os tipos novos, para dar o que testar em cada módulo)
  const fieldIds = new Map();
  for (const [entityType, key, label, type, options] of customFieldsSeed) {
    const [existing] = await tx`select id from custom_field_definitions where org_id = ${org.id} and entity_type = ${entityType} and key = ${key}`;
    if (existing) { fieldIds.set(key, existing.id); continue; }
    const fid = id();
    await tx`insert into custom_field_definitions (id, org_id, entity_type, key, label, type, required, options, created_by) values (${fid}, ${org.id}, ${entityType}, ${key}, ${label}, ${type}, false, ${JSON.stringify(options)}::jsonb, ${owner?.id ?? null})`;
    fieldIds.set(key, fid);
  }

  // produtos do catálogo e itens dos negócios — o valor do negócio vem daqui
  const productIds = [];
  for (const [sku, name, price, unit] of productsSeed) {
    const [existing] = await tx`select id from products where org_id = ${org.id} and sku = ${sku}`;
    if (existing) { productIds.push(existing.id); continue; }
    const pid = id();
    await tx`insert into products (id, org_id, sku, name, description, price, currency, unit, stock, active, tags) values (${pid}, ${org.id}, ${sku}, ${name}, null, ${price}, 'BRL', ${unit}, null, true, ${JSON.stringify(["demo"])}::jsonb)`;
    productIds.push(pid);
  }

  const dealRows = await tx`select id, name from deals where org_id = ${org.id} order by created_at`;
  let itemsCreated = 0;
  for (const [dealIndex, lines] of dealItemsSeed) {
    const deal = dealRows[dealIndex];
    if (!deal) continue;
    const [already] = await tx`select 1 from deal_products where org_id = ${org.id} and deal_id = ${deal.id} limit 1`;
    if (already) continue;
    let total = 0;
    for (const [index, [productIndex, quantityMilli, discountBp, taxBp]] of lines.entries()) {
      const [sku, name, price] = productsSeed[productIndex];
      void sku;
      const gross = Math.round((price * quantityMilli) / 1000);
      const discount = Math.round((gross * discountBp) / 10_000);
      total += gross - discount + Math.round(((gross - discount) * taxBp) / 10_000);
      await tx`insert into deal_products (id, org_id, deal_id, product_id, name, quantity_milli, unit_amount, discount_basis_points, tax_basis_points, sort_order) values (${id()}, ${org.id}, ${deal.id}, ${productIds[productIndex]}, ${name}, ${quantityMilli}, ${price}, ${discountBp}, ${taxBp}, ${index})`;
      itemsCreated += 1;
    }
    await tx`update deals set amount = ${total}, updated_at = now() where id = ${deal.id}`;
  }

  // valores nos campos personalizados dos negócios já semeados
  const originOptions = customFieldsSeed[0][4];
  for (const [index, deal] of dealRows.entries()) {
    await tx`update deals set custom_fields = ${JSON.stringify({
      origem_negocio: originOptions[index % originOptions.length],
      valor_previsto: 100_000 * (index + 5),
      contrato_url: index % 2 === 0 ? `https://propostas.exemplo.com.br/${index + 1}` : null,
    })}::jsonb where id = ${deal.id} and custom_fields = '{}'::jsonb`;
  }

  // notas: o que aconteceu, ao lado das atividades
  let notesCreated = 0;
  for (const [dealIndex, body] of notesSeed) {
    const deal = dealRows[dealIndex];
    if (!deal || !owner) continue;
    const [already] = await tx`select 1 from notes where org_id = ${org.id} and deal_id = ${deal.id} and body = ${body}`;
    if (already) continue;
    await tx`insert into notes (id, org_id, deal_id, body, author_id, created_at) values (${id()}, ${org.id}, ${deal.id}, ${body}, ${owner.id}, ${daysAgo(notesCreated + 1, 14)})`;
    notesCreated += 1;
  }

  // o que cada etapa exige
  const stageRows = await tx`select s.id, s.sort_order, s.pipeline_id from stages s join pipelines p on p.id = s.pipeline_id where s.org_id = ${org.id} and p.name = ${pipelineName} order by s.sort_order`;
  let rulesCreated = 0;
  for (const [stageIndex, fieldKey, level] of stageRulesSeed) {
    const stage = stageRows[stageIndex];
    if (!stage) continue;
    await tx`insert into stage_field_rules (id, org_id, pipeline_id, stage_id, field_key, level) values (${id()}, ${org.id}, ${stage.pipeline_id}, ${stage.id}, ${fieldKey}, ${level}) on conflict (org_id, stage_id, field_key) do nothing`;
    rulesCreated += 1;
  }

  console.log(`Empresas: ${companyIds.length} · pessoas: ${contactIds.length} · conversas novas: ${created}.`);
  console.log(`Catálogo: ${productIds.length} produtos · itens em negócios: ${itemsCreated} · notas: ${notesCreated} · campos personalizados: ${fieldIds.size} · regras de etapa: ${rulesCreated}.`);
}

try {
  await sql.begin(async (tx) => {
    await run(tx);
    if (dryRun) { console.log("Dry-run: desfazendo tudo."); throw new Error("__rollback__"); }
  });
  if (!dryRun) console.log("Semeado.");
} catch (error) {
  if (error?.message !== "__rollback__") { console.error(error.message); process.exitCode = 1; }
} finally {
  await sql.end();
}
