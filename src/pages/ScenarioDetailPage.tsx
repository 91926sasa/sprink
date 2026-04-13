import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { scenarioApi, reviewApi, bookmarkApi, playReportApi } from '../api.js';
import StarRating from '../components/StarRating.js';
import ReviewForm from '../components/ReviewForm.js';
import ReviewCard from '../components/ReviewCard.js';
import LikeButton from '../components/LikeButton.js';
import CommentSection from '../components/CommentSection.js';
import TableOfContents from '../components/TableOfContents.js';
import ShareButtons from '../components/ShareButtons.js';
import LicenseBadge from '../components/LicenseBadge.js';
import ReportModal from '../components/ReportModal.js';

interface Props {
  user: { id: string; name: string } | null;
}

export default function ScenarioDetailPage({ user }: Props) {
  const { id } = useParams<{ id: string }>();
  const [scenario, setScenario] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [playReports, setPlayReports] = useState<any[]>([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chapters' | 'reviews' | 'comments' | 'play-reports'>('chapters');
  const [showReport, setShowReport] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<string | undefined>();
  const chapterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!id) return;
    Promise.all([
      scenarioApi.getById(id),
      reviewApi.listByScenario(id),
      playReportApi.list(id),
    ]).then(([s, r, pr]) => {
      setScenario(s);
      setReviews(r);
      setPlayReports(pr);
      if (s.chapters?.length > 0) {
        setActiveChapterId(s.chapters[0].id);
      }
    }).catch(console.error)
      .finally(() => setLoading(false));

    if (user) {
      bookmarkApi.check(id).then(d => setBookmarked(d.bookmarked)).catch(() => {});
    }
  }, [id, user]);

  const handleToggleBookmark = async () => {
    if (!id || !user) return;
    const result = await bookmarkApi.toggle(id);
    setBookmarked(result.bookmarked);
  };

  const handleReviewSubmitted = async () => {
    if (!id) return;
    const r = await reviewApi.listByScenario(id);
    setReviews(r);
    const s = await scenarioApi.getById(id);
    setScenario(s);
  };

  const scrollToChapter = (chapterId: string) => {
    setActiveChapterId(chapterId);
    chapterRefs.current[chapterId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) return <div className="text-center py-12 text-gray-400">読み込み中...</div>;
  if (!scenario) return <div className="text-center py-12 text-gray-400">シナリオが見つかりません</div>;

  const isAuthor = user?.id === scenario.authorId;
  const chapters = scenario.chapters ?? [];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">{scenario.title}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-3 flex-wrap">
              {scenario.systemTag && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{scenario.systemTag}</span>
              )}
              {scenario.genre && (
                <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs">{scenario.genre}</span>
              )}
              <span>PL {scenario.playerCountMin}-{scenario.playerCountMax}人</span>
              {scenario.estimatedTime && <span>{scenario.estimatedTime}</span>}
              {scenario.spoilerLevel !== 'none' && (
                <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs">
                  ネタバレ: {scenario.spoilerLevel === 'heavy' ? '重度' : '軽度'}
                </span>
              )}
            </div>
            <p className="text-gray-600 mb-4">{scenario.description}</p>
            <div className="flex items-center gap-2 text-sm">
              <Link to={`/users/${scenario.authorId}`} className="text-primary-600 hover:text-primary-700 font-medium">
                作者プロフィール
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-gray-400">v{scenario.version}</span>
              {scenario.publishedAt && (
                <span className="text-gray-400">{new Date(scenario.publishedAt).toLocaleDateString('ja-JP')}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end flex-shrink-0">
            {isAuthor && (
              <Link to={`/scenarios/${scenario.id}/edit`} className="btn-secondary text-xs">編集</Link>
            )}
            <div className="flex items-center gap-2">
              <LikeButton scenarioId={scenario.id} isLoggedIn={!!user} />
              {user && !isAuthor && (
                <button onClick={handleToggleBookmark} className={`px-3 py-1.5 rounded-full text-sm ${
                  bookmarked ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-gray-500 hover:bg-yellow-50'
                }`}>
                  {bookmarked ? '★ 保存済み' : '☆ 保存'}
                </button>
              )}
            </div>
            <ShareButtons title={scenario.title} />
            {user && !isAuthor && (
              <button onClick={() => setShowReport(true)} className="text-xs text-gray-400 hover:text-red-500">報告する</button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {([
          { key: 'chapters' as const, label: `チャプター (${chapters.length})` },
          { key: 'reviews' as const, label: `レビュー (${reviews.length})` },
          { key: 'comments' as const, label: 'コメント' },
          { key: 'play-reports' as const, label: `プレイレポート (${playReports.length})` },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'chapters' && (
        <div className="flex gap-6">
          {chapters.length > 1 && (
            <div className="hidden lg:block w-48 flex-shrink-0">
              <TableOfContents chapters={chapters} activeChapterId={activeChapterId} onSelect={scrollToChapter} />
            </div>
          )}
          <div className="flex-1 space-y-4">
            {chapters.map((ch: any) => (
              <div key={ch.id} ref={el => { chapterRefs.current[ch.id] = el; }} className="card scroll-mt-20">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{ch.title}</h3>
                  {ch.gm_only && <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs">GM専用</span>}
                </div>
                <div className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{ch.content}</div>
              </div>
            ))}
            {chapters.length === 0 && <p className="text-gray-400 text-center py-8">チャプターがありません</p>}
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {user && !isAuthor && <ReviewForm scenarioId={scenario.id} onSubmitted={handleReviewSubmitted} />}
          {reviews.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">まだレビューはありません</p>
          ) : (
            <div className="space-y-3">{reviews.map(r => <ReviewCard key={r.id} review={r} />)}</div>
          )}
        </div>
      )}

      {activeTab === 'comments' && <CommentSection scenarioId={scenario.id} user={user} />}

      {activeTab === 'play-reports' && (
        <div className="space-y-4">
          {user && <PlayReportForm scenarioId={scenario.id} onSubmitted={async () => {
            const pr = await playReportApi.list(scenario.id);
            setPlayReports(pr);
          }} />}
          {playReports.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">まだプレイレポートはありません</p>
          ) : (
            <div className="space-y-3">
              {playReports.map((pr: any) => (
                <div key={pr.id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{pr.userName}</span>
                      {pr.playDate && <span className="text-xs text-gray-400">{pr.playDate}</span>}
                      {pr.playerCount && <span className="text-xs text-gray-400">{pr.playerCount}人</span>}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(pr.createdAt).toLocaleDateString('ja-JP')}</span>
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{pr.title}</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{pr.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* License */}
      <div className="mt-8">
        <LicenseBadge licenseType={scenario.licenseType || 'all_rights'} licenseNote={scenario.licenseNote} systemCopyright={scenario.systemCopyright} />
      </div>

      {/* TRPGO session link */}
      <div className="card bg-primary-50 border-primary-200 mt-4">
        <h3 className="font-semibold text-primary-800 mb-2">このシナリオで遊ぶ</h3>
        <p className="text-sm text-primary-600 mb-3">TRPGOでセッション募集を作成しましょう。</p>
        <a href={`${import.meta.env.VITE_TRPGO_URL || 'http://localhost:3000'}/listing/create?scenario=${scenario.id}&title=${encodeURIComponent(scenario.title)}`}
          target="_blank" rel="noopener noreferrer" className="btn-primary text-sm inline-block">TRPGOでセッション募集</a>
      </div>

      {showReport && <ReportModal targetType="scenario" targetId={scenario.id} onClose={() => setShowReport(false)} />}
    </div>
  );
}

function PlayReportForm({ scenarioId, onSubmitted }: { scenarioId: string; onSubmitted: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [playerCount, setPlayerCount] = useState('');
  const [playDate, setPlayDate] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!expanded) return <button onClick={() => setExpanded(true)} className="btn-secondary text-sm">プレイレポートを書く</button>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await playReportApi.create(scenarioId, {
        title: title.trim(), body: body.trim(),
        playerCount: playerCount ? parseInt(playerCount) : undefined,
        playDate: playDate || undefined, spoiler,
      });
      setExpanded(false); setTitle(''); setBody('');
      onSubmitted();
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h3 className="font-semibold text-sm">プレイレポート投稿</h3>
      <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="タイトル *"
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none" />
      <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="プレイの感想..." rows={3}
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none resize-y" />
      <div className="flex gap-3">
        <input type="number" value={playerCount} onChange={e => setPlayerCount(e.target.value)} placeholder="人数" min={1}
          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm outline-none" />
        <input type="date" value={playDate} onChange={e => setPlayDate(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-sm outline-none" />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1 text-xs text-gray-500">
          <input type="checkbox" checked={spoiler} onChange={e => setSpoiler(e.target.checked)} /> ネタバレ
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setExpanded(false)} className="btn-ghost text-xs">キャンセル</button>
          <button type="submit" disabled={submitting || !title.trim()} className="btn-primary text-xs">
            {submitting ? '投稿中...' : '投稿'}
          </button>
        </div>
      </div>
    </form>
  );
}
