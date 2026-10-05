import { useState } from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { dealAdjustmentsControllerApplyCoupon, dealTermsControllerUpdate } from "@spark/api-client";
import {
  RECURRING_INTERVALS, dealAdjustmentId, formatBasisPoints, formatBRL, installmentOptions, money, normalizeCouponCode, pricingOfDeal, toCents, toInstallmentPolicy,
  type Deal, type DealAdjustment, type DealPricing, type DealProduct, type InstallmentPolicyRecord, type InstallmentQuote, type Money, type PricingStep, type RecurringInterval,
} from "@spark/core";
import { adjustmentForInsert, syncedAmount } from "@spark/data";
import { ActionModal, AmountSummary, Button, Field, Icon, InlineField, Input, Label, ListRow, MoneyInput, PercentInput, RowList, SectionTitle, Select, Text, notify, type IconName } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getDealAdjustmentsCollection, getInstallmentPoliciesCollection } from "../lib/deal-pricing-collections.client";
import styles from "./DealPricing.module.css";

/**
 * Precificação do negócio na tela (ADR-0046): a mesma `pricingOfDeal` que o
 * servidor usa para gravar `deals.amount`, então o número que a pessoa vê é o
 * que o funil soma.
 */

export const INTERVAL_LABEL: Record<RecurringInterval, { name: string; per: string; cycle: [string, string] }> = {
  month: { name: "Mensal", per: "/mês", cycle: ["mês", "meses"] },
  quarter: { name: "Trimestral", per: "/trimestre", cycle: ["trimestre", "trimestres"] },
  semester: { name: "Semestral", per: "/semestre", cycle: ["semestre", "semestres"] },
  year: { name: "Anual", per: "/ano", cycle: ["ano", "anos"] },
};
const plural = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;
const signed = (step: PricingStep) => toCents(step.amount) < 0 ? `−${formatBRL(money(-toCents(step.amount)))}` : `+${formatBRL(step.amount)}`;

export interface DealPricingState {
  pricing: DealPricing;
  adjustments: DealAdjustment[];
  policies: InstallmentPolicyRecord[];
  policy: InstallmentPolicyRecord | null;
  options: InstallmentQuote[];
  quote: InstallmentQuote | null;
  interval: RecurringInterval;
}

/** Itens + ajustes + condições → cascata, assinatura e parcelamento, ao vivo. */
export function useDealPricing(deal: Deal | undefined, items: readonly DealProduct[]): DealPricingState {
  const dealId = deal?.id;
  const { data: rows = [] } = useLiveQuery(q => dealId ? q.from({ adjustment: getDealAdjustmentsCollection() }).where(({ adjustment }) => eq(adjustment.dealId, dealId)).orderBy(({ adjustment }) => adjustment.createdAt, "asc") : undefined, [dealId]);
  const { data: allPolicies = [] } = useLiveQuery(q => q.from({ policy: getInstallmentPoliciesCollection() }).orderBy(({ policy }) => policy.name, "asc"), []);
  const adjustments = rows.map(row => ({ ...row, amount: syncedAmount(row.amount) }));
  const policies = allPolicies.map(policy => ({ ...policy, minimumInstallment: syncedAmount(policy.minimumInstallment) }));
  const pricing = pricingOfDeal(deal ?? { subscriptionInterval: null, subscriptionCycles: null, contractMonths: 12 }, items.map(item => ({ ...item, unitAmount: syncedAmount(item.unitAmount), discountAmount: item.discountAmount === undefined ? undefined : syncedAmount(item.discountAmount) })), adjustments);
  const policy = policies.find(p => p.id === deal?.installmentPolicyId) ?? null;
  const options = policy ? installmentOptions(pricing.once.total, toInstallmentPolicy(policy)) : [];
  const quote = options.find(option => option.installments === (deal?.installments ?? 1)) ?? null;
  return { pricing, adjustments, policies, policy, options, quote, interval: deal?.subscriptionInterval ?? "month" };
}

