import React, { useEffect, useState } from 'react';
import { commentApi } from '../api.js';

interface Props {
  scenarioId: string;
  user: { id: string; name: string } | null;
}

export default function CommentSection({ scenarioId, user }: Props) {
  const [comments, setComments] = useState<any[]>([]);
  const [body, setBody] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [scenarioId]);

  const loadComments = async () => {
    try {
      const data = await commentApi.list(scenarioId);
      setComments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !user) return;

    setSubmitting(true);
    try {
      await commentApi.create(scenarioId, {
        body: body.trim(),
        spoiler,
        parentId: replyTo,
      });
      setBody('');
      setSpoiler(false);
      setReplyTo(null);
      await loadComments();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    await commentApi.delete(commentId);
    await loadComments();
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">コメント ({comments.length})</h2>

      {/* Comment form */}
      {user ? (
        <form onSubmit={handleSubmit} className="card space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>返信先</span>
              <button onClick={() => setReplyTo(null)} className="text-red-400 hover:text-red-600">x キャンセル</button>
            </div>
          )}
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="コメントを入力..."
            rows={2}
            maxLength={2000}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-y"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1 text-xs text-gray-500">
              <input type="checkbox" checked={spoiler} onChange={e => setSpoiler(e.target.checked)} />
              ネタバレ
            </label>
            <button type="submit" disabled={submitting || !body.trim()} className="btn-primary text-xs">
              {submitting ? '送信中...' : '送信'}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-gray-400">コメントするにはログインが必要です</p>
      )}

      {/* Comment list */}
      <div className="space-y-3">
        {comments.map((comment: any) => (
          <div key={comment.id} className="card py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{comment.userName}</span>
              <span className="text-xs text-gray-400">
                {new Date(comment.createdAt).toLocaleDateString('ja-JP')}
              </span>
              {comment.edited && <span className="text-xs text-gray-400">(編集済み)</span>}
            </div>

            {comment.spoiler ? (
              <SpoilerText text={comment.body} />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</p>
            )}

            <div className="flex items-center gap-2 mt-2">
              {user && (
                <button onClick={() => setReplyTo(comment.id)} className="text-xs text-gray-400 hover:text-primary-600">
                  返信
                </button>
              )}
              {user?.id === comment.userId && (
                <button onClick={() => handleDelete(comment.id)} className="text-xs text-gray-400 hover:text-red-600">
                  削除
                </button>
              )}
            </div>

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="ml-6 mt-3 space-y-2 border-l-2 border-gray-100 pl-3">
                {comment.replies.map((reply: any) => (
                  <div key={reply.id} className="py-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-xs">{reply.userName}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(reply.createdAt).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{reply.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function SpoilerText({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return <p className="text-sm text-gray-700 whitespace-pre-wrap">{text}</p>;
  }

  return (
    <div className="relative">
      <p className="text-sm text-gray-700 blur-sm select-none">{text}</p>
      <button
        onClick={() => setRevealed(true)}
        className="absolute inset-0 flex items-center justify-center bg-gray-50/80 rounded text-sm text-gray-600"
      >
        ネタバレを表示
      </button>
    </div>
  );
}
