'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { NormalizedMedia } from '@/lib/api/types';
import { StarRating } from './StarRating';
import {
  ensureMediaItem,
  getLibraryEntry,
  getReview,
  removeLibraryEntry,
  updateMediaItemCategory,
  updateMediaItemDetails,
  upsertLibraryEntry,
  upsertReview,
  type LibraryProgress,
  type LibraryStatus,
} from '@/lib/api/library';
import { getTmdbDetails } from '@/lib/api/tmdb';
import type { MediaCategory } from '@/lib/api/types';

interface MediaDetailsModalProps {
  media: NormalizedMedia;
  userId: string;
  initialStatus?: LibraryStatus;
  onClose: () => void;
  onSaved?: () => void;
}

const STATUS_OPTIONS: { value: LibraryStatus; label: string }[] = [
  { value: 'watching_reading', label: 'A ver / a ler' },
  { value: 'completed', label: 'Concluído' },
  { value: 'backlog', label: 'Por ver / ler' },
  { value: 'favorite', label: 'Favorito' },
];

const CATEGORY_OPTIONS: { value: MediaCategory; label: string }[] = [
  { value: 'movie', label: 'Filme' },
  { value: 'tv_series', label: 'Série' },
  { value: 'drama', label: 'Dorama' },
  { value: 'anime', label: 'Anime' },
  { value: 'manga', label: 'Manga' },
  { value: 'book', label: 'Livro' },
];

