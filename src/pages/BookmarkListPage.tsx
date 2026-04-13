import React, { useEffect, useState } from 'react';
import { bookmarkApi } from '../api.js';
import ScenarioCard from '../components/ScenarioCard.js';

export default function BookmarkListPage() {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookmarkApi.list()
      .then(setScenarios)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-gray-400">読み込み中...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ブックマーク</h1>

      {scenarios.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          ブックマークしたシナリオはまだありません
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map(s => (
            <ScenarioCard key={s.id} scenario={s} />
          ))}
        </div>
      )}
    </div>
  );
}
