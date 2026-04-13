import React, { useState } from 'react';

interface Props {
  rating: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
}

export default function StarRating({ rating, onChange, size = 'md', readonly = false }: Props) {
  const [hover, setHover] = useState(0);

  const sizeClass = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  }[size];

  return (
    <div className={`flex items-center gap-0.5 ${sizeClass}`}>
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= (hover || Math.round(rating));
        return (
          <span
            key={star}
            className={`${readonly ? '' : 'cursor-pointer'} ${
              filled ? 'text-yellow-400' : 'text-gray-300'
            }`}
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
          >
            {filled ? '\u2605' : '\u2606'}
          </span>
        );
      })}
    </div>
  );
}
