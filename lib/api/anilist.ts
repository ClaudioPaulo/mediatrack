import type { NormalizedMedia } from './types';

const ANILIST_URL = 'https://graphql.anilist.co';

const SEARCH_QUERY = `
query ($search: String, $type: MediaType) {
  Page(page: 1, perPage: 15) {
    media(search: $search, type: $type, sort: SEARCH_MATCH) {
      id
      type
      format
      title { romaji english native }
      description(asHtml: false)
      coverImage { large }
      startDate { year }
      genres
      episodes
      chapters
    }
  }
}`;

interface AniListMedia {
  id: number;
  type: 'ANIME' | 'MANGA';
  title: { romaji?: string; english?: string; native?: string };
  description?: string;
  coverImage: { large?: string };
  startDate: { year?: number };
  genres: string[];
  episodes?: number;
  chapters?: number;
}

async function queryAniList(search: string, type: 'ANIME' | 'MANGA'): Promise<AniListMedia[]> {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: SEARCH_QUERY, variables: { search, type } }),
  });
  if (!res.ok) throw new Error(`AniList error: ${res.status}`);
  const json = await res.json();
  return json.data?.Page?.media ?? [];
}

/** Pesquisa anime e manga em paralelo na AniList */
export async function searchAniList(query: string): Promise<NormalizedMedia[]> {
  if (!query.trim()) return [];

  const [animeResults, mangaResults] = await Promise.all([
    queryAniList(query, 'ANIME'),
    queryAniList(query, 'MANGA'),
  ]);

  return [...animeResults, ...mangaResults].map(normalizeAniListItem);
}

function stripHtml(html?: string) {
  return html?.replace(/<[^>]*>/g, '') ?? undefined;
}

function normalizeAniListItem(m: AniListMedia): NormalizedMedia {
  const title = m.title.english ?? m.title.romaji ?? m.title.native ?? 'Sem título';
  const originalTitle = m.title.native;

  return {
    externalId: String(m.id),
    source: 'anilist',
    category: m.type === 'ANIME' ? 'anime' : 'manga',
    title,
    originalTitle,
    synopsis: stripHtml(m.description),
    coverUrl: m.coverImage?.large,
    releaseYear: m.startDate?.year ?? undefined,
    genres: m.genres ?? [],
    totalEpisodes: m.episodes ?? undefined,
    totalChapters: m.chapters ?? undefined,
  };
}
