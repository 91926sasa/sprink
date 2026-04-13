import React, { useEffect, useState } from 'react';
import { authApi } from '../api.js';

interface LoginPageProps {
  onLogin: (provider: string) => Promise<any>;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [trpgoEnabled, setTrpgoEnabled] = useState(false);
  const [mockEnabled, setMockEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authApi.trpgoStatus().then(data => {
      setTrpgoEnabled(data.enabled);
      setMockEnabled(data.mockEnabled);
    }).catch(console.error);
  }, []);

  const handleMockLogin = async (provider: string) => {
    setLoading(true);
    try {
      await onLogin(provider);
      window.location.href = '/my/scenarios';
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="card text-center">
        <h1 className="text-2xl font-bold mb-2">ログイン</h1>
        <p className="text-gray-500 text-sm mb-6">
          TRPGOアカウントでログインして、シナリオの投稿やレビューを始めましょう。
        </p>

        {trpgoEnabled && (
          <a
            href="/api/v1/auth/login/trpgo"
            className="btn-primary w-full block text-center mb-4"
          >
            TRPGOでログイン
          </a>
        )}

        {mockEnabled && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-xs text-gray-400 mb-3">開発用モックログイン</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['discord', 'google', 'line'].map(provider => (
                <button
                  key={provider}
                  onClick={() => handleMockLogin(provider)}
                  disabled={loading}
                  className="btn-secondary text-xs"
                >
                  {provider}
                </button>
              ))}
            </div>
          </div>
        )}

        {!trpgoEnabled && !mockEnabled && (
          <p className="text-gray-400 text-sm">
            認証が設定されていません。環境変数を確認してください。
          </p>
        )}
      </div>
    </div>
  );
}
