import React from 'react';

interface Props {
  isFollowing: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md';
}

export default function FollowButton({ isFollowing, onToggle, size = 'sm' }: Props) {
  return (
    <button
      onClick={onToggle}
      className={`${size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'} rounded-full font-medium transition-colors ${
        isFollowing
          ? 'bg-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600'
          : 'bg-primary-600 text-white hover:bg-primary-700'
      }`}
    >
      {isFollowing ? 'フォロー中' : 'フォロー'}
    </button>
  );
}