export function MediaDetailsModal({ media, userId, initialStatus, onClose, onSaved }: MediaDetailsModalProps) {
  const [mediaItemId, setMediaItemId] = useState<string | null>(null);
  const [status, setStatus] = useState<LibraryStatus>(initialStatus ?? 'backlog');
  const [category, setCategory] = useState<MediaCategory>(media.category);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [season, setSeason] = useState<string>('');
  const [episode, setEpisode] = useState<string>('');
  const [chapter, setChapter] = useState<string>('');
  const [volume, setVolume] = useState<string>('');
  const [page, setPage] = useState<string>('');
  const [totalSeasons, setTotalSeasons] = useState<number | undefined>(
    (media.extra?.totalSeasons as number | undefined) ?? undefined
  );
  const [totalEpisodes, setTotalEpisodes] = useState<number | undefined>(media.totalEpisodes);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const id = await ensureMediaItem(media);
        if (cancelled) return;
        setMediaItemId(id);

        const [review, entry] = await Promise.all([
          getReview(userId, id),
          getLibraryEntry(userId, id),
        ]);
        if (cancelled) return;

        if (review) {
          setRating(review.rating ?? 0);
          setNotes(review.notes ?? '');
        }
        if (entry) {
          setSeason(entry.current_season?.toString() ?? '');
          setEpisode(entry.current_episode?.toString() ?? '');
          setChapter(entry.current_chapter?.toString() ?? '');
          setVolume(entry.current_volume?.toString() ?? '');
          setPage(entry.current_page?.toString() ?? '');
        }

        // Busca totais de temporadas/episódios à TMDB uma única vez, e guarda em cache
        // no media_items para não repetir o pedido nas próximas aberturas.
        const isTvLike = media.category === 'tv_series' || media.category === 'drama';
        if (media.source === 'tmdb' && isTvLike && !media.totalEpisodes) {
          const tmdbType = (media.extra?.tmdbMediaType as 'tv' | 'movie') ?? 'tv';
          try {
            const details = await getTmdbDetails(media.externalId, tmdbType);
            if (cancelled) return;
            setTotalSeasons(details.numberOfSeasons);
            setTotalEpisodes(details.totalEpisodes);
            await updateMediaItemDetails(id, {
              totalEpisodes: details.totalEpisodes,
              extra: { ...(media.extra ?? {}), totalSeasons: details.numberOfSeasons },
            });
          } catch (err) {
            console.error('Não foi possível obter detalhes da TMDB:', err);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [media, userId]);

  function toIntOrUndefined(v: string) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  }

  function buildProgress(): LibraryProgress {
    return {
      currentSeason: toIntOrUndefined(season),
      currentEpisode: toIntOrUndefined(episode),
      currentChapter: toIntOrUndefined(chapter),
      currentVolume: toIntOrUndefined(volume),
      currentPage: toIntOrUndefined(page),
    };
  }

  /** Verifica se o progresso atual já atingiu o total conhecido para a categoria em questão */
  function reachedTotal(): boolean {
    if ((category === 'tv_series' || category === 'drama' || category === 'anime') && totalEpisodes) {
      const ep = toIntOrUndefined(episode);
      return ep !== undefined && ep > 0 && ep >= totalEpisodes;
    }
    if (category === 'manga' && media.totalChapters) {
      const ch = toIntOrUndefined(chapter);
      return ch !== undefined && ch > 0 && ch >= media.totalChapters;
    }
    if (category === 'book' && media.totalPages) {
      const pg = toIntOrUndefined(page);
      return pg !== undefined && pg > 0 && pg >= media.totalPages;
    }
    return false;
  }

  // Passa automaticamente para "Concluído" quando o progresso atinge o total conhecido
  // (episódios/capítulos/páginas). Não mexe se já estiver "Concluído" ou "Favorito",
  // para não perder uma marcação manual do utilizador.
  useEffect(() => {
    if (loading) return;
    if (status === 'completed' || status === 'favorite') return;
    if (reachedTotal()) setStatus('completed');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode, chapter, page, totalEpisodes, media.totalChapters, media.totalPages, category, loading]);

  async function handleSave() {
    if (!mediaItemId) return;
    setSaving(true);
    setModalError(null);
    try {
      if (category !== media.category) {
        await updateMediaItemCategory(mediaItemId, category);
      }
      await upsertLibraryEntry(userId, mediaItemId, status, buildProgress());
      if (rating > 0) {
        await upsertReview(userId, mediaItemId, rating, notes);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Falha ao guardar:', err);
      setModalError(err instanceof Error ? err.message : 'Não foi possível guardar. Tenta novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!mediaItemId) return;
    setRemoving(true);
    setModalError(null);
    try {
      await removeLibraryEntry(userId, mediaItemId);
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Falha ao remover:', err);
      setModalError(err instanceof Error ? err.message : 'Não foi possível remover. Tenta novamente.');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-neutral-900 p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4">
          <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-lg bg-neutral-800">
            {media.coverUrl && (
              <Image src={media.coverUrl} alt={media.title} fill className="object-cover" unoptimized />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-neutral-100">{media.title}</h2>
            {media.originalTitle && (
              <p className="text-sm text-neutral-500">{media.originalTitle}</p>
            )}
            {media.releaseYear && <p className="mt-1 text-sm text-neutral-400">{media.releaseYear}</p>}
            {media.genres.length > 0 && (
              <p className="mt-1 text-xs text-neutral-500">{media.genres.join(' · ')}</p>
            )}
          </div>
        </div>

        {media.synopsis && (
          <p className="mt-4 line-clamp-4 text-sm text-neutral-300">{media.synopsis}</p>
        )}

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-neutral-300">Categoria</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as MediaCategory)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {category !== media.category && (
            <p className="mt-1 text-xs text-amber-400">
              Isto corrige a categoria para todos — útil se veio classificado incorretamente.
            </p>
          )}
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-neutral-300">Estado</label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  status === opt.value
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {status === 'completed' && reachedTotal() && (
            <p className="mt-2 text-xs text-emerald-400">
              Marcado como concluído automaticamente — chegaste ao total.
            </p>
          )}
        </div>

        {(category === 'tv_series' || category === 'drama') && (
          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-neutral-300">Progresso</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <span className="mb-1 block text-xs text-neutral-500">
                  Temporada{totalSeasons ? ` (de ${totalSeasons})` : ''}
                </span>
                <input
                  type="number"
                  min={0}
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="1"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
                />
              </div>
              <div className="flex-1">
                <span className="mb-1 block text-xs text-neutral-500">
                  Episódio{totalEpisodes ? ` (de ${totalEpisodes} no total)` : ''}
                </span>
                <input
                  type="number"
                  min={0}
                  value={episode}
                  onChange={(e) => setEpisode(e.target.value)}
                  placeholder="1"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
                />
              </div>
            </div>
          </div>
        )}

        {category === 'anime' && (
          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              Episódio{totalEpisodes ? ` (de ${totalEpisodes})` : ''}
            </label>
            <input
              type="number"
              min={0}
              value={episode}
              onChange={(e) => setEpisode(e.target.value)}
              placeholder="1"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
            />
          </div>
        )}

        {category === 'manga' && (
          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-neutral-300">Progresso</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <span className="mb-1 block text-xs text-neutral-500">
                  Capítulo{media.totalChapters ? ` (de ${media.totalChapters})` : ''}
                </span>
                <input
                  type="number"
                  min={0}
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  placeholder="1"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
                />
              </div>
              <div className="flex-1">
                <span className="mb-1 block text-xs text-neutral-500">Volume/edição (opcional)</span>
                <input
                  type="number"
                  min={0}
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  placeholder="1"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
                />
              </div>
            </div>
          </div>
        )}

        {category === 'book' && (
          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              Página{media.totalPages ? ` (de ${media.totalPages})` : ''}
            </label>
            <input
              type="number"
              min={0}
              value={page}
              onChange={(e) => setPage(e.target.value)}
              placeholder="1"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
            />
          </div>
        )}

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-neutral-300">Avaliação</label>
          <StarRating value={rating} onChange={setRating} />
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-neutral-300">Notas pessoais</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Opiniões, momentos favoritos, o que achaste…"
            className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-sm text-neutral-100 outline-none focus:border-neutral-500"
          />
        </div>

        {modalError && (
          <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 px-4 py-2 text-sm text-red-300">
            {modalError}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-neutral-700 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>

        {initialStatus && (
          <button
            onClick={handleRemove}
            disabled={loading || removing}
            className="mt-3 w-full rounded-lg border border-red-900 py-2.5 text-sm font-medium text-red-400 hover:bg-red-950/50 disabled:opacity-50"
          >
            {removing ? 'A remover…' : 'Remover da biblioteca'}
          </button>
        )}
      </div>
    </div>
  );
}
