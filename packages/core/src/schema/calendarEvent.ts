import { z } from "zod";
import { ActivityAvailabilitySchema } from "./activity.js";
import { zCalendarEventId, zIntegrationConnectionId, zOrgId, zServerTimestamp, zUserId } from "./zodHelpers.js";

export const CALENDAR_PROVIDERS = ["google_calendar", "outlook_calendar", "apple_calendar"] as const;
export const CalendarProviderSchema = z.enum(CALENDAR_PROVIDERS);
export type CalendarProvider = z.infer<typeof CalendarProviderSchema>;

/** Evento externo normalizado. Credenciais e payload bruto nunca entram aqui. */
export const CalendarEventSchema = z.object({
  id: zCalendarEventId,
  orgId: zOrgId,
  ownerId: zUserId,
  connectionId: zIntegrationConnectionId,
  provider: CalendarProviderSchema,
  externalId: z.string().min(1).max(1000),
  calendarName: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).nullable(),
  startsAt: zServerTimestamp,
  endsAt: zServerTimestamp,
  allDay: z.boolean(),
  availability: ActivityAvailabilitySchema,
  location: z.string().max(500).nullable(),
  status: z.enum(["confirmed", "tentative", "cancelled"]),
  syncedAt: zServerTimestamp,
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
