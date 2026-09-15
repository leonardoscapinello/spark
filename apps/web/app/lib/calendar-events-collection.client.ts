import { createCalendarEventsCollection, type CalendarEventsCollection } from "@spark/data";

let instance: CalendarEventsCollection | undefined;

export function getCalendarEventsCollection(): CalendarEventsCollection {
  instance ??= createCalendarEventsCollection();
  return instance;
}
