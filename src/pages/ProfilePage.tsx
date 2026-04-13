import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { profileApi, followApi } from '../api.js';
import ScenarioCard from '../components/ScenarioCard.js';
import FollowButton from '../components/FollowButton.js';

interface Props {
  currentUser: { id: string } | null;
}

export default function ProfilePage({ currentUser }: Props) {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    profileApi.get(id).then(data => {
      setProfile(data.user);
      setScenarios(data.scenarios);
      setIsFollowing(data.isFollowing);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleFollowToggle = async () => {
    if (!id || !currentUser) return;
    const result = await followApi.toggle(id);
    setIsFollowing(result.following);
    if (profile) {
      setProfile({
        ...profile,
        followerCount: profile.followerCount + (result.following ? 1 : -1),
      });
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">読み込み中...</div>;
  if (!profile) return <div className="text-center py-12 text-gray-400">ユーザーが見つかりません</div>;

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile header */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-2xl text-primary-600 font-bold flex-shrink-0">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              profile.name.charAt(0)
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold">{profile.name}</h1>
              {!isOwnProfile && currentUser && (
                <FollowButton isFollowing={isFollowing} onToggle={handleFollowToggle} />
              )}
              {isOwnProfile && (
                <Link to="/account" className="btn-ghost text-xs">プロフィール編集</Link>
              )}
            </div>
            {profile.bio && <p className="text-gray-600 text-sm mb-2">{profile.bio}</p>}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span><strong>{profile.scenarioCount}</strong> シナリオ</span>
              <span><strong>{profile.followerCount}</strong> フォロワー</span>
              {profile.twitterHandle && (
                <a href={`https://twitter.com/${profile.twitterHandle}`} target="_blank" rel="noopener noreferrer"
                   className="text-primary-600 hover:text-primary-700">@{profile.twitterHandle}</a>
              )}
              {profile.websiteUrl && (
                <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                   className="text-primary-600 hover:text-primary-700">Website</a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scenarios */}
      <section>
        <h2 className="text-lg font-bold mb-4">公開シナリオ</h2>
        {scenarios.length === 0 ? (
          <p className="text-gray-400 text-sm">まだ公開シナリオはありません</p>
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
