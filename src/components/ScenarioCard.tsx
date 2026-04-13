import React from 'react';
import { Link } from 'react-router-dom';
import StarRating from './StarRating.js';

interface Props {
  scenario: {
    id: string;
    title: string;
    description: string;
    systemTag?: string;
    genre?: string;
    playerCountMin?: number;
    playerCountMax?: number;
    authorName?: string;
    avgRating?: number;
    reviewCount?: number;
    viewCount?: number;
    tags?: string[];
  };
}

export default function ScenarioCard({ scenario }: Props) {
  return (
    <Link to={`/scenarios/${scenario.id}`} className="card hover:shadow-md transition-shadow block">
      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{scenario.title}</h3>
      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{scenario.description}</p>

      <div className="flex items-center gap-2 flex-wrap mb-2">
        {scenario.systemTag && (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{scenario.systemTag}</span>
        )}
        {scenario.genre && (
          <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs">{scenario.genre}</span>
        )}
        {scenario.playerCountMin != null && (
          <span className="text-xs text-gray-400">PL {scenario.playerCountMin}-{scenario.playerCountMax}人</span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{scenario.authorName || 'Unknown'}</span>
        <div className="flex items-center gap-2">
          {scenario.avgRating != null && scenario.avgRating > 0 && (
            <span className="flex items-center gap-0.5">
              <StarRating rating={scenario.avgRating} size="sm" readonly />
              <span>({scenario.reviewCount})</span>
            </span>
          )}
          {scenario.viewCount != null && (
            <span>{scenario.viewCount} views</span>
          )}
        </div>
      </div>
    </Link>
  );
}
