import { createEventsCollection, type EventsCollection } from "@spark/data";

let events: EventsCollection | undefined;
export function getEventsCollection(): EventsCollection {
  events ??= createEventsCollection();
  return events;
}
