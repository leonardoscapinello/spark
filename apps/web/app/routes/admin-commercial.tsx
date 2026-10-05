import { useState } from "react";
import { Link, useParams } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import {
  CreateCouponInputSchema, CreateInstallmentPolicyInputSchema, couponId, formatBasisPoints, formatBRL, installmentOptions, installmentPolicyId, money, normalizeCouponCode, toInstallmentPolicy,
  type Coupon, type InstallmentPolicyRecord, type Money,
} from "@spark/core";
import { couponForInsert, policyForInsert } from "@spark/data";
import { ActionModal, AmountSummary, Button, Chip, DataTable, DatePicker, EmptyState, Field, Icon, Input, Label, LinkTabs, MoneyInput, PageFrame, PageHeader, PercentInput, Select, Switch, Text, Textarea, notify, type TableColumn } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { requireCapability } from "../lib/route-access.client";
import { getCouponsCollection, getDealAdjustmentsCollection, getInstallmentPoliciesCollection } from "../lib/deal-pricing-collections.client";
import { revalidateOnPathOnly, useUrlEditor } from "../lib/url-state.client";
import styles from "./admin-commercial.module.css";

/**
 * Configurações → Comercial (ADR-0046): cupons pré-configurados e políticas
 * de parcelamento. O negócio usa os dois hoje; o checkout, amanhã.
 */
export const shouldRevalidate = revalidateOnPathOnly;
export async function clientLoader() {
  await requireCapability("catalog:write");
  void Promise.allSettled([getCouponsCollection().preload(), getInstallmentPoliciesCollection().preload()]);
  return null;
}

const SECTIONS = { cupons: "Cupons", parcelamento: "Parcelamento e juros" } as const;
type Section = keyof typeof SECTIONS;

export default function AdminCommercial() {
  const { section: raw = "cupons" } = useParams();
  const section: Section = raw === "parcelamento" ? "parcelamento" : "cupons";
  return <PageFrame>
    <PageHeader eyebrow="Configurações · Comercial" title={SECTIONS[section]} description={section === "cupons" ? "Códigos de desconto que a equipe aplica nos negócios — e o checkout, depois. Cada um com validade, mínimo e limite de usos." : "Até quantas vezes a empresa parcela, até quando sem juros e quanto cobra de juros ao mês. Os juros são seus, não do gateway."} />
    <LinkTabs label="Seções comerciais" items={(Object.keys(SECTIONS) as Section[]).map(key => ({ key, label: SECTIONS[key], active: key === section, render: <Link to={`/admin/commercial/${key}`} /> }))} />
    {section === "cupons" ? <Coupons /> : <Policies />}
  </PageFrame>;
}

/* ------------------------------------------------------------------ */
/* Cupons                                                              */
/* ------------------------------------------------------------------ */

const day = (iso: string | null) => iso ? iso.slice(0, 10) : "";
const brDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const couponValue = (coupon: Pick<Coupon, "valueType" | "basisPoints" | "amount">) => coupon.valueType === "percent" ? `${formatBasisPoints(coupon.basisPoints)}%` : formatBRL(coupon.amount);

function couponStatus(coupon: Coupon, uses: number, now: Date): { label: string; tone: "success" | "warning" | "danger" | "neutral" } {
  if (!coupon.active) return { label: "Desativado", tone: "neutral" };
  if (coupon.endsAt && now > new Date(coupon.endsAt)) return { label: "Expirado", tone: "danger" };
  if (coupon.startsAt && now < new Date(coupon.startsAt)) return { label: "Agendado", tone: "warning" };
  if (coupon.maxRedemptions !== null && uses >= coupon.maxRedemptions) return { label: "Esgotado", tone: "danger" };
  return { label: "Ativo", tone: "success" };
}

