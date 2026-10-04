import "dotenv/config";
import { and, eq, sql } from "drizzle-orm";
import { orgId, userId, CONSULTING_LEVELS, CONSULTING_COLORS, CONSULTING_PRIORITY_MATRIX, CONSULTING_SLA, CONSULTING_STATUSES, CONSULTING_CATALOG, consultingCategoryDefaults, ServiceCategorySchema, ServiceStatusSchema, ServiceLevelSchema, PriorityMatrixSchema, SlaPolicySchema, validateServiceConfiguration, serviceSlaRows } from "@spark/core";
import { createAppDbClient, withOrgContext, serviceCategories, serviceStatuses, serviceLevels, priorityMatrix, slaPolicies, businessHours, holidays, auditLogs, users } from "@spark/db";

const organization = orgId.from(process.argv[2] ?? "");
const actor = userId.from(process.argv[3] ?? "");
const result = await withOrgContext(createAppDbClient(), organization, async tx => {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`service-config:${organization}`},0))`);
  const [user] = await tx.select({ id:users.id }).from(users).where(and(eq(users.orgId,organization),eq(users.id,actor)));
  if (!user) throw new Error("O responsável deve pertencer à organização.");
  const counts = { levels:0,matrix:0,categories:0,categoryDefaults:0,statuses:0,policies:0,hours:0,holidays:0 };
  const levels = await tx.select().from(serviceLevels).where(eq(serviceLevels.orgId,organization));
  for (const kind of ["impact","urgency","priority"] as const) for (const [sortOrder,name] of CONSULTING_LEVELS.entries()) {
    if (levels.some(l=>l.kind===kind&&l.name===name&&!l.archived)) continue;
    const [row]=await tx.insert(serviceLevels).values({orgId:organization,kind,name,color:CONSULTING_COLORS[sortOrder] ?? "neutral",sortOrder,archived:false,description:""}).returning();
    if (!row) throw new Error("Falha ao criar nível.");levels.push(row);counts.levels++;
  }
  const levelId=(kind:string,name:string)=>{const row=levels.find(l=>l.kind===kind&&l.name===name&&!l.archived);if(!row)throw new Error("Nível ausente.");return row.id;};
  const matrix=await tx.select().from(priorityMatrix).where(eq(priorityMatrix.orgId,organization));
  for (const [i,impact] of CONSULTING_LEVELS.entries()) for(const [j,urgency] of CONSULTING_LEVELS.entries()) {
    const impactId=levelId("impact",impact),urgencyId=levelId("urgency",urgency);
    if(matrix.some(m=>m.impactId===impactId&&m.urgencyId===urgencyId))continue;
    const priorityName=CONSULTING_LEVELS[CONSULTING_PRIORITY_MATRIX[i]?.[j] ?? 1];
    const [row]=await tx.insert(priorityMatrix).values({orgId:organization,impactId,urgencyId,priorityId:levelId("priority",priorityName)}).returning();
    if(row)matrix.push(row);counts.matrix++;
  }
  const categories=await tx.select().from(serviceCategories).where(eq(serviceCategories.orgId,organization));
  async function category(name:string,parentId:string|null,root:string,sortOrder:number) {
    const defaults=consultingCategoryDefaults(name,root);
    const defaultImpactId=levelId("impact",defaults.impact),defaultUrgencyId=levelId("urgency",defaults.urgency);
    let row=categories.find(c=>c.parentId===parentId&&c.name===name);
    if(!row){
      [row]=await tx.insert(serviceCategories).values({orgId:organization,name,parentId,sortOrder,archived:false,defaultImpactId,defaultUrgencyId}).returning();
      if(!row)throw new Error("Falha ao criar categoria.");categories.push(row);counts.categories++;
    } else if(!row.archived && (!row.defaultImpactId || !row.defaultUrgencyId)) {
      await tx.update(serviceCategories).set({defaultImpactId:row.defaultImpactId ?? defaultImpactId,defaultUrgencyId:row.defaultUrgencyId ?? defaultUrgencyId,updatedAt:new Date()}).where(and(eq(serviceCategories.orgId,organization),eq(serviceCategories.id,row.id)));counts.categoryDefaults++;
    }
    return row;
  }
  for(const [i,[root,branches]] of Object.entries(CONSULTING_CATALOG).entries()) {
    const n1=await category(root,null,root,i);if(n1.archived)continue;
    for(const [j,[branch,leaves]] of Object.entries(branches).entries()) {
      const n2=await category(branch,n1.id,root,j);if(n2.archived)continue;
      for(const [k,leaf] of leaves.entries())await category(leaf,n2.id,root,k);
    }
  }
  const statuses=await tx.select().from(serviceStatuses).where(eq(serviceStatuses.orgId,organization));
  for(const [sortOrder,preset] of CONSULTING_STATUSES.entries()) {
    if(statuses.some(s=>s.name===preset.name))continue;
    await tx.insert(serviceStatuses).values({...preset,orgId:organization,sortOrder,archived:false});counts.statuses++;
  }
  const policies=await tx.select().from(slaPolicies).where(eq(slaPolicies.orgId,organization));
  for(const preset of [{name:"Geral",firstResponseMinutes:120,totalMinutes:960},...CONSULTING_SLA]) {
    const priorityId=preset.name==="Geral" ? null : levelId("priority",preset.name);
    if(policies.some(p=>!p.archived&&p.categoryId===null&&p.priorityId===priorityId&&!p.impactId&&!p.urgencyId))continue;
    await tx.insert(slaPolicies).values({orgId:organization,name:preset.name==="Geral" ? "SLA geral" : `SLA geral · ${preset.name}`,sortOrder:0,archived:false,categoryId:null,impactId:null,urgencyId:null,priorityId,firstResponseMinutes:preset.firstResponseMinutes,totalMinutes:preset.totalMinutes,warningPercent:80,version:1});counts.policies++;
  }
  const hours=await tx.select().from(businessHours).where(eq(businessHours.orgId,organization));
  for(let weekday=0;weekday<7;weekday++) {
    if(hours.some(h=>h.weekday===weekday))continue;
    await tx.insert(businessHours).values({orgId:organization,weekday,enabled:weekday>0&&weekday<6,startTime:"09:00",breakStartTime:"12:00",breakEndTime:"13:00",endTime:"18:00",timeZone:"America/Sao_Paulo"});counts.hours++;
  }
  // Feriados nacionais de data fixa. Exceções locais e móveis são configuradas à parte.
  const fixedHolidays=[["01-01","Confraternização Universal"],["04-21","Tiradentes"],["05-01","Dia do Trabalho"],["09-07","Independência do Brasil"],["10-12","Nossa Senhora Aparecida"],["11-02","Finados"],["11-15","Proclamação da República"],["11-20","Consciência Negra"],["12-25","Natal"]];
  const existingHolidays=await tx.select().from(holidays).where(eq(holidays.orgId,organization));
  for(const [day,name] of fixedHolidays) {
    if(!day||!name||existingHolidays.some(h=>h.repeatsAnnually&&h.startDate.slice(5)===day))continue;
    await tx.insert(holidays).values({orgId:organization,name,startDate:`2026-${day}`,endDate:`2026-${day}`,kind:"closed",repeatsAnnually:true});counts.holidays++;
  }
  const dates=(row:unknown)=>JSON.parse(JSON.stringify(row)) as unknown;
  const config={categories:(await tx.select().from(serviceCategories).where(eq(serviceCategories.orgId,organization))).map(r=>ServiceCategorySchema.parse(dates(r))),statuses:(await tx.select().from(serviceStatuses).where(eq(serviceStatuses.orgId,organization))).map(r=>ServiceStatusSchema.parse(dates(r))),levels:levels.map(r=>ServiceLevelSchema.parse(dates(r))),matrix:matrix.map(r=>PriorityMatrixSchema.parse(dates(r))),policies:(await tx.select().from(slaPolicies).where(eq(slaPolicies.orgId,organization))).map(r=>SlaPolicySchema.parse(dates(r)))};
  validateServiceConfiguration(config);
  const rows=serviceSlaRows(config);
  if(rows.some(r=>!r.policy))throw new Error("Há combinações sem SLA.");
  await tx.insert(auditLogs).values({orgId:organization,actorUserId:actor,action:"service_configuration.bootstrapped",targetType:"service_configuration",targetId:organization,data:{counts,rows:rows.length}});
  return {created:counts,categories:config.categories.filter(c=>!c.archived).length,statuses:config.statuses.filter(s=>!s.archived).length,levels:config.levels.filter(l=>!l.archived).length,matrix:config.matrix.length,policies:config.policies.filter(p=>!p.archived).length,slaRows:rows.length,uncovered:rows.filter(r=>!r.policy).length};
});
process.stdout.write(`${JSON.stringify(result)}\n`);
process.exit(0);
