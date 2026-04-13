import React, { useState, useEffect } from 'react';
import { likeApi } from '../api.js';

interface Props {
  scenarioId: string;
  isLoggedIn: boolean;
}

export default function LikeButton({ scenarioId, isLoggedIn }: Props) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isLoggedIn) {
      likeApi.check(scenarioId).then(data => {
        setLiked(data.liked);
        setCount(data.count);
      }).catch(() => {});
    }
  }, [scenarioId, isLoggedIn]);

  const handleToggle = async () => {
    if (!isLoggedIn) return;
    const result = await likeApi.toggle(scenarioId);
    setLiked(result.liked);
    setCount(prev => prev + (result.liked ? 1 : -1));
  };

  return (
    <button
      onClick={handleToggle}
      disabled={!isLoggedIn}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
        liked
          ? 'bg-red-50 text-red-500'
          : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-400'
      } ${!isLoggedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span>{liked ? '♥' : '♡'}</span>
      <span>{count}</span>
    </button>
  );
}
