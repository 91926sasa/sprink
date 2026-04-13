import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { scenarioApi } from '../api.js';
import ScenarioCard from '../components/ScenarioCard.js';

export default function HomePage() {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    scenarioApi.search({ sort: 'newest', limit: '6' })
      .then(setScenarios)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="text-center py-12 bg-gradient-to-br from-primary-50 to-purple-50 rounded-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          TRPGシナリオを共有しよう
        </h1>
        <p className="text-gray-600 mb-6 max-w-lg mx-auto">
          Sprinkは、TRPGクリエイターのためのシナリオ投稿・共有プラットフォームです。
          あなたのオリジナルシナリオを公開して、仲間と冒険を始めましょう。
        </p>
        <div className="flex justify-center gap-3">
          <Link to="/scenarios" className="btn-primary">
            シナリオを探す
          </Link>
          <Link to="/scenarios/new" className="btn-secondary">
            シナリオを投稿する
          </Link>
        </div>
      </section>

      {/* Recent scenarios */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">新着シナリオ</h2>
          <Link to="/scenarios" className="text-sm text-primary-600 hover:text-primary-700">
            すべて見る →
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">読み込み中...</div>
        ) : scenarios.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            まだシナリオが投稿されていません
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map(s => (
              <ScenarioCard key={s.id} scenario={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