/* ------------------------------------------------------------------ */
/* Ajustes: descontos, cupons e taxas                                  */
/* ------------------------------------------------------------------ */

interface AdjustmentDraft { id: string | null; kind: "discount" | "fee"; label: string; valueType: "percent" | "amount"; basisPoints: number | null; amount: Money | null; appliesTo: "once" | "recurring"; cycles: string }
const KIND: Record<DealAdjustment["kind"], { icon: IconName; title: string }> = {
  discount: { icon: "arrowDown", title: "Desconto" },
  coupon: { icon: "tag", title: "Cupom" },
  fee: { icon: "coin", title: "Taxa" },
};
const FEE_PRESETS = ["Taxa de setup", "Taxa de implantação", "Taxa de serviço", "Frete"];

export function DealAdjustments({ deal, state, canWrite }: { deal: Deal; state: DealPricingState; canWrite: boolean }) {
  const session = getSession();
  const [draft, setDraft] = useState<AdjustmentDraft | null>(null);
  const [couponOpen, setCouponOpen] = useState(false);
  const [code, setCode] = useState("");
  const hasRecurring = state.pricing.recurring !== null;
  const stepAmount = new Map([...state.pricing.once.steps, ...(state.pricing.recurring?.steps ?? [])].map(step => [step.id, step]));

  function describe(adjustment: DealAdjustment) {
    const value = adjustment.valueType === "percent" ? `${formatBasisPoints(adjustment.basisPoints)}%` : formatBRL(adjustment.amount);
    const stream = adjustment.appliesTo === "once" ? "valor único" : `assinatura${adjustment.cycles ? `, ${plural(adjustment.cycles, INTERVAL_LABEL[state.interval].cycle)} primeiros` : ""}`;
    return `${value} · ${stream}`;
  }

  async function save() {
    if (!draft || !session) return;
    if (!draft.label.trim()) throw new Error("Dê um nome ao ajuste.");
    const basisPoints = draft.valueType === "percent" ? draft.basisPoints ?? 0 : 0;
    const amount = draft.valueType === "amount" ? draft.amount ?? money(0) : money(0);
    if (draft.valueType === "percent" ? basisPoints <= 0 : toCents(amount) <= 0) throw new Error("Informe o valor.");
    const fields = { label: draft.label.trim(), valueType: draft.valueType, basisPoints, amount, appliesTo: hasRecurring ? draft.appliesTo : "once" as const, cycles: hasRecurring && draft.appliesTo === "recurring" && draft.cycles ? Number(draft.cycles) : null };
    const collection = getDealAdjustmentsCollection();
    if (draft.id) {
      await collection.update(draft.id, row => { Object.assign(row, fields); }).isPersisted.promise;
    } else {
      const now = new Date().toISOString();
      const record: DealAdjustment = { id: dealAdjustmentId.create(), orgId: session.orgId, dealId: deal.id, kind: draft.kind, couponId: null, sortOrder: state.adjustments.length, createdAt: now, updatedAt: now, ...fields };
      await collection.insert(adjustmentForInsert(record)).isPersisted.promise;
    }
    notify({ title: draft.id ? "Ajuste atualizado" : `${KIND[draft.kind].title} adicionado`, description: fields.label, tone: "success" });
  }

  async function applyCoupon() {
    const normalized = normalizeCouponCode(code);
    if (!normalized) throw new Error("Digite o código do cupom.");
    const response = await dealAdjustmentsControllerApplyCoupon({ id: dealAdjustmentId.create(), dealId: deal.id, code: normalized });
    await getDealAdjustmentsCollection().utils.awaitTxId(response.txid);
    notify({ title: "Cupom aplicado", description: normalized, tone: "success" });
    setCode("");
  }

  async function remove(adjustment: DealAdjustment) {
    try {
      await getDealAdjustmentsCollection().delete(adjustment.id).isPersisted.promise;
      notify({ title: "Ajuste removido", description: adjustment.label, tone: "success" });
    } catch (cause) {
      notify({ title: "Não foi possível remover o ajuste", ...(cause instanceof Error ? { description: cause.message } : {}), tone: "error" });
    }
  }

  const open = (kind: AdjustmentDraft["kind"]) => setDraft({ id: null, kind, label: kind === "fee" ? "Taxa de setup" : "Desconto comercial", valueType: kind === "fee" ? "amount" : "percent", basisPoints: null, amount: null, appliesTo: "once", cycles: "" });

  return <section className={styles.adjustments} aria-label="Descontos, cupons e taxas">
    <SectionTitle level="card" description="Ajustes do negócio inteiro, aplicados depois dos itens." actions={canWrite ? <div className={styles.actions}>
      <Button size="sm" variant="secondary" icon={<Icon name="arrowDown" />} onClick={() => open("discount")}>Desconto</Button>
      <Button size="sm" variant="secondary" icon={<Icon name="tag" />} onClick={() => setCouponOpen(true)}>Cupom</Button>
      <Button size="sm" variant="secondary" icon={<Icon name="coin" />} onClick={() => open("fee")}>Taxa</Button>
    </div> : undefined}>Descontos, cupons e taxas</SectionTitle>
    {state.adjustments.length === 0
      ? <Text size="pequeno" tone="muted">Sem ajustes. Desconto comercial, cupom ou taxa de setup entram aqui.</Text>
      : <RowList label="Ajustes do negócio">{state.adjustments.map((adjustment, index) => {
          const step = stepAmount.get(adjustment.id);
          return <ListRow key={adjustment.id} index={index} icon={KIND[adjustment.kind].icon} title={adjustment.label} description={`${KIND[adjustment.kind].title} · ${describe(adjustment)}`}
            meta={<Text size="pequeno" weight="medium" mono>{step ? signed(step) : "—"}</Text>}
            trailing={canWrite ? <>
              {adjustment.kind !== "coupon" && <Button size="sm" variant="ghost" iconOnly icon={<Icon name="pencil" />} aria-label={`Editar ${adjustment.label}`} onClick={() => setDraft({ id: adjustment.id, kind: adjustment.kind === "fee" ? "fee" : "discount", label: adjustment.label, valueType: adjustment.valueType, basisPoints: adjustment.basisPoints, amount: adjustment.amount, appliesTo: adjustment.appliesTo, cycles: adjustment.cycles ? String(adjustment.cycles) : "" })} />}
              <Button size="sm" variant="ghost" iconOnly icon={<Icon name="trash" />} aria-label={`Remover ${adjustment.label}`} onClick={() => void remove(adjustment)} />
            </> : undefined} />;
        })}</RowList>}

    <ActionModal open={draft !== null} onOpenChange={next => { if (!next) setDraft(null); }} title={draft ? `${draft.id ? "Editar" : "Adicionar"} ${draft.kind === "fee" ? "taxa" : "desconto"}` : ""} confirmLabel={draft?.id ? "Salvar" : "Adicionar"} onConfirm={save}>
      {draft && <div className={styles.form}>
        <Field><Label>Nome</Label><Input value={draft.label} onChange={e => setDraft({ ...draft, label: e.currentTarget.value })} /></Field>
        {draft.kind === "fee" && <div className={styles.presets}>{FEE_PRESETS.map(preset => <Button key={preset} size="sm" variant={draft.label === preset ? "secondary" : "ghost"} onClick={() => setDraft({ ...draft, label: preset })}>{preset}</Button>)}</div>}
        <div className={styles.pair}>
          <Field><Label>Tipo</Label><Select label="Tipo do valor" value={draft.valueType} options={[{ value: "percent", label: "Percentual" }, { value: "amount", label: "Valor fixo" }]} onValueChange={value => { if (value === "percent" || value === "amount") setDraft({ ...draft, valueType: value }); }} /></Field>
          {draft.valueType === "percent"
            ? <Field><Label>Valor</Label><PercentInput label="Percentual" value={draft.basisPoints} onValueChange={basisPoints => setDraft({ ...draft, basisPoints })} /></Field>
            : <Field><Label>Valor</Label><MoneyInput label="Valor" value={draft.amount} onValueChange={amount => setDraft({ ...draft, amount })} /></Field>}
        </div>
        {hasRecurring && <div className={styles.pair}>
          <Field><Label>Vale para</Label><Select label="Vale para" value={draft.appliesTo} options={[{ value: "once", label: "Valor único" }, { value: "recurring", label: "Assinatura" }]} onValueChange={value => { if (value === "once" || value === "recurring") setDraft({ ...draft, appliesTo: value }); }} /></Field>
          {draft.appliesTo === "recurring" && <Field><Label>Nos primeiros</Label><Input numeric inputMode="numeric" value={draft.cycles} placeholder={`Todos os ${INTERVAL_LABEL[state.interval].cycle[1]}`} onChange={e => setDraft({ ...draft, cycles: e.currentTarget.value.replace(/\D/g, "") })} /></Field>}
        </div>}
      </div>}
    </ActionModal>

    <ActionModal open={couponOpen} onOpenChange={setCouponOpen} title="Aplicar cupom" confirmLabel="Aplicar" onConfirm={applyCoupon}>
      <div className={styles.form}>
        <Field><Label>Código do cupom</Label><Input value={code} placeholder="BLACKFRIDAY" autoFocus onChange={e => setCode(e.currentTarget.value)} /></Field>
        <Text size="pequeno" tone="secondary">O sistema confere validade, subtotal mínimo e limite de usos. Os cupons ficam em Configurações → Comercial.</Text>
      </div>
    </ActionModal>
  </section>;
}

