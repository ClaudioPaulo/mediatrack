import { searchTmdb } from './tmdb';
import { searchAniList } from './anilist';
import { searchOpenLibrary } from './openLibrary';
import type { NormalizedMedia } from './types';

/**
 * Pesquisa unificada: dispara as 3 APIs em paralelo e devolve um único array
 * normalizado, já pronto a mapear para <MediaCard />. Falhas individuais de
 * uma API não derrubam as outras (Promise.allSettled).
 */
export async function searchAllSources(query: string): Promise<NormalizedMedia[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const results = await Promise.allSettled([
    searchTmdb(trimmed),
    searchAniList(trimmed),
    searchOpenLibrary(trimmed),
  ]);

  const merged: NormalizedMedia[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') merged.push(...r.value);
    else console.error('Falha numa fonte de pesquisa:', r.reason);
  }

  // Ordena por relevância aproximada: título mais próximo da query primeiro
  const lowerQuery = trimmed.toLowerCase();
  merged.sort((a, b) => {
    const aExact = a.title.toLowerCase() === lowerQuery ? 0 : 1;
    const bExact = b.title.toLowerCase() === lowerQuery ? 0 : 1;
    return aExact - bExact;
  });

  return merged;
}
