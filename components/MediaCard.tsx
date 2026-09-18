'use client';

import Image from 'next/image';
import type { NormalizedMedia } from '@/lib/api/types';

const CATEGORY_LABEL: Record<string, string> = {
  book: 'Livro',
  manga: 'Manga',
  anime: 'Anime',
  tv_series: 'Série',
  drama: 'Dorama',
  movie: 'Filme',
};

const CATEGORY_COLOR: Record<string, string> = {
  book: 'bg-amber-500',
  manga: 'bg-pink-500',
  anime: 'bg-violet-500',
  tv_series: 'bg-blue-500',
  drama: 'bg-rose-500',
  movie: 'bg-emerald-500',
};

interface MediaCardProps {
  media: NormalizedMedia;
  onClick?: () => void;
  onQuickAdd?: () => void;
  quickAddLabel?: string;
  subtitle?: string;
  alreadyAddedLabel?: string;
  rating?: number;
}

export function MediaCard({
  media,
  onClick,
  onQuickAdd,
  quickAddLabel = '+ Biblioteca',
  subtitle,
  alreadyAddedLabel,
  rating,
}: MediaCardProps) {
  return (
    <div
      className="group relative w-36 shrink-0 cursor-pointer select-none sm:w-40"
      onClick={onClick}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-neutral-800 shadow-md transition-transform duration-200 group-hover:scale-[1.03]">
        {media.coverUrl ? (
          <Image
            src={media.coverUrl}
            alt={media.title}
            fill
            sizes="160px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-neutral-400">
            {media.title}
          </div>
        )}

        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${CATEGORY_COLOR[media.category]}`}
        >
          {CATEGORY_LABEL[media.category]}
        </span>

        {rating ? (
          <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 backdrop-blur">
            ★ {rating}
          </span>
        ) : null}

        {alreadyAddedLabel ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1 text-[11px] font-medium text-emerald-300 backdrop-blur">
            {alreadyAddedLabel}
          </span>
        ) : (
          onQuickAdd && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd();
              }}
              className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1 text-[11px] font-medium text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
            >
              {quickAddLabel}
            </button>
          )
        )}
      </div>

      <p className="mt-2 line-clamp-2 text-sm font-medium text-neutral-100">{media.title}</p>
      {subtitle ? (
        <p className="text-xs text-blue-400">{subtitle}</p>
      ) : (
        media.releaseYear && <p className="text-xs text-neutral-400">{media.releaseYear}</p>
      )}
    </div>
  );
}
