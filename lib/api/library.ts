import { createClient } from '@/lib/supabase/client';
import type { NormalizedMedia } from './types';

/**
 * Ensures the media item exists in the local cache (media_items) and returns
 * its internal id (uuid). Uses upsert on (source, external_id).
 */
export async function ensureMediaItem(media: NormalizedMedia): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('media_items')
    .upsert(
      {
        external_id: media.externalId,
        source: media.source,
        category: media.category,
        title: media.title,
        original_title: media.originalTitle ?? null,
        synopsis: media.synopsis ?? null,
        cover_url: media.coverUrl ?? null,
        release_year: media.releaseYear ?? null,
        genres: media.genres,
        total_episodes: media.totalEpisodes ?? null,
        total_chapters: media.totalChapters ?? null,
        total_pages: media.totalPages ?? null,
        extra: media.extra ?? {},
      },
      { onConflict: 'source,external_id' }
    )
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export type LibraryStatus = 'watching_reading' | 'completed' | 'backlog' | 'favorite';

export interface LibraryProgress {
  currentSeason?: number;
  currentEpisode?: number;
  currentChapter?: number;
  currentVolume?: number;
  currentPage?: number;
}

/** Adds or updates the status (and optionally the progress) of an item in the current user's library */
export async function upsertLibraryEntry(
  userId: string,
  mediaItemId: string,
  status: LibraryStatus,
  progress?: LibraryProgress
) {
  const supabase = createClient();
  const { error } = await supabase.from('user_library').upsert(
    {
      user_id: userId,
      media_item_id: mediaItemId,
      status,
      current_season: progress?.currentSeason ?? null,
      current_episode: progress?.currentEpisode ?? null,
      current_chapter: progress?.currentChapter ?? null,
      current_volume: progress?.currentVolume ?? null,
      current_page: progress?.currentPage ?? null,
      ...(status === 'completed' ? { finished_at: new Date().toISOString() } : {}),
      ...(status === 'watching_reading' ? { started_at: new Date().toISOString() } : {}),
    },
    { onConflict: 'user_id,media_item_id' }
  );
  if (error) throw error;
}

/** Returns the library entry (with progress) for a specific item, or null if it does not exist */
export async function getLibraryEntry(userId: string, mediaItemId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_library')
    .select('*')
    .eq('user_id', userId)
    .eq('media_item_id', mediaItemId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function removeLibraryEntry(userId: string, mediaItemId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('user_library')
    .delete()
    .eq('user_id', userId)
    .eq('media_item_id', mediaItemId);
  if (error) throw error;
}

/** The user's full library, with the associated media item (join) */
export async function getUserLibrary(userId: string, status?: LibraryStatus) {
  const supabase = createClient();
  let query = supabase
    .from('user_library')
    .select('*, media_items(*)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Fixes the category of a media item (e.g. a drama classified as a series) */
export async function updateMediaItemCategory(mediaItemId: string, category: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('media_items')
    .update({ category })
    .eq('id', mediaItemId);
  if (error) throw error;
}

/** Stores totals (episodes/seasons) obtained from the source API, so the request is not repeated */
export async function updateMediaItemDetails(
  mediaItemId: string,
  details: { totalEpisodes?: number; extra?: Record<string, unknown> }
) {
  const supabase = createClient();
  const { error } = await supabase
    .from('media_items')
    .update({
      ...(details.totalEpisodes !== undefined ? { total_episodes: details.totalEpisodes } : {}),
      ...(details.extra !== undefined ? { extra: details.extra } : {}),
    })
    .eq('id', mediaItemId);
  if (error) throw error;
}

/** All of the user's ratings, as a media_item_id -> rating map (for lists, avoiding one request per item) */
export async function getUserReviewsMap(userId: string): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('media_item_id, rating')
    .eq('user_id', userId);
  if (error) throw error;

  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.rating) map[row.media_item_id] = row.rating;
  }
  return map;
}

/** Creates or updates the rating (1-5) and notes for an item */
export async function upsertReview(
  userId: string,
  mediaItemId: string,
  rating: number,
  notes?: string
) {
  const supabase = createClient();
  const { error } = await supabase.from('reviews').upsert(
    { user_id: userId, media_item_id: mediaItemId, rating, notes: notes ?? null },
    { onConflict: 'user_id,media_item_id' }
  );
  if (error) throw error;
}

export async function getReview(userId: string, mediaItemId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('media_item_id', mediaItemId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
