'use client';

import { Preferences } from '@capacitor/preferences';

const CACHE_KEY = 'library-snapshot-v1';

/**
 * Saves a local copy of the library (JSON) so it stays visible without
 * internet, e.g. while traveling. Read-only offline; actions (marking
 * progress, etc.) still need a connection because they write to Supabase.
 */
export async function cacheLibrarySnapshot(data: unknown): Promise<void> {
  try {
    await Preferences.set({
      key: CACHE_KEY,
      value: JSON.stringify({ data, cachedAt: Date.now() }),
    });
  } catch {
    // storage unavailable: not critical, ignore
  }
}

export async function getCachedLibrarySnapshot<T>(): Promise<{ data: T; cachedAt: number } | null> {
  try {
    const { value } = await Preferences.get({ key: CACHE_KEY });
    if (!value) return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
}
