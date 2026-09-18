'use client';

import { useState } from 'react';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
}

export function StarRating({ value, onChange }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="text-2xl leading-none transition-transform hover:scale-110"
            aria-label={`${star} estrelas`}
          >
            <span className={filled ? 'text-amber-400' : 'text-neutral-600'}>★</span>
          </button>
        );
      })}
    </div>
  );
}
