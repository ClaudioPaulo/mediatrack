import type { NormalizedMedia } from './types';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w342';

function tmdbHeaders() {
  return {
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_ACCESS_TOKEN}`,
    accept: 'application/json',
  };
}

interface TmdbResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  media_type?: 'movie' | 'tv';
  origin_country?: string[];
}

/**
 * Pesquisa filmes e séries/doramas em simultâneo (multi-search).
 * Doramas são identificados heuristicamente: tv + origin_country coreano/asiático.
 */
export async function searchTmdb(query: string): Promise<NormalizedMedia[]> {
  if (!query.trim()) return [];

  const res = await fetch(
    `${TMDB_BASE}/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=pt-PT`,
    { headers: tmdbHeaders() }
  );
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  const data = await res.json();

  const results: TmdbResult[] = (data.results ?? []).filter(
    (r: TmdbResult) => r.media_type === 'movie' || r.media_type === 'tv'
  );

  return results.map((r) => normalizeTmdbItem(r));
}

const DORAMA_COUNTRIES = ['KR', 'JP', 'CN', 'TW', 'TH'];

function normalizeTmdbItem(r: TmdbResult): NormalizedMedia {
  const isTv = r.media_type === 'tv';
  const isDorama = isTv && r.origin_country?.some((c) => DORAMA_COUNTRIES.includes(c));

  const title = r.title ?? r.name ?? 'Sem título';
  const originalTitle = r.original_title ?? r.original_name;
  const dateStr = r.release_date ?? r.first_air_date;

  return {
    externalId: String(r.id),
    source: 'tmdb',
    category: isDorama ? 'drama' : isTv ? 'tv_series' : 'movie',
    title,
    originalTitle: originalTitle !== title ? originalTitle : undefined,
    synopsis: r.overview,
    coverUrl: r.poster_path ? `${IMG_BASE}${r.poster_path}` : undefined,
    releaseYear: dateStr ? Number(dateStr.slice(0, 4)) : undefined,
    genres: [],
    extra: { tmdbMediaType: r.media_type },
  };
}

/** Detalhes completos de um filme ou série TMDB (usado no modal de detalhes) */
export async function getTmdbDetails(id: string, mediaType: 'movie' | 'tv') {
  const res = await fetch(`${TMDB_BASE}/${mediaType}/${id}?language=pt-PT`, {
    headers: tmdbHeaders(),
  });
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  const data = await res.json();

  return {
    genres: (data.genres ?? []).map((g: { name: string }) => g.name),
    totalEpisodes: data.number_of_episodes,
    numberOfSeasons: data.number_of_seasons,
    runtime: data.runtime ?? data.episode_run_time?.[0],
  };
}
