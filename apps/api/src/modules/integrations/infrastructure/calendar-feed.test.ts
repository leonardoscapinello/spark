import { describe, expect, it } from "vitest";
import ical from "node-ical";
import { calendarFeedUrl, normalizeCalendarFeed } from "./calendar-feed.js";

describe("calendar feed", () => {
  it("accepts only the selected provider HTTPS host", () => {
    expect(calendarFeedUrl("google_calendar", "webcal://calendar.google.com/calendar/ical/private/basic.ics").protocol).toBe("https:");
    expect(() => calendarFeedUrl("google_calendar", "https://127.0.0.1/secret.ics")).toThrow();
    expect(() => calendarFeedUrl("outlook_calendar", "https://calendar.google.com/a.ics")).toThrow();
  });

  it("expands recurring events into normalized intervals", () => {
    const feed = ical.sync.parseICS(`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:weekly-call\nDTSTART:20260914T130000Z\nDTEND:20260914T133000Z\nRRULE:FREQ=WEEKLY;COUNT=2\nSUMMARY:Ligação semanal\nDESCRIPTION:Alinhamento do time\nLOCATION:Sala 2\nEND:VEVENT\nEND:VCALENDAR`);
    const events = normalizeCalendarFeed(feed, new Date("2026-09-13T00:00:00Z"), new Date("2026-09-30T00:00:00Z"));
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ title: "Ligação semanal", description: "Alinhamento do time", location: "Sala 2", availability: "busy" });
    expect(events[1]?.externalId).not.toBe(events[0]?.externalId);
  });
});
