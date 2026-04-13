import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { seriesApi } from '../api.js';

export default function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [series, setSeries] = useState<any>(null);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    seriesApi.get(id).then(data => {
      setSeries(data.series);
      setScenarios(data.scenarios);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-12 text-gray-400">読み込み中...</div>;
  if (!series) return <div className="text-center py-12 text-gray-400">シリーズが見つかりません</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold mb-2">{series.title}</h1>
        {series.description && (
          <p className="text-gray-600 text-sm mb-3">{series.description}</p>
        )}
        <div className="text-sm text-gray-500">
          <Link to={`/users/${series.authorId}`} className="hover:text-primary-600">
            {series.authorName}
          </Link>
          <span className="mx-2">|</span>
          <span>{series.scenarioCount ?? scenarios.length}作品</span>
        </div>
      </div>

      <div className="space-y-3">
        {scenarios.map((s: any, index: number) => (
          <Link
            key={s.id}
            to={`/scenarios/${s.id}`}
            className="card flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <span className="text-lg font-bold text-gray-300 w-8 text-center">{index + 1}</span>
            <div className="flex-1">
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-1">{s.description}</p>
            </div>
            {s.system_tag && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{s.system_tag}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
