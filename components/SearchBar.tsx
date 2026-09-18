'use client';

import { useEffect, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { searchAllSources } from '@/lib/api/search';
import type { NormalizedMedia } from '@/lib/api/types';
import { MediaCard } from './MediaCard';

const STATUS_LABEL: Record<string, string> = {
  watching_reading: 'A ver/ler',
  completed: 'Concluído',
  backlog: 'Na lista',
  favorite: 'Favorito',
};

interface SearchBarProps {
  onSelect: (media: NormalizedMedia) => void;
  onQuickAdd: (media: NormalizedMedia) => void;
  libraryStatus?: Map<string, string>;
}

export function SearchBar({ onSelect, onQuickAdd, libraryStatus }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NormalizedMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 400);
  const inputRef = useRef<HTMLInputElement>(null);

  function clearSearch() {
    setQuery('');
    setResults([]);
    setError(null);
    inputRef.current?.focus();
  }

  useEffect(() => {
    let cancelled = false;

    if (!debouncedQuery.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    searchAllSources(debouncedQuery)
      .then((res) => {
        if (!cancelled) setResults(res);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível pesquisar agora. Tenta novamente.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar filmes, séries, animes, mangas, livros…"
          className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 pr-10 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
        />
        {query && !loading && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Limpar pesquisa"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-200"
          >
            ✕
          </button>
        )}
        {loading && (
          <div className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-200" />
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      {results.length > 0 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {results.map((media) => {
            const key = `${media.source}-${media.externalId}`;
            const existingStatus = libraryStatus?.get(key);
            return (
              <MediaCard
                key={key}
                media={media}
                onClick={() => onSelect(media)}
                onQuickAdd={existingStatus ? undefined : () => onQuickAdd(media)}
                alreadyAddedLabel={existingStatus ? STATUS_LABEL[existingStatus] ?? 'Na biblioteca' : undefined}
              />
            );
          })}
        </div>
      )}

      {!loading && debouncedQuery && results.length === 0 && !error && (
        <p className="mt-3 text-sm text-neutral-500">Sem resultados para "{debouncedQuery}".</p>
      )}
    </div>
  );
}