interface CouponDraft { id: string | null; code: string; description: string; valueType: "percent" | "amount"; basisPoints: number | null; amount: Money | null; appliesTo: "once" | "recurring"; cycles: string; minimumSubtotal: Money | null; startsAt: string; endsAt: string; maxRedemptions: string; active: boolean }
const EMPTY_COUPON: CouponDraft = { id: null, code: "", description: "", valueType: "percent", basisPoints: null, amount: null, appliesTo: "once", cycles: "", minimumSubtotal: null, startsAt: "", endsAt: "", maxRedemptions: "", active: true };

function Coupons() {
  const session = getSession();
  const canSeeUsage = session?.capabilities.includes("deals:read") ?? false;
  const { data: coupons = [], isLoading } = useLiveQuery(q => q.from({ coupon: getCouponsCollection() }).orderBy(({ coupon }) => coupon.code, "asc"), []);
  const { data: applied = [] } = useLiveQuery(q => canSeeUsage ? q.from({ adjustment: getDealAdjustmentsCollection() }) : undefined, [canSeeUsage]);
  const uses = new Map<string, number>();
  for (const adjustment of applied) if (adjustment.couponId) uses.set(adjustment.couponId, (uses.get(adjustment.couponId) ?? 0) + 1);
  const [draft, setDraft] = useState<CouponDraft | null>(null);
  const [removing, setRemoving] = useState<Coupon | null>(null);
  const { openCreate, openEdit, close } = useUrlEditor<Coupon>(isLoading ? undefined : coupons, draft !== null, {
    create: () => setDraft(EMPTY_COUPON),
    edit: coupon => setDraft({ id: coupon.id, code: coupon.code, description: coupon.description ?? "", valueType: coupon.valueType, basisPoints: coupon.basisPoints, amount: coupon.amount, appliesTo: coupon.appliesTo, cycles: coupon.cycles ? String(coupon.cycles) : "", minimumSubtotal: coupon.minimumSubtotal, startsAt: day(coupon.startsAt), endsAt: day(coupon.endsAt), maxRedemptions: coupon.maxRedemptions ? String(coupon.maxRedemptions) : "", active: coupon.active }),
    close: () => setDraft(null),
  });
  const now = new Date();

  async function save() {
    if (!draft || !session) return;
    const existing = draft.id ? coupons.find(c => c.id === draft.id) : undefined;
    const parsed = CreateCouponInputSchema.safeParse({
      id: draft.id ?? couponId.create(), code: normalizeCouponCode(draft.code), description: draft.description.trim() || null, valueType: draft.valueType,
      basisPoints: draft.valueType === "percent" ? draft.basisPoints ?? 0 : 0, amount: draft.valueType === "amount" ? (draft.amount ?? money(0)) : money(0),
      appliesTo: draft.appliesTo, cycles: draft.appliesTo === "recurring" && draft.cycles ? Number(draft.cycles) : null,
      minimumSubtotal: draft.minimumSubtotal, startsAt: draft.startsAt ? new Date(`${draft.startsAt}T00:00:00`).toISOString() : null, endsAt: draft.endsAt ? new Date(`${draft.endsAt}T23:59:59`).toISOString() : null,
      maxRedemptions: draft.maxRedemptions ? Number(draft.maxRedemptions) : null, active: draft.active,
    });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Revise os campos do cupom.");
    if ((parsed.data.valueType === "percent" ? parsed.data.basisPoints ?? 0 : Number(parsed.data.amount)) <= 0) throw new Error("Informe o valor do desconto.");
    const nowIso = new Date().toISOString();
    const record = { ...parsed.data, orgId: session.orgId, description: parsed.data.description ?? null, basisPoints: parsed.data.basisPoints ?? 0, appliesTo: parsed.data.appliesTo ?? "once", cycles: parsed.data.cycles ?? null, minimumSubtotal: parsed.data.minimumSubtotal ?? null, startsAt: parsed.data.startsAt ?? null, endsAt: parsed.data.endsAt ?? null, maxRedemptions: parsed.data.maxRedemptions ?? null, active: parsed.data.active ?? true, createdAt: existing?.createdAt ?? nowIso, updatedAt: nowIso } as Coupon;
    const collection = getCouponsCollection();
    const transaction = existing ? collection.update(existing.id, row => Object.assign(row, record)) : collection.insert(couponForInsert(record));
    await transaction.isPersisted.promise;
    notify({ title: existing ? "Cupom atualizado" : "Cupom criado", description: record.code, tone: "success" });
  }

  async function remove() {
    if (!removing) return;
    await getCouponsCollection().delete(removing.id).isPersisted.promise;
    notify({ title: "Cupom excluído", description: removing.code, tone: "success" });
  }

  const columns: TableColumn<Coupon>[] = [
    { id: "code", label: "Código", cell: c => <Text mono weight="medium">{c.code}</Text>, sortValue: c => c.code },
    { id: "value", label: "Desconto", align: "end", cell: c => couponValue(c) },
    { id: "applies", label: "Vale para", cell: c => c.appliesTo === "once" ? "Valor único" : c.cycles ? `Assinatura · ${c.cycles} ${c.cycles === 1 ? "ciclo" : "ciclos"}` : "Assinatura · todos os ciclos" },
    { id: "window", label: "Validade", cell: c => c.endsAt ? `até ${brDate(c.endsAt)}` : "Sem prazo" },
    { id: "uses", label: "Usos", align: "end", cell: c => canSeeUsage ? `${uses.get(c.id) ?? 0}${c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}` : "—" },
    { id: "status", label: "Situação", cell: c => { const status = couponStatus(c, uses.get(c.id) ?? 0, now); return <Chip size="sm" tone={status.tone} dot>{status.label}</Chip>; } },
  ];

  return <>
    {!isLoading && coupons.length === 0
      ? <EmptyState variant="featured" icon="tag" title="Crie o primeiro cupom" description="Um código como BLACKFRIDAY com 10% de desconto, validade e limite de usos. A equipe aplica no negócio digitando o código." action={<Button icon={<Icon name="plus" />} onClick={openCreate}>Novo cupom</Button>} />
      : <>
        <div className={styles.toolbar}><Button icon={<Icon name="plus" />} onClick={openCreate}>Novo cupom</Button></div>
        <DataTable label="Cupons" rows={coupons} columns={columns} rowKey={c => c.id} rowLabel={c => c.code} state={isLoading ? "loading" : "ready"} onRowOpen={openEdit}
          actions={c => <Button size="sm" variant="ghost" iconOnly icon={<Icon name="trash" />} aria-label={`Excluir ${c.code}`} onClick={() => setRemoving(c)} />} />
      </>}

    <ActionModal open={draft !== null} onOpenChange={next => { if (!next) close(); }} title={draft?.id ? "Editar cupom" : "Novo cupom"} confirmLabel={draft?.id ? "Salvar cupom" : "Criar cupom"} onConfirm={save}>
      {draft && <div className={styles.form}>
        <div className={styles.pair}>
          <Field><Label>Código</Label><Input value={draft.code} placeholder="BLACKFRIDAY" onChange={e => setDraft({ ...draft, code: e.currentTarget.value })} onBlur={() => setDraft({ ...draft, code: normalizeCouponCode(draft.code) })} /></Field>
          <Field><Label>Situação</Label><Switch checked={draft.active} onCheckedChange={active => setDraft({ ...draft, active })}>{draft.active ? "Ativo" : "Desativado"}</Switch></Field>
        </div>
        <Field><Label>Descrição interna</Label><Textarea value={draft.description} placeholder="Campanha de novembro, só para novos clientes" onChange={e => setDraft({ ...draft, description: e.currentTarget.value })} /></Field>
        <div className={styles.pair}>
          <Field><Label>Tipo de desconto</Label><Select label="Tipo de desconto" value={draft.valueType} options={[{ value: "percent", label: "Percentual" }, { value: "amount", label: "Valor fixo" }]} onValueChange={value => { if (value === "percent" || value === "amount") setDraft({ ...draft, valueType: value }); }} /></Field>
          {draft.valueType === "percent"
            ? <Field><Label>Desconto</Label><PercentInput label="Desconto" value={draft.basisPoints} onValueChange={basisPoints => setDraft({ ...draft, basisPoints })} /></Field>
            : <Field><Label>Desconto</Label><MoneyInput label="Desconto" value={draft.amount} onValueChange={amount => setDraft({ ...draft, amount })} /></Field>}
        </div>
        <div className={styles.pair}>
          <Field><Label>Vale para</Label><Select label="Vale para" value={draft.appliesTo} options={[{ value: "once", label: "Valor único (setup, produto)" }, { value: "recurring", label: "Assinatura (por ciclo)" }]} onValueChange={value => { if (value === "once" || value === "recurring") setDraft({ ...draft, appliesTo: value }); }} /></Field>
          {draft.appliesTo === "recurring" && <Field><Label>Durante quantos ciclos</Label><Input numeric inputMode="numeric" value={draft.cycles} placeholder="Todos" onChange={e => setDraft({ ...draft, cycles: e.currentTarget.value.replace(/\D/g, "") })} /></Field>}
        </div>
        <div className={styles.pair}>
          <Field><Label>Começa em</Label><DatePicker label="Começa em" value={draft.startsAt} onValueChange={startsAt => setDraft({ ...draft, startsAt })} /></Field>
          <Field><Label>Termina em</Label><DatePicker label="Termina em" value={draft.endsAt} onValueChange={endsAt => setDraft({ ...draft, endsAt })} /></Field>
        </div>
        <div className={styles.pair}>
          <Field><Label>Subtotal mínimo</Label><MoneyInput label="Subtotal mínimo" value={draft.minimumSubtotal} onValueChange={minimumSubtotal => setDraft({ ...draft, minimumSubtotal })} /></Field>
          <Field><Label>Limite de usos</Label><Input numeric inputMode="numeric" value={draft.maxRedemptions} placeholder="Sem limite" onChange={e => setDraft({ ...draft, maxRedemptions: e.currentTarget.value.replace(/\D/g, "") })} /></Field>
        </div>
      </div>}
    </ActionModal>

    <ActionModal open={removing !== null} onOpenChange={next => { if (!next) setRemoving(null); }} title="Excluir cupom?" confirmLabel="Excluir cupom" onConfirm={remove}>
      <Text as="p">O código {removing?.code} deixa de existir. Cupom que já foi usado em negócios não pode ser excluído — desative-o.</Text>
    </ActionModal>
  </>;
}

