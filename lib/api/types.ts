export type MediaCategory = 'book' | 'manga' | 'anime' | 'tv_series' | 'drama' | 'movie';
export type MediaSource = 'tmdb' | 'anilist' | 'openlibrary';

/**
 * Estrutura única de mídia usada em todo o UI, independente da API de origem.
 * Cada fetcher (tmdb.ts, anilist.ts, openLibrary.ts) converte a resposta bruta
 * da sua API para este formato.
 */
export interface NormalizedMedia {
  externalId: string;
  source: MediaSource;
  category: MediaCategory;
  title: string;
  originalTitle?: string;
  synopsis?: string;
  coverUrl?: string;
  releaseYear?: number;
  genres: string[];
  totalEpisodes?: number;
  totalChapters?: number;
  totalPages?: number;
  extra?: Record<string, unknown>;
}
