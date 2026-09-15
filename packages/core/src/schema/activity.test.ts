import { describe, expect, it } from "vitest";
import { CreateActivityInputSchema } from "./activity.js";

const baseActivity = {
  id: "00000000-0000-7000-8000-000000000001",
  dealId: "00000000-0000-7000-8000-000000000002",
  type: "meeting",
  title: "Reunião de alinhamento",
  scheduledAt: "2026-09-15T13:30:00.000Z",
} as const;

describe("atividade", () => {
  it("aplica a agenda padrão sem esconder dados em JSON", () => {
    expect(CreateActivityInputSchema.parse(baseActivity)).toMatchObject({
      priority: "none",
      availability: "free",
      durationMinutes: 30,
    });
  });

  it("valida prioridade, disponibilidade e link de videochamada", () => {
    expect(CreateActivityInputSchema.safeParse({
      ...baseActivity,
      priority: "high",
      availability: "busy",
      videoCallUrl: "https://meet.google.com/abc-defg-hij",
    }).success).toBe(true);
    expect(CreateActivityInputSchema.safeParse({ ...baseActivity, videoCallUrl: "meet sem protocolo" }).success).toBe(false);
  });
});
