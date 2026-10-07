import { searchTmdb } from './tmdb';
import { searchAniList } from './anilist';
import { searchOpenLibrary } from './openLibrary';
import type { NormalizedMedia } from './types';

/**
 * Unified search: calls the 3 APIs in parallel and returns a single
 * normalized array, ready to map to <MediaCard />. A failure in one
 * API does not take down the others (Promise.allSettled).
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

  // Sort by approximate relevance: closest title match to the query first
  const lowerQuery = trimmed.toLowerCase();
  merged.sort((a, b) => {
    const aExact = a.title.toLowerCase() === lowerQuery ? 0 : 1;
    const bExact = b.title.toLowerCase() === lowerQuery ? 0 : 1;
    return aExact - bExact;
  });

  return merged;
}
