import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import MainLayout from './layouts/MainLayout.js';

const HomePage = lazy(() => import('./pages/HomePage.js'));
const LoginPage = lazy(() => import('./pages/LoginPage.js'));
const ScenarioListPage = lazy(() => import('./pages/ScenarioListPage.js'));
const ScenarioDetailPage = lazy(() => import('./pages/ScenarioDetailPage.js'));
const ScenarioEditorPage = lazy(() => import('./pages/ScenarioEditorPage.js'));
const MyScenarioListPage = lazy(() => import('./pages/MyScenarioListPage.js'));
const BookmarkListPage = lazy(() => import('./pages/BookmarkListPage.js'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.js'));
const RankingPage = lazy(() => import('./pages/RankingPage.js'));
const NotificationPage = lazy(() => import('./pages/NotificationPage.js'));
const AccountPage = lazy(() => import('./pages/AccountPage.js'));
const SeriesDetailPage = lazy(() => import('./pages/SeriesDetailPage.js'));

function RequireAuth({ children, user }: { children: React.ReactNode; user: any }) {
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading, login, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  return (
    <MainLayout user={user} onLogout={logout}>
      <Suspense fallback={<div className="text-center py-8 text-gray-400">読み込み中...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage onLogin={login} />} />
          <Route path="/scenarios" element={<ScenarioListPage />} />
          <Route path="/scenarios/new" element={
            <RequireAuth user={user}><ScenarioEditorPage /></RequireAuth>
          } />
          <Route path="/scenarios/:id/edit" element={
            <RequireAuth user={user}><ScenarioEditorPage /></RequireAuth>
          } />
          <Route path="/scenarios/:id" element={<ScenarioDetailPage user={user} />} />
          <Route path="/my/scenarios" element={
            <RequireAuth user={user}><MyScenarioListPage /></RequireAuth>
          } />
          <Route path="/my/bookmarks" element={
            <RequireAuth user={user}><BookmarkListPage /></RequireAuth>
          } />
          <Route path="/rankings" element={<RankingPage />} />
          <Route path="/users/:id" element={<ProfilePage currentUser={user} />} />
          <Route path="/series/:id" element={<SeriesDetailPage />} />
          <Route path="/notifications" element={
            <RequireAuth user={user}><NotificationPage /></RequireAuth>
          } />
          <Route path="/account" element={
            <RequireAuth user={user}><AccountPage user={user} /></RequireAuth>
          } />
        </Routes>
      </Suspense>
    </MainLayout>
  );
}