/* ------------------------------------------------------------------ */
/* Cascata, assinatura e parcelamento                                  */
/* ------------------------------------------------------------------ */

export function DealPricingSummary({ deal, state, canWrite, awaitDealTxid }: { deal: Deal; state: DealPricingState; canWrite: boolean; awaitDealTxid: (txid: number) => Promise<unknown> }) {
  const { pricing, policies, policy, options, quote, interval } = state;
  const label = INTERVAL_LABEL[interval];

  async function saveTerms(changes: Parameters<typeof dealTermsControllerUpdate>[1]) {
    try {
      const response = await dealTermsControllerUpdate(deal.id, changes);
      await awaitDealTxid(response.txid);
    } catch (cause) {
      notify({ title: "Não foi possível salvar as condições", ...(cause instanceof Error ? { description: cause.message } : {}), tone: "error" });
      throw cause;
    }
  }

  const cascade = (steps: readonly PricingStep[]) => steps.filter(step => step.kind !== "total").map(step => ({ label: step.label, value: step.kind === "subtotal" ? formatBRL(step.amount) : signed(step) }));
  const activePolicies = policies.filter(p => p.active || p.id === policy?.id);
  const cycles = pricing.recurringCycles;

  return <div className={styles.summary}>
    <AmountSummary label={pricing.recurring ? "Valor único" : "Composição do valor"} items={cascade(pricing.once.steps)} totalLabel={pricing.recurring ? "Total único" : "Valor do negócio"} total={formatBRL(pricing.once.total)} />

    {pricing.recurring && <>
      <AmountSummary label={`Assinatura ${label.name.toLowerCase()}`} items={cascade(pricing.recurring.steps)} totalLabel={`Por ${label.cycle[0]}`} total={`${formatBRL(pricing.recurring.total)}${label.per}`} />
      <AmountSummary label="Contrato" items={[
        { label: "Valor único", value: formatBRL(pricing.once.total) },
        { label: `Assinatura · ${plural(cycles, label.cycle)}${deal.subscriptionCycles ? "" : " (referência)"}`, value: formatBRL(pricing.recurringContractTotal) },
      ]} totalLabel="Valor do negócio" total={formatBRL(pricing.contractValue)} />
      <div className={styles.terms}>
        <SectionTitle level="card">Assinatura</SectionTitle>
        <InlineField label="Cobrança" value={label.name} disabled={!canWrite}>
          {close => <Select label="Intervalo da assinatura" value={interval} options={RECURRING_INTERVALS.map(value => ({ value, label: INTERVAL_LABEL[value].name }))} onValueChange={value => close(saveTerms({ subscriptionInterval: value as RecurringInterval }))} />}
        </InlineField>
        <InlineField label="Duração" value={deal.subscriptionCycles ? plural(deal.subscriptionCycles, label.cycle) : "Até cancelar"} disabled={!canWrite}>
          {close => <Input autoFocus numeric inputMode="numeric" aria-label="Duração em ciclos" placeholder="Vazio = até cancelar" defaultValue={deal.subscriptionCycles ? String(deal.subscriptionCycles) : ""} onBlur={e => { const text = e.currentTarget.value.replace(/\D/g, ""); close(saveTerms({ subscriptionCycles: text ? Number(text) : null })); }} />}
        </InlineField>
        {!deal.subscriptionCycles && <InlineField label="Prazo de referência" value={plural(deal.contractMonths ?? 12, ["mês", "meses"])} hint="Usado para avaliar a assinatura sem fim no funil." disabled={!canWrite}>
          {close => <Input autoFocus numeric inputMode="numeric" aria-label="Prazo de referência em meses" defaultValue={String(deal.contractMonths ?? 12)} onBlur={e => { const months = Number(e.currentTarget.value.replace(/\D/g, "")); close(months >= 1 && months <= 120 ? saveTerms({ contractMonths: months }) : undefined); }} />}
        </InlineField>}
      </div>
    </>}

    <div className={styles.terms}>
      <SectionTitle level="card" description={pricing.recurring ? "Parcelamento do valor único; a assinatura é cobrada a cada ciclo." : undefined}>Pagamento</SectionTitle>
      {activePolicies.length === 0
        ? <Text size="pequeno" tone="muted">Nenhuma política de parcelamento. Crie em Configurações → Comercial → Parcelamento.</Text>
        : <>
          <InlineField label="Política" value={policy?.name ?? "À vista"} empty={!policy} disabled={!canWrite}>
            {close => <Select label="Política de parcelamento" value={policy?.id ?? ""} options={[{ value: "", label: "À vista, sem política" }, ...activePolicies.map(p => ({ value: p.id, label: p.name }))]} onValueChange={value => close(saveTerms({ installmentPolicyId: value || null, installments: 1 }))} />}
          </InlineField>
          {policy && <InlineField label="Parcelas" numeric value={quote ? installmentLabel(quote) : `${deal.installments ?? 1}x — fora da política`} disabled={!canWrite}>
            {close => <Select label="Número de parcelas" value={String(deal.installments ?? 1)} options={options.map(option => ({ value: String(option.installments), label: installmentLabel(option) }))} onValueChange={value => close(saveTerms({ installments: Number(value) }))} />}
          </InlineField>}
          {quote && !quote.interestFree && <AmountSummary label="Com juros" items={[
            { label: "Valor financiado", value: formatBRL(quote.principal) },
            { label: "Juros", value: `+${formatBRL(quote.interest)}` },
          ]} totalLabel="Cliente paga" total={formatBRL(quote.total)} />}
          {quote && quote.upfrontDiscount && toCents(quote.upfrontDiscount) > 0 && <Text size="pequeno" tone="secondary">À vista com {formatBRL(quote.upfrontDiscount)} de desconto: {formatBRL(quote.total)}.</Text>}
        </>}
    </div>
  </div>;
}

function installmentLabel(option: InstallmentQuote): string {
  if (option.installments === 1) return toCents(option.upfrontDiscount) > 0 ? `À vista · ${formatBRL(option.total)} (com desconto)` : `À vista · ${formatBRL(option.total)}`;
  return `${option.installments}x de ${formatBRL(option.installmentAmount)}${option.interestFree ? " sem juros" : ` · total ${formatBRL(option.total)}`}`;
}
