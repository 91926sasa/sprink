import React, { useState } from 'react';
import { reviewApi } from '../api.js';
import StarRating from './StarRating.js';

interface Props {
  scenarioId: string;
  onSubmitted: () => void;
}

export default function ReviewForm({ scenarioId, onSubmitted }: Props) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setSubmitting(true);
    try {
      await reviewApi.submit(scenarioId, { rating, title, body, spoiler });
      setRating(0);
      setTitle('');
      setBody('');
      setSpoiler(false);
      setExpanded(false);
      onSubmitted();
    } catch (err) {
      console.error('Review submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)} className="btn-secondary mb-4 text-sm">
        レビューを書く
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-4 space-y-3">
      <h3 className="font-semibold text-sm">レビューを投稿</h3>

      <div>
        <label className="text-xs text-gray-500 block mb-1">評価 *</label>
        <StarRating rating={rating} onChange={setRating} size="lg" />
      </div>

      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="レビュータイトル（任意）"
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none"
      />

      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="レビュー本文（任意）"
        rows={3}
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none resize-y"
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1 text-xs text-gray-500">
          <input type="checkbox" checked={spoiler} onChange={e => setSpoiler(e.target.checked)} />
          ネタバレを含む
        </label>

        <div className="flex gap-2">
          <button type="button" onClick={() => setExpanded(false)} className="btn-ghost text-xs">
            キャンセル
          </button>
          <button type="submit" disabled={submitting || rating === 0} className="btn-primary text-xs">
            {submitting ? '投稿中...' : '投稿'}
          </button>
        </div>
      </div>
    </form>
  );
}
