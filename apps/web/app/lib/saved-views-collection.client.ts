import { createSavedViewsCollection, type SavedViewsCollection } from "@spark/data";
let views: SavedViewsCollection | undefined;
export function getSavedViewsCollection() { views ??= createSavedViewsCollection(); return views; }
