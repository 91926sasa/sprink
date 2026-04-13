import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { notificationApi } from '../api.js';

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationApi.list().then(data => {
      setNotifications(data.items);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleMarkAllRead = async () => {
    await notificationApi.markRead();
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getNotificationLink = (n: any): string => {
    if (n.targetType === 'scenario') return `/scenarios/${n.targetId}`;
    if (n.type === 'new_follower' && n.actorId) return `/users/${n.actorId}`;
    return '#';
  };

  const getNotificationIcon = (type: string): string => {
    const icons: Record<string, string> = {
      new_follower: '👤',
      new_review: '⭐',
      new_comment: '💬',
      comment_reply: '↩️',
      new_like: '❤️',
      new_bookmark: '🔖',
      scenario_published: '📜',
      report_resolved: '✅',
      series_updated: '📚',
    };
    return icons[type] || '🔔';
  };

  if (loading) return <div className="text-center py-8 text-gray-400">読み込み中...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">通知</h1>
        {notifications.some(n => !n.read) && (
          <button onClick={handleMarkAllRead} className="btn-ghost text-xs">
            すべて既読にする
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">通知はありません</div>
      ) : (
        <div className="space-y-1">
          {notifications.map(n => (
            <Link
              key={n.id}
              to={getNotificationLink(n)}
              className={`card flex items-center gap-3 py-3 ${
                n.read ? 'opacity-60' : 'border-l-2 border-l-primary-500'
              }`}
            >
              <span className="text-lg">{getNotificationIcon(n.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{n.message}</p>
                <span className="text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
