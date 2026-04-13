import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { scenarioApi } from '../api.js';

export default function MyScenarioListPage() {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    scenarioApi.getMine()
      .then(setScenarios)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    await scenarioApi.updateStatus(id, status, status === 'published' ? 'public' : undefined);
    const updated = await scenarioApi.getMine();
    setScenarios(updated);
  };

  if (loading) return <div className="text-center py-8 text-gray-400">読み込み中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">マイシナリオ</h1>
        <Link to="/scenarios/new" className="btn-primary">+ 新規作成</Link>
      </div>

      {scenarios.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="mb-4">まだシナリオを投稿していません</p>
          <Link to="/scenarios/new" className="btn-primary">最初のシナリオを作成</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {scenarios.map(s => (
            <div key={s.id} className="card flex items-center justify-between">
              <div>
                <Link to={`/scenarios/${s.id}`} className="font-semibold text-gray-900 hover:text-primary-600">
                  {s.title}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    s.status === 'published' ? 'bg-green-100 text-green-700' :
                    s.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {{ draft: '下書き', published: '公開', archived: 'アーカイブ' }[s.status as string] || s.status}
                  </span>
                  <span className="text-xs text-gray-400">v{s.version}</span>
                  {s.systemTag && <span className="text-xs text-gray-500">{s.systemTag}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/scenarios/${s.id}/edit`} className="btn-ghost text-xs">編集</Link>
                {s.status === 'draft' && (
                  <button onClick={() => handleStatusChange(s.id, 'published')} className="btn-primary text-xs">公開</button>
                )}
                {s.status === 'published' && (
                  <button onClick={() => handleStatusChange(s.id, 'archived')} className="btn-ghost text-xs">アーカイブ</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
