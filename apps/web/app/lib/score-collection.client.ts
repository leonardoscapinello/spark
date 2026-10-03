import { createScoreSnapshotsCollection } from "@spark/data";
const collections = new Map<string, ReturnType<typeof createScoreSnapshotsCollection>>();
export function getScoreSnapshotsCollection(contactId: string) {
 let collection = collections.get(contactId);
 if (!collection) { collection = createScoreSnapshotsCollection(contactId); collections.set(contactId,collection); }
 return collection;
}
