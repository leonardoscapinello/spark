import { useCallback, useEffect } from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { userId as userIdFactory, type UserPreferenceValue } from "@spark/core";
import { createUserPreferencesCollection, optimisticUserPreference, type UserPreferencesCollection } from "@spark/data";
import { getSession } from "./auth.client";

let preferences: UserPreferencesCollection | undefined;
export function getUserPreferencesCollection(): UserPreferencesCollection { preferences ??= createUserPreferencesCollection(); return preferences; }

const CACHE_PREFIX = "spark_pref:";
function readCache<T>(key: string): T | undefined {
  try { const raw = localStorage.getItem(CACHE_PREFIX + key); return raw === null ? undefined : (JSON.parse(raw) as T); } catch { return undefined; }
}
function writeCache(key: string, value: unknown): void {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value)); } catch { /* modo privado: fica só o valor sincronizado */ }
}

/**
 * Preferência de interface que segue a pessoa entre dispositivos: lê da
 * coleção `user_preferences` (sincronizada pelo Electric, só as linhas do
 * próprio usuário) e grava otimista pela API. O localStorage entra só como
 * cache da primeira pintura — sem ele a sidebar fixada abriria recolhida
 * por um instante até a sincronização chegar — e é atualizado a cada
 * valor sincronizado. Fonte da verdade é o banco (CLAUDE.md, regra 4).
 *
 * `has` diz se existe preferência gravada: telas que tratam «nunca
 * escolheu» diferente de «escolheu o padrão» precisam disso.
 */
export function usePreference<T extends UserPreferenceValue>(key: string, fallback: T): [value: T, set: (next: T) => void, has: boolean] {
  const collection = getUserPreferencesCollection();
  const { data } = useLiveQuery({ query: (q) => q.from({ preferences: collection }).where(({ preferences: preference }) => eq(preference.key, key)) }, [key]);
  const row = data?.[0];
  const cached = typeof window === "undefined" ? undefined : readCache<T>(key);
  const has = row !== undefined || cached !== undefined;
  const value = (row ? row.value : cached ?? fallback) as T;

  useEffect(() => { if (row) writeCache(key, row.value); }, [key, row]);

  const set = useCallback((next: T) => {
    writeCache(key, next);
    const session = getSession();
    if (!session) return;
    const existing = collection.toArray.find((preference) => preference.key === key);
    if (existing) collection.update(existing.id, (draft) => { draft.value = next; });
    else collection.insert(optimisticUserPreference(key, next, session.orgId, userIdFactory.from(session.userId)));
  }, [collection, key]);

  return [value, set, has];
}
