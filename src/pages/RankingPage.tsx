import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rankingApi } from '../api.js';
import StarRating from '../components/StarRating.js';

const RANKING_TYPES = [
  { value: 'popular', label: '人気' },
  { value: 'trending', label: '注目' },
  { value: 'rating', label: '高評価' },
  { value: 'likes', label: 'いいね' },
  { value: 'newest', label: '新着' },
] as const;

const PERIODS = [
  { value: 'all', label: '全期間' },
  { value: 'month', label: '月間' },
  { value: 'week', label: '週間' },
] as const;

export default function RankingPage() {
  const [type, setType] = useState('popular');
  const [period, setPeriod] = useState('all');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    rankingApi.get(type, period).then(data => {
      setItems(data.items);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [type, period]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">ランキング</h1>

      <div className="card">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">種類:</span>
            {RANKING_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`px-3 py-1 rounded text-sm ${
                  type === t.value ? 'bg-primary-100 text-primary-700 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">期間:</span>
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1 rounded text-sm ${
                  period === p.value ? 'bg-primary-100 text-primary-700 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">ランキングデータがありません</div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => (
            <Link key={item.id} to={`/scenarios/${item.id}`}
                  className="card flex items-center gap-4 hover:shadow-md transition-shadow">
              <span className={`text-lg font-bold w-8 text-center flex-shrink-0 ${
                item.rank <= 3 ? 'text-primary-600' : 'text-gray-400'
              }`}>
                {item.rank}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Link to={`/users/${item.authorId}`} className="hover:text-primary-600"
                        onClick={e => e.stopPropagation()}>
                    {item.authorName}
                  </Link>
                  {item.systemTag && (
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{item.systemTag}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
                {item.avgRating > 0 && (
                  <span className="flex items-center gap-0.5">
                    <StarRating rating={item.avgRating} size="sm" readonly />
                  </span>
                )}
                <span>{item.viewCount} views</span>
                <span>{item.likeCount} likes</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
