import { z } from "zod";
import { zOrgId, zActivityId, zContactId, zDealId, zServerTimestamp, zUserId } from "./zodHelpers.js";

/** Pipedrive parity — the actual product vocabulary of the tool we're replacing. */
export const ACTIVITY_TYPES = ["task", "call", "meeting", "email", "lunch", "deadline"] as const;
export const ActivityTypeSchema = z.enum(ACTIVITY_TYPES);
/** Rótulo e ícone de cada tipo — um lugar só, para tela e automação concordarem. */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  task: "Tarefa", call: "Ligação", meeting: "Reunião", email: "E-mail", lunch: "Almoço", deadline: "Prazo",
};
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export const ACTIVITY_PRIORITIES = ["none", "low", "medium", "high"] as const;
export const ActivityPrioritySchema = z.enum(ACTIVITY_PRIORITIES);
export type ActivityPriority = z.infer<typeof ActivityPrioritySchema>;

export const ACTIVITY_AVAILABILITIES = ["free", "busy"] as const;
export const ActivityAvailabilitySchema = z.enum(ACTIVITY_AVAILABILITIES);
export type ActivityAvailability = z.infer<typeof ActivityAvailabilitySchema>;

/**
 * Activity — linked to a contact and/or a deal (at least one of the two;
 * not enforced here as a cross-field schema rule, same choice already
 * made in `DealSchema.lossReason` — the screen guarantees it). Lives as
 * its own entity, not a field inside Contact/Deal, because a contact has many.
 */
export const ActivitySchema = z.object({
  id: zActivityId,
  orgId: zOrgId,
  contactId: zContactId.nullable(),
  dealId: zDealId.nullable(),
  type: ActivityTypeSchema,
  title: z.string().min(1, { error: "Title is required" }).max(200),
  /** Descrição compartilhável com calendário e participantes. */
  description: z.string().max(5000).nullable(),
  /** Nota privada da equipe — não deve sair em convite de calendário. */
  notes: z.string().max(2000).nullable(),
  scheduledAt: zServerTimestamp,
  /** Quanto tempo reservar na agenda. 0 = compromisso sem duração (um prazo). */
  durationMinutes: z.number().int().min(0).max(24 * 60).default(30),
  /** Onde acontece — endereço, sala, link da chamada. */
  location: z.string().max(300).nullable(),
  videoCallUrl: z.string().url().max(2000).nullable(),
  priority: ActivityPrioritySchema.default("none"),
  /** Livre permite sobreposição; ocupado reserva o horário do responsável. */
  availability: ActivityAvailabilitySchema.default("free"),
  /** Quem vai executar. Sem responsável a atividade é da equipe, não de ninguém. */
  ownerId: zUserId.nullable(),
  completed: z.boolean().default(false),
  completedAt: zServerTimestamp.nullable(),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});

export type Activity = z.infer<typeof ActivitySchema>;

// orgId never comes from the client (docs/adr/0026); id does — optimistic
// writes need the final key before the server responds (docs/adr/0030).
const ActivityCreateFieldsSchema = ActivitySchema.omit({
  orgId: true,
  completed: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
}).partial({ contactId: true, dealId: true, description: true, notes: true, durationMinutes: true, location: true, videoCallUrl: true, priority: true, availability: true, ownerId: true });
export const CreateActivityInputSchema = ActivityCreateFieldsSchema
  .refine((value) => Boolean(value.contactId || value.dealId), { error: "A atividade precisa estar ligada a uma pessoa ou negócio" });
export type CreateActivityInput = z.infer<typeof CreateActivityInputSchema>;

export const CreateActivityResponseSchema = z.object({
  activity: ActivitySchema,
  txid: z.number().int(),
});
export type CreateActivityResponse = z.infer<typeof CreateActivityResponseSchema>;

/** Complete or reopen — the same route both ways, the body decides. */
export const CompleteActivityInputSchema = z.object({
  completed: z.boolean(),
});
export type CompleteActivityInput = z.infer<typeof CompleteActivityInputSchema>;

export const CompleteActivityResponseSchema = z.object({
  activity: ActivitySchema,
  txid: z.number().int(),
});
export type CompleteActivityResponse = z.infer<typeof CompleteActivityResponseSchema>;

/** Editar uma atividade já criada — o Pipedrive permite mudar tudo menos o id. */
export const UpdateActivityInputSchema = ActivityCreateFieldsSchema.omit({ id: true }).partial();
export type UpdateActivityInput = z.infer<typeof UpdateActivityInputSchema>;

/** Fim de uma atividade a partir do seu início e duração — usado pelo calendário. */
export function activityEndsAt(activity: Pick<Activity, "scheduledAt" | "durationMinutes">): string {
  return new Date(new Date(activity.scheduledAt).getTime() + activity.durationMinutes * 60_000).toISOString();
}

export interface ScheduleInterval {
  id: string;
  ownerId: string | null;
  startsAt: string;
  endsAt: string;
  availability: ActivityAvailability;
}

/**
 * Agenda unificada: funciona para atividades Spark e para blocos normalizados
 * de Google, Microsoft ou CalDAV. Intervalos encostados não conflitam.
 */
export function overlappingScheduleIntervals(candidate: ScheduleInterval, intervals: readonly ScheduleInterval[]): ScheduleInterval[] {
  if (!candidate.ownerId || candidate.availability === "free") return [];
  const candidateStart = new Date(candidate.startsAt).getTime();
  const candidateEnd = new Date(candidate.endsAt).getTime();
  return intervals.filter((interval) => interval.id !== candidate.id
    && interval.ownerId === candidate.ownerId
    && interval.availability === "busy"
    && new Date(interval.startsAt).getTime() < candidateEnd
    && new Date(interval.endsAt).getTime() > candidateStart);
}
