'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/auth';
import { SearchBar } from '@/components/SearchBar';
import { Carousel } from '@/components/Carousel';
import { MediaCard } from '@/components/MediaCard';
import { MediaDetailsModal } from '@/components/MediaDetailsModal';
import { SettingsMenu } from '@/components/SettingsMenu';
import { OfflineBanner } from '@/components/OfflineBanner';
import { cacheLibrarySnapshot, getCachedLibrarySnapshot } from '@/lib/mobile/offlineCache';
import { scheduleContinueReminders } from '@/lib/mobile/notifications';
import {
  ensureMediaItem,
  getUserLibrary,
  getUserReviewsMap,
  removeLibraryEntry,
  upsertLibraryEntry,
  type LibraryProgress,
  type LibraryStatus,
} from '@/lib/api/library';
import type { MediaCategory, NormalizedMedia } from '@/lib/api/types';
import type { User } from '@supabase/supabase-js';

// Converte uma linha da tabela user_library (com join em media_items) para NormalizedMedia
function rowToMedia(row: any): NormalizedMedia {
  const m = row.media_items;
  return {
    externalId: m.external_id,
    source: m.source,
    category: m.category,
    title: m.title,
    originalTitle: m.original_title ?? undefined,
    synopsis: m.synopsis ?? undefined,
    coverUrl: m.cover_url ?? undefined,
    releaseYear: m.release_year ?? undefined,
    genres: m.genres ?? [],
    totalEpisodes: m.total_episodes ?? undefined,
    totalChapters: m.total_chapters ?? undefined,
    totalPages: m.total_pages ?? undefined,
    extra: m.extra ?? {},
  };
}

function libraryKey(source: string, externalId: string) {
  return `${source}-${externalId}`;
}

function formatProgress(category: string, p: LibraryProgress): string | undefined {
  if (category === 'tv_series' || category === 'drama') {
    if (p.currentSeason && p.currentEpisode) return `T${p.currentSeason} · Ep. ${p.currentEpisode}`;
    if (p.currentEpisode) return `Ep. ${p.currentEpisode}`;
  }
  if (category === 'anime' && p.currentEpisode) return `Ep. ${p.currentEpisode}`;
  if (category === 'manga' && p.currentChapter) return `Cap. ${p.currentChapter}`;
  if (category === 'book' && p.currentPage) return `Pág. ${p.currentPage}`;
  return undefined;
}

const CATEGORY_FILTER_OPTIONS: { value: MediaCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'movie', label: 'Filmes' },
  { value: 'tv_series', label: 'Séries' },
  { value: 'drama', label: 'Doramas' },
  { value: 'anime', label: 'Animes' },
  { value: 'manga', label: 'Mangas' },
  { value: 'book', label: 'Livros' },
];

interface LibraryRow {
  mediaItemId: string;
  status: LibraryStatus;
  media: NormalizedMedia;
  progress: LibraryProgress;
}

