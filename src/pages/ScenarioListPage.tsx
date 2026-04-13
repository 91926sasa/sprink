import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { scenarioApi, tagApi } from '../api.js';
import ScenarioCard from '../components/ScenarioCard.js';

export default function ScenarioListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');

  useEffect(() => {
    tagApi.popular(15).then(setTags).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { sort };
    const q = searchParams.get('q');
    const system = searchParams.get('system');
    const genre = searchParams.get('genre');
    const tagParam = searchParams.get('tags');

    if (q) params.q = q;
    if (system) params.system = system;
    if (genre) params.genre = genre;
    if (tagParam) params.tags = tagParam;

    scenarioApi.search(params)
      .then(setScenarios)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchParams, sort]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (query) {
      newParams.set('q', query);
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">シナリオ一覧</h1>
      </div>

      {/* Search & Filter */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="シナリオを検索..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <button type="submit" className="btn-primary">検索</button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">ソート:</span>
          {(['newest', 'popular', 'rating', 'trending'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-2 py-1 rounded text-xs ${
                sort === s ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {{ newest: '新着', popular: '人気', rating: '高評価', trending: '注目' }[s]}
            </button>
          ))}
        </div>

        {tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <span className="text-xs text-gray-500">タグ:</span>
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('tags', tag.name);
                  setSearchParams(newParams);
                }}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs hover:bg-primary-50 hover:text-primary-600 transition-colors"
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">読み込み中...</div>
      ) : scenarios.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">シナリオが見つかりません</p>
          <p className="text-sm">検索条件を変更してみてください</p>
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
