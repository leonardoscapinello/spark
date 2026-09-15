import ical, { type CalendarResponse, type ParameterValue, type VEvent } from "node-ical";
import type { CalendarProvider } from "@spark/core";

const HOSTS: Record<CalendarProvider, readonly string[]> = {
  google_calendar: ["calendar.google.com"],
  outlook_calendar: ["outlook.live.com", "outlook.office365.com", "outlook.office.com"],
  apple_calendar: ["icloud.com", "me.com"],
};

export interface NormalizedCalendarEvent {
  externalId: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  availability: "free" | "busy";
  location: string | null;
  status: "confirmed" | "tentative" | "cancelled";
}

export function calendarFeedUrl(provider: CalendarProvider, rawUrl: string): URL {
  const normalized = rawUrl.trim().replace(/^webcal:/i, "https:");
  const url = new URL(normalized);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Use um endereço privado iCal em HTTPS.");
  const allowed = HOSTS[provider].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  if (!allowed) throw new Error("O endereço iCal não pertence ao provedor selecionado.");
  return url;
}

export async function loadCalendarFeed(provider: CalendarProvider, feedUrl: string): Promise<CalendarResponse> {
  const url = calendarFeedUrl(provider, feedUrl);
  const response = await fetch(url, { redirect: "follow", headers: { accept: "text/calendar" }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`A agenda respondeu com HTTP ${response.status}.`);
  const body = await response.text();
  if (!body.includes("BEGIN:VCALENDAR")) throw new Error("O endereço não retornou uma agenda iCal válida.");
  return ical.async.parseICS(body);
}

export function normalizeCalendarFeed(feed: CalendarResponse, from: Date, to: Date): NormalizedCalendarEvent[] {
  const result: NormalizedCalendarEvent[] = [];
  for (const component of Object.values(feed)) {
    if (component.type !== "VEVENT") continue;
    const event = component as VEvent;
    for (const instance of ical.expandRecurringEvent(event, { from, to, includeOverrides: true, excludeExdates: true, expandOngoing: true })) {
      if (instance.end < from || instance.start > to) continue;
      const source = instance.event;
      result.push({
        externalId: `${source.uid || event.uid}:${instance.start.toISOString()}`,
        title: parameterText(instance.summary) || "Compromisso sem título",
        description: nullableText(source.description),
        startsAt: instance.start,
        endsAt: instance.end,
        allDay: instance.isFullDay,
        availability: String(source.transparency ?? "").toUpperCase() === "TRANSPARENT" ? "free" : "busy",
        location: nullableText(source.location),
        status: calendarStatus(source.status),
      });
    }
  }
  return result;
}

function parameterText(value: ParameterValue | undefined): string {
  if (typeof value === "string") return value.trim();
  return value && typeof value.val === "string" ? value.val.trim() : "";
}
function nullableText(value: ParameterValue | undefined): string | null { return parameterText(value) || null; }
function calendarStatus(value: VEvent["status"]): NormalizedCalendarEvent["status"] {
  const status = String(value ?? "CONFIRMED").toUpperCase();
  return status === "CANCELLED" ? "cancelled" : status === "TENTATIVE" ? "tentative" : "confirmed";
}
