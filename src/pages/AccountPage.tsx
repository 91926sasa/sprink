import React, { useState } from 'react';
import { profileApi } from '../api.js';

interface Props {
  user: { id: string; name: string; avatarUrl?: string } | null;
}

export default function AccountPage({ user }: Props) {
  const [bio, setBio] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [theme, setTheme] = useState('system');
  const [fontSize, setFontSize] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await profileApi.updateProfile({ bio, websiteUrl, twitterHandle });
      setMessage('プロフィールを更新しました');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      await profileApi.updatePreferences({ theme, fontSize });
      setMessage('設定を保存しました');
      setTimeout(() => setMessage(''), 3000);

      // Apply theme immediately
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">アカウント設定</h1>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">
          {message}
        </div>
      )}

      {/* Profile section */}
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold">プロフィール</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">自己紹介 (500文字まで)</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-y"
            placeholder="自己紹介を入力..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webサイト</label>
            <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
              placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Twitter/X</label>
            <input type="text" value={twitterHandle} onChange={e => setTwitterHandle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
              placeholder="@username" />
          </div>
        </div>

        <button onClick={handleSaveProfile} disabled={saving} className="btn-primary">
          {saving ? '保存中...' : 'プロフィールを保存'}
        </button>
      </div>

      {/* Reading preferences */}
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold">表示設定</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">テーマ</label>
          <div className="flex gap-2">
            {[
              { value: 'light', label: 'ライト' },
              { value: 'dark', label: 'ダーク' },
              { value: 'system', label: 'システム設定' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`px-3 py-2 rounded-lg text-sm ${
                  theme === opt.value ? 'bg-primary-100 text-primary-700 font-medium' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">フォントサイズ</label>
          <div className="flex gap-2">
            {[
              { value: 'small', label: '小' },
              { value: 'medium', label: '中' },
              { value: 'large', label: '大' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFontSize(opt.value)}
                className={`px-3 py-2 rounded-lg text-sm ${
                  fontSize === opt.value ? 'bg-primary-100 text-primary-700 font-medium' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSavePreferences} className="btn-primary">設定を保存</button>
      </div>
    </div>
  );
}