/* ------------------------------------------------------------------ */
/* Parcelamento                                                        */
/* ------------------------------------------------------------------ */

interface PolicyDraft { id: string | null; name: string; maxInstallments: string; interestFreeInstallments: string; monthlyInterestBasisPoints: number | null; minimumInstallment: Money | null; upfrontDiscountBasisPoints: number | null; isDefault: boolean; active: boolean }
const EMPTY_POLICY: PolicyDraft = { id: null, name: "Cartão de crédito", maxInstallments: "12", interestFreeInstallments: "3", monthlyInterestBasisPoints: 199, minimumInstallment: money(5_000), upfrontDiscountBasisPoints: 0, isDefault: false, active: true };
const SIMULATED = money(100_000);

function Policies() {
  const session = getSession();
  const { data: policies = [], isLoading } = useLiveQuery(q => q.from({ policy: getInstallmentPoliciesCollection() }).orderBy(({ policy }) => policy.name, "asc"), []);
  const [draft, setDraft] = useState<PolicyDraft | null>(null);
  const [removing, setRemoving] = useState<InstallmentPolicyRecord | null>(null);
  const { openCreate, openEdit, close } = useUrlEditor<InstallmentPolicyRecord>(isLoading ? undefined : policies, draft !== null, {
    create: () => setDraft({ ...EMPTY_POLICY, isDefault: policies.length === 0 }),
    edit: p => setDraft({ id: p.id, name: p.name, maxInstallments: String(p.maxInstallments), interestFreeInstallments: String(p.interestFreeInstallments), monthlyInterestBasisPoints: p.monthlyInterestBasisPoints, minimumInstallment: p.minimumInstallment, upfrontDiscountBasisPoints: p.upfrontDiscountBasisPoints, isDefault: p.isDefault, active: p.active }),
    close: () => setDraft(null),
  });

  const draftInput = draft ? {
    id: draft.id ?? installmentPolicyId.create(), name: draft.name.trim(), maxInstallments: Number(draft.maxInstallments || 0), interestFreeInstallments: Number(draft.interestFreeInstallments || 0),
    monthlyInterestBasisPoints: draft.monthlyInterestBasisPoints ?? 0, minimumInstallment: draft.minimumInstallment ?? money(0), upfrontDiscountBasisPoints: draft.upfrontDiscountBasisPoints ?? 0, isDefault: draft.isDefault, active: draft.active,
  } : null;
  const parsedDraft = draftInput ? CreateInstallmentPolicyInputSchema.safeParse(draftInput) : null;
  const simulation = parsedDraft?.success && parsedDraft.data.interestFreeInstallments <= parsedDraft.data.maxInstallments
    ? installmentOptions(SIMULATED, toInstallmentPolicy({ ...parsedDraft.data, upfrontDiscountBasisPoints: parsedDraft.data.upfrontDiscountBasisPoints ?? 0 }))
    : [];

  async function save() {
    if (!draft || !session || !parsedDraft) return;
    if (!parsedDraft.success) throw new Error(parsedDraft.error.issues[0]?.message ?? "Revise os campos da política.");
    if (parsedDraft.data.interestFreeInstallments > parsedDraft.data.maxInstallments) throw new Error("As parcelas sem juros não podem passar do máximo de parcelas.");
    const existing = draft.id ? policies.find(p => p.id === draft.id) : undefined;
    const nowIso = new Date().toISOString();
    const record = { ...parsedDraft.data, orgId: session.orgId, upfrontDiscountBasisPoints: parsedDraft.data.upfrontDiscountBasisPoints ?? 0, isDefault: parsedDraft.data.isDefault ?? false, active: parsedDraft.data.active ?? true, createdAt: existing?.createdAt ?? nowIso, updatedAt: nowIso } as InstallmentPolicyRecord;
    const collection = getInstallmentPoliciesCollection();
    const transaction = existing ? collection.update(existing.id, row => Object.assign(row, record)) : collection.insert(policyForInsert(record));
    await transaction.isPersisted.promise;
    notify({ title: existing ? "Política atualizada" : "Política criada", description: record.name, tone: "success" });
  }

  async function remove() {
    if (!removing) return;
    await getInstallmentPoliciesCollection().delete(removing.id).isPersisted.promise;
    notify({ title: "Política excluída", description: removing.name, tone: "success" });
  }

  const columns: TableColumn<InstallmentPolicyRecord>[] = [
    { id: "name", label: "Política", cell: p => <span className={styles.name}><Text weight="medium">{p.name}</Text>{p.isDefault && <Chip size="sm" tone="info">Padrão</Chip>}{!p.active && <Chip size="sm">Desativada</Chip>}</span>, sortValue: p => p.name },
    { id: "max", label: "Até", align: "end", cell: p => `${p.maxInstallments}x` },
    { id: "free", label: "Sem juros até", align: "end", cell: p => `${p.interestFreeInstallments}x` },
    { id: "interest", label: "Juros ao mês", align: "end", cell: p => p.monthlyInterestBasisPoints ? `${formatBasisPoints(p.monthlyInterestBasisPoints)}%` : "Sem juros" },
    { id: "minimum", label: "Parcela mínima", align: "end", cell: p => formatBRL(p.minimumInstallment) },
    { id: "upfront", label: "Desconto à vista", align: "end", cell: p => p.upfrontDiscountBasisPoints ? `${formatBasisPoints(p.upfrontDiscountBasisPoints)}%` : "—" },
  ];

  return <>
    {!isLoading && policies.length === 0
      ? <EmptyState variant="featured" icon="coin" title="Defina como vocês parcelam" description="Por exemplo: até 12x no cartão, 3x sem juros e 1,99% ao mês a partir da 4ª, com parcela mínima de R$ 50. O negócio simula as parcelas com essa regra." action={<Button icon={<Icon name="plus" />} onClick={openCreate}>Nova política</Button>} />
      : <>
        <div className={styles.toolbar}><Button icon={<Icon name="plus" />} onClick={openCreate}>Nova política</Button></div>
        <DataTable label="Políticas de parcelamento" rows={policies} columns={columns} rowKey={p => p.id} rowLabel={p => p.name} state={isLoading ? "loading" : "ready"} onRowOpen={openEdit}
          actions={p => <Button size="sm" variant="ghost" iconOnly icon={<Icon name="trash" />} aria-label={`Excluir ${p.name}`} onClick={() => setRemoving(p)} />} />
      </>}

    <ActionModal open={draft !== null} onOpenChange={next => { if (!next) close(); }} title={draft?.id ? "Editar política" : "Nova política de parcelamento"} confirmLabel={draft?.id ? "Salvar política" : "Criar política"} size="workspace" onConfirm={save}>
      {draft && <div className={styles.policyEditor}>
        <div className={styles.form}>
          <Field><Label>Nome</Label><Input value={draft.name} placeholder="Cartão de crédito" onChange={e => setDraft({ ...draft, name: e.currentTarget.value })} /></Field>
          <div className={styles.pair}>
            <Field><Label>Máximo de parcelas</Label><Input numeric inputMode="numeric" value={draft.maxInstallments} onChange={e => setDraft({ ...draft, maxInstallments: e.currentTarget.value.replace(/\D/g, "") })} /></Field>
            <Field><Label>Sem juros até</Label><Input numeric inputMode="numeric" value={draft.interestFreeInstallments} onChange={e => setDraft({ ...draft, interestFreeInstallments: e.currentTarget.value.replace(/\D/g, "") })} /></Field>
          </div>
          <div className={styles.pair}>
            <Field><Label>Juros ao mês (Tabela Price)</Label><PercentInput label="Juros ao mês" value={draft.monthlyInterestBasisPoints} onValueChange={monthlyInterestBasisPoints => setDraft({ ...draft, monthlyInterestBasisPoints })} /></Field>
            <Field><Label>Parcela mínima</Label><MoneyInput label="Parcela mínima" value={draft.minimumInstallment} onValueChange={minimumInstallment => setDraft({ ...draft, minimumInstallment })} /></Field>
          </div>
          <Field><Label>Desconto para pagamento à vista</Label><PercentInput label="Desconto à vista" value={draft.upfrontDiscountBasisPoints} onValueChange={upfrontDiscountBasisPoints => setDraft({ ...draft, upfrontDiscountBasisPoints })} /></Field>
          <div className={styles.pair}>
            <Switch checked={draft.isDefault} onCheckedChange={isDefault => setDraft({ ...draft, isDefault })}>Padrão dos negócios novos</Switch>
            <Switch checked={draft.active} onCheckedChange={active => setDraft({ ...draft, active })}>{draft.active ? "Ativa" : "Desativada"}</Switch>
          </div>
        </div>
        <AmountSummary label={`Simulação para ${formatBRL(SIMULATED)}`} items={simulation.map(option => ({
          label: option.installments === 1 ? "À vista" : `${option.installments}x${option.interestFree ? " sem juros" : ""}`,
          value: option.installments === 1 ? formatBRL(option.total) : `${formatBRL(option.installmentAmount)}${option.interestFree ? "" : ` · total ${formatBRL(option.total)}`}`,
        }))} totalLabel={simulation.length ? `Até ${simulation[simulation.length - 1]!.installments}x` : "Sem opções"} total={simulation.length ? formatBRL(simulation[simulation.length - 1]!.total) : "—"} />
      </div>}
    </ActionModal>

    <ActionModal open={removing !== null} onOpenChange={next => { if (!next) setRemoving(null); }} title="Excluir política?" confirmLabel="Excluir política" onConfirm={remove}>
      <Text as="p">Negócios que usam {removing?.name} ficam sem política de parcelamento e voltam a pagamento à vista.</Text>
    </ActionModal>
  </>;
}
