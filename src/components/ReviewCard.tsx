import React, { useState } from 'react';
import StarRating from './StarRating.js';

interface Props {
  review: {
    id: string;
    userName: string;
    rating: number;
    title: string;
    body: string;
    spoiler: boolean;
    createdAt: string;
  };
}

export default function ReviewCard({ review }: Props) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{review.userName}</span>
          <StarRating rating={review.rating} size="sm" readonly />
        </div>
        <span className="text-xs text-gray-400">
          {new Date(review.createdAt).toLocaleDateString('ja-JP')}
        </span>
      </div>

      {review.title && <h4 className="font-semibold text-sm mb-1">{review.title}</h4>}

      {review.spoiler && !revealed ? (
        <div className="relative">
          <p className="text-sm text-gray-600 blur-sm select-none">{review.body || 'ネタバレを含むレビューです'}</p>
          <button
            onClick={() => setRevealed(true)}
            className="absolute inset-0 flex items-center justify-center bg-gray-50/80 rounded text-sm text-gray-600 hover:bg-gray-50/90"
          >
            ネタバレを表示
          </button>
        </div>
      ) : (
        review.body && <p className="text-sm text-gray-600">{review.body}</p>
      )}
    </div>
  );
}
