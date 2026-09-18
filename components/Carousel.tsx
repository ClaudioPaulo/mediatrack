'use client';

import { ReactNode } from 'react';

interface CarouselProps {
  title: string;
  children: ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export function Carousel({ title, children, emptyMessage = 'Nada por aqui ainda.', isEmpty }: CarouselProps) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 px-4 text-lg font-semibold text-neutral-100 sm:px-0">{title}</h2>
      {isEmpty ? (
        <p className="px-4 text-sm text-neutral-500 sm:px-0">{emptyMessage}</p>
      ) : (
        <div className="scrollbar-none flex gap-3 overflow-x-auto px-4 pb-2 sm:px-0">
          {children}
        </div>
      )}
    </section>
  );
}
