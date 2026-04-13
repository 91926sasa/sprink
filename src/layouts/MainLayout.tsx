import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell.js';

interface MainLayoutProps {
  user: { id: string; name: string; avatarUrl?: string } | null;
  onLogout: () => void;
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: 'ホーム' },
  { path: '/scenarios', label: 'シナリオ' },
  { path: '/rankings', label: 'ランキング' },
];

const authNavItems = [
  { path: '/my/scenarios', label: 'マイシナリオ' },
  { path: '/my/bookmarks', label: 'ブックマーク' },
];

export default function MainLayout({ user, onLogout, children }: MainLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold text-primary-700 dark:text-primary-400">
              Sprink
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {user && authNavItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/scenarios/new" className="btn-primary text-sm">
                  + 投稿
                </Link>
                <NotificationBell />
                <Link to={`/users/${user.id}`} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-bold text-primary-600">
                      {user.name.charAt(0)}
                    </span>
                  )}
                  <span className="hidden sm:inline">{user.name}</span>
                </Link>
                <button onClick={onLogout} className="btn-ghost text-xs">
                  ログアウト
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary text-sm">
                ログイン
              </Link>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex px-2 py-1 gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${
                  location.pathname === item.path
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-500'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {user && authNavItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${
                  location.pathname === item.path
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-500'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-400">
          Sprink - TRPGシナリオ共有 | TRPGOファミリー
        </div>
      </footer>
    </div>
  );
}