interface PendingUndo {
  message: string;
  media: NormalizedMedia;
  previous: { status: LibraryStatus; progress: LibraryProgress } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [library, setLibrary] = useState<LibraryRow[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [selectedMedia, setSelectedMedia] = useState<NormalizedMedia | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);
  const [loading, setLoading] = useState(true);
  const [libraryFilter, setLibraryFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MediaCategory | 'all'>('all');
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLibrary = useCallback(async (userId: string) => {
    try {
      const [rows, reviewsMap] = await Promise.all([getUserLibrary(userId), getUserReviewsMap(userId)]);
      const mapped: LibraryRow[] = rows.map((r: any) => ({
        mediaItemId: r.media_item_id,
        status: r.status,
        media: rowToMedia(r),
        progress: {
          currentSeason: r.current_season ?? undefined,
          currentEpisode: r.current_episode ?? undefined,
          currentChapter: r.current_chapter ?? undefined,
          currentVolume: r.current_volume ?? undefined,
          currentPage: r.current_page ?? undefined,
        },
      }));
      setLibrary(mapped);
      setRatings(reviewsMap);
      // Guarda cópia local para acesso offline e agenda lembretes de "continuar a ver/ler"
      cacheLibrarySnapshot({ library: mapped, ratings: reviewsMap });
      scheduleContinueReminders(
        mapped.map((l) => ({ mediaItemId: l.mediaItemId, title: l.media.title, status: l.status }))
      );
    } catch (err) {
      // Falhou o pedido à rede (ex.: sem internet) — tenta mostrar a última cópia guardada
      const cached = await getCachedLibrarySnapshot<{
        library: LibraryRow[];
        ratings: Record<string, number>;
      }>();
      if (cached) {
        setLibrary(cached.data.library);
        setRatings(cached.data.ratings);
      } else {
        throw err;
      }
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login');
        return;
      }
      setUser(data.user);
      loadLibrary(data.user.id).finally(() => setLoading(false));
    });
  }, [router, loadLibrary]);

  useEffect(() => {
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, []);

  function armUndo(undo: PendingUndo) {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setPendingUndo(undo);
    undoTimer.current = setTimeout(() => setPendingUndo(null), 6000);
  }

  const libraryStatusMap = new Map<string, LibraryStatus>();
  library.forEach((l) => libraryStatusMap.set(libraryKey(l.media.source, l.media.externalId), l.status));

  function findLibraryRow(media: NormalizedMedia) {
    return library.find(
      (l) => l.media.source === media.source && l.media.externalId === media.externalId
    );
  }

  async function handleQuickAdd(media: NormalizedMedia) {
    if (!user) return;
    try {
      const mediaItemId = await ensureMediaItem(media);
      await upsertLibraryEntry(user.id, mediaItemId, 'backlog');
      await loadLibrary(user.id);
      armUndo({ message: `"${media.title}" adicionado à lista`, media, previous: null });
    } catch (err) {
      console.error('Falha ao adicionar à biblioteca:', err);
      setActionError(
        err instanceof Error ? err.message : 'Não foi possível adicionar. Tenta novamente.'
      );
    }
  }

  async function handleModalSaved(media: NormalizedMedia) {
    if (!user) return;
    const prevRow = findLibraryRow(media);
    const previous = prevRow ? { status: prevRow.status, progress: prevRow.progress } : null;
    await loadLibrary(user.id);
    armUndo({ message: `"${media.title}" atualizado`, media, previous });
  }

  async function handleUndo() {
    if (!pendingUndo || !user) return;
    const { media, previous } = pendingUndo;
    try {
      const mediaItemId = await ensureMediaItem(media);
      if (previous) {
        await upsertLibraryEntry(user.id, mediaItemId, previous.status, previous.progress);
      } else {
        await removeLibraryEntry(user.id, mediaItemId);
      }
      await loadLibrary(user.id);
    } catch (err) {
      console.error('Falha ao desfazer:', err);
    } finally {
      if (undoTimer.current) clearTimeout(undoTimer.current);
      setPendingUndo(null);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  const filteredLibrary = useMemo(() => {
    const q = libraryFilter.trim().toLowerCase();
    return library.filter((l) => {
      const matchesCategory = categoryFilter === 'all' || l.media.category === categoryFilter;
      const matchesQuery = !q || l.media.title.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [library, libraryFilter, categoryFilter]);

  const watching = filteredLibrary.filter((l) => l.status === 'watching_reading');
  const completed = filteredLibrary.filter((l) => l.status === 'completed');
  const backlog = filteredLibrary.filter((l) => l.status === 'backlog');
  const favorites = filteredLibrary.filter((l) => l.status === 'favorite');

  // Recomendações simples: géneros mais frequentes entre os itens completos/favoritos (sobre a biblioteca toda, não filtrada)
  const favoriteGenres = Array.from(
    new Set(
      library
        .filter((l) => l.status === 'completed' || l.status === 'favorite')
        .flatMap((l) => l.media.genres)
        .filter(Boolean)
    )
  ).slice(0, 5);

  const isFiltering = libraryFilter.trim() !== '' || categoryFilter !== 'all';

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-200" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-0 pb-24 pt-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between px-4 sm:px-0">
        <h1 className="text-xl font-bold">MediaTrack</h1>
        <div className="flex items-center gap-2">
          <SettingsMenu />
          <button onClick={handleSignOut} className="text-sm text-neutral-400 hover:text-neutral-200">
            Sair
          </button>
        </div>
      </header>
      <OfflineBanner />

      <div className="mb-6 px-4 sm:px-0">
        <SearchBar
          onSelect={(media) => setSelectedMedia(media)}
          onQuickAdd={handleQuickAdd}
          libraryStatus={libraryStatusMap}
        />
        {actionError && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-red-800 bg-red-950/50 px-4 py-2 text-sm text-red-300">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="ml-3 text-red-400 hover:text-red-200">
              ✕
            </button>
          </div>
        )}
      </div>

      <div className="mb-8 flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:px-0">
        <div className="relative flex-1">
          <input
            type="text"
            value={libraryFilter}
            onChange={(e) => setLibraryFilter(e.target.value)}
            placeholder="Filtrar a tua biblioteca por título…"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 pr-8 text-sm text-neutral-200 placeholder-neutral-600 outline-none focus:border-neutral-600"
          />
          {libraryFilter && (
            <button
              onClick={() => setLibraryFilter('')}
              aria-label="Limpar filtro"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-200"
            >
              ✕
            </button>
          )}
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as MediaCategory | 'all')}
          className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600"
        >
          {CATEGORY_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <Carousel title="A ver / a ler agora" isEmpty={watching.length === 0} emptyMessage={isFiltering ? 'Nada corresponde ao filtro.' : 'Adiciona algo que estejas a ver ou ler.'}>
        {watching.map((l) => (
          <MediaCard
            key={libraryKey(l.media.source, l.media.externalId)}
            media={l.media}
            onClick={() => setSelectedMedia(l.media)}
            subtitle={formatProgress(l.media.category, l.progress)}
            rating={ratings[l.mediaItemId]}
          />
        ))}
      </Carousel>

      <Carousel title="Favoritos" isEmpty={favorites.length === 0} emptyMessage={isFiltering ? 'Nada corresponde ao filtro.' : 'Marca os teus favoritos aqui.'}>
        {favorites.map((l) => (
          <MediaCard
            key={libraryKey(l.media.source, l.media.externalId)}
            media={l.media}
            onClick={() => setSelectedMedia(l.media)}
            rating={ratings[l.mediaItemId]}
          />
        ))}
      </Carousel>

      <Carousel title="Por ver / ler" isEmpty={backlog.length === 0} emptyMessage={isFiltering ? 'Nada corresponde ao filtro.' : 'A tua lista de pendentes está vazia.'}>
        {backlog.map((l) => (
          <MediaCard
            key={libraryKey(l.media.source, l.media.externalId)}
            media={l.media}
            onClick={() => setSelectedMedia(l.media)}
            rating={ratings[l.mediaItemId]}
          />
        ))}
      </Carousel>

      <Carousel title="Concluídos" isEmpty={completed.length === 0} emptyMessage={isFiltering ? 'Nada corresponde ao filtro.' : 'Ainda não concluíste nada — vamos lá!'}>
        {completed.map((l) => (
          <MediaCard
            key={libraryKey(l.media.source, l.media.externalId)}
            media={l.media}
            onClick={() => setSelectedMedia(l.media)}
            rating={ratings[l.mediaItemId]}
          />
        ))}
      </Carousel>

      {favoriteGenres.length > 0 && (
        <section className="mt-4 px-4 sm:px-0">
          <h2 className="mb-2 text-lg font-semibold text-neutral-100">Baseado nos teus géneros favoritos</h2>
          <p className="text-sm text-neutral-400">
            Gostas de: {favoriteGenres.join(', ')}. Pesquisa por estes géneros na barra acima para descobrir mais.
          </p>
        </section>
      )}

      {selectedMedia && user && (
        <MediaDetailsModal
          media={selectedMedia}
          userId={user.id}
          initialStatus={libraryStatusMap.get(libraryKey(selectedMedia.source, selectedMedia.externalId))}
          onClose={() => setSelectedMedia(null)}
          onSaved={() => handleModalSaved(selectedMedia)}
        />
      )}

      {pendingUndo && (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 shadow-xl sm:inset-x-auto sm:right-6">
          <span className="text-sm text-neutral-200">{pendingUndo.message}</span>
          <button
            onClick={handleUndo}
            className="ml-4 shrink-0 text-sm font-semibold text-blue-400 hover:text-blue-300"
          >
            Desfazer
          </button>
        </div>
      )}
    </main>
  );
}
