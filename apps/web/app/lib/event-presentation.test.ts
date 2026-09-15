import { describe, expect, it } from "vitest";
import type { CustomFieldDefinition, Event } from "@spark/core";
import { toTimelineItem } from "./event-presentation";

function definition(): CustomFieldDefinition {
  return {
    id: "cfd_1", orgId: "org_1", entityType: "deal", key: "orcamento", label: "Orçamento do cliente",
    type: "currency", required: false, createdBy: "usr_1",
    createdAt: "2026-09-15T00:00:00.000Z", updatedAt: "2026-09-15T00:00:00.000Z", archivedAt: null,
  } as unknown as CustomFieldDefinition;
}

function updated(field: string, before: unknown, after: unknown): Event {
  return {
    id: "evt_1", orgId: "org_1", contactId: null, dealId: "dea_1", companyId: null, actorUserId: null,
    type: "deal.updated", data: { changes: [{ field, before, after }] }, occurredAt: "2026-09-15T00:00:00.000Z",
  } as unknown as Event;
}

/**
 * O histórico mostrava o que está no BANCO em vez do que a pessoa vê: moeda
 * em centavo cru («700000»), data em ISO. Quem lê o histórico é a mesma
 * pessoa que leu o painel — os dois números têm de ser o mesmo número.
 */
/** `Intl` separa «R$» do número com espaço fino; o teste compara o texto, não o byte. */
function legivel(texto: string | undefined): string | undefined {
  return texto?.replace(/\u00a0/g, " ");
}

describe("toTimelineItem", () => {
  it("lê campo personalizado pela definição dele", () => {
    const item = toTimelineItem(updated("custom:orcamento", 9_000, 700_000), { customFields: [definition()] });
    const [mudanca] = item.changes ?? [];
    expect({ ...mudanca, before: legivel(mudanca?.before), after: legivel(mudanca?.after) })
      .toEqual({ label: "Orçamento do cliente", before: "R$ 90,00", after: "R$ 7.000,00" });
  });

  it("campo personalizado vazio continua dizendo «Sem valor»", () => {
    const item = toTimelineItem(updated("custom:orcamento", null, 90), { customFields: [definition()] });
    expect(item.changes?.[0]?.before).toBe("Sem valor");
    expect(legivel(item.changes?.[0]?.after)).toBe("R$ 0,90");
  });

  it("sem a definição em mãos, mostra o valor como veio em vez de sumir", () => {
    const item = toTimelineItem(updated("custom:orcamento", null, 90));
    expect(item.changes?.[0]).toMatchObject({ label: "orcamento", after: "90" });
  });
});
