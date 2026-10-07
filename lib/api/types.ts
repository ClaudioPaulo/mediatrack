export type MediaCategory = 'book' | 'manga' | 'anime' | 'tv_series' | 'drama' | 'movie';
export type MediaSource = 'tmdb' | 'anilist' | 'openlibrary';

/**
 * Single media structure used across the UI, independent of the source API.
 * Each fetcher (tmdb.ts, anilist.ts, openLibrary.ts) converts the raw response
 * from its API into this format.
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
