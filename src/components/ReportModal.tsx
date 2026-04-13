import React, { useState } from 'react';
import { reportApi } from '../api.js';

interface Props {
  targetType: 'scenario' | 'review' | 'comment' | 'user';
  targetId: string;
  onClose: () => void;
}

const REASONS = [
  { value: 'spam', label: 'スパム' },
  { value: 'harassment', label: '嫌がらせ・誹謗中傷' },
  { value: 'copyright', label: '著作権侵害' },
  { value: 'inappropriate', label: '不適切なコンテンツ' },
  { value: 'spoiler', label: 'ネタバレ（未マーク）' },
  { value: 'other', label: 'その他' },
] as const;

export default function ReportModal({ targetType, targetId, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

    setSubmitting(true);
    try {
      await reportApi.submit({ targetType, targetId, reason, description });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        {submitted ? (
          <div className="text-center py-4">
            <p className="text-lg font-semibold mb-2">報告を受け付けました</p>
            <p className="text-sm text-gray-500 mb-4">ご報告ありがとうございます。運営チームが確認いたします。</p>
            <button onClick={onClose} className="btn-primary">閉じる</button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold mb-4">コンテンツを報告</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">報告理由 *</label>
                <div className="space-y-2">
                  {REASONS.map(r => (
                    <label key={r.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={e => setReason(e.target.value)}
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">詳細（任意）</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-y"
                  placeholder="具体的な問題を説明..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="btn-ghost">キャンセル</button>
                <button type="submit" disabled={submitting || !reason} className="btn-danger text-sm">
                  {submitting ? '送信中...' : '報告する'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
