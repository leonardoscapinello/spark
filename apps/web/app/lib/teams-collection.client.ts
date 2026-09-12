import { createTeamsCollection, type TeamsCollection } from "@spark/data";
let collection: TeamsCollection | undefined;
export function getTeamsCollection(): TeamsCollection { collection ??= createTeamsCollection(); return collection; }
