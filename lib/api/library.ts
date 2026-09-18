import { createClient } from '@/lib/supabase/client';
import type { NormalizedMedia } from './types';

/**
 * Garante que o item de mídia existe na cache local (media_items) e devolve
 * o seu id interno (uuid). Usa upsert por (source, external_id).
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

/** Adiciona ou atualiza o estado (e opcionalmente o progresso) de um item na biblioteca do utilizador atual */
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

/** Devolve a entrada de biblioteca (com progresso) de um item específico, ou null se não existir */
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

/** Biblioteca completa do utilizador, com o item de mídia associado (join) */
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

/** Corrige a categoria de um item de mídia (ex. dorama classificado como série) */
export async function updateMediaItemCategory(mediaItemId: string, category: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('media_items')
    .update({ category })
    .eq('id', mediaItemId);
  if (error) throw error;
}

/** Guarda totais (episódios/temporadas) obtidos da API de origem, para não repetir o pedido */
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

/** Todas as avaliações do utilizador, num mapa media_item_id -> rating (para uso em listas, sem 1 pedido por item) */
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

/** Cria ou atualiza rating (1-5) e notas para um item */
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
