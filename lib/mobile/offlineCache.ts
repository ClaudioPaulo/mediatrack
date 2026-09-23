'use client';

import { Preferences } from '@capacitor/preferences';

const CACHE_KEY = 'library-snapshot-v1';

/**
 * Guarda uma cópia local da biblioteca (JSON) para continuar visível sem
 * internet — ex.: em viagem/férias. Só leitura offline; ações (marcar
 * progresso, etc.) continuam a exigir ligação, porque escrevem no Supabase.
 */
export async function cacheLibrarySnapshot(data: unknown): Promise<void> {
  try {
    await Preferences.set({
      key: CACHE_KEY,
      value: JSON.stringify({ data, cachedAt: Date.now() }),
    });
  } catch {
    // armazenamento indisponível — não é crítico, ignora
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
