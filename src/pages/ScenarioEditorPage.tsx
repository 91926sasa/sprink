import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scenarioApi, tagApi } from '../api.js';

export default function ScenarioEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [systemTag, setSystemTag] = useState('');
  const [genre, setGenre] = useState('');
  const [playerCountMin, setPlayerCountMin] = useState(1);
  const [playerCountMax, setPlayerCountMax] = useState(4);
  const [estimatedTime, setEstimatedTime] = useState('');
  const [spoilerLevel, setSpoilerLevel] = useState('none');
  const [chapters, setChapters] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [availableTags, setAvailableTags] = useState<any[]>([]);

  useEffect(() => {
    tagApi.list().then(setAvailableTags).catch(console.error);
  }, []);

  useEffect(() => {
    if (!id) return;
    scenarioApi.getById(id).then(s => {
      setTitle(s.title);
      setDescription(s.description);
      setSystemTag(s.systemTag);
      setGenre(s.genre);
      setPlayerCountMin(s.playerCountMin);
      setPlayerCountMax(s.playerCountMax);
      setEstimatedTime(s.estimatedTime || '');
      setSpoilerLevel(s.spoilerLevel);
      setChapters(s.chapters || []);
    }).catch(console.error);
  }, [id]);

  const addChapter = () => {
    setChapters([...chapters, {
      id: `ch_${Date.now()}`,
      title: '',
      order: chapters.length + 1,
      content: '',
      gm_only: false,
    }]);
  };

  const updateChapter = (index: number, field: string, value: any) => {
    const updated = chapters.map((ch, i) => i === index ? { ...ch, [field]: value } : ch);
    setChapters(updated);
  };

  const removeChapter = (index: number) => {
    setChapters(chapters.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tagNames.includes(trimmed)) {
      setTagNames([...tagNames, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (name: string) => {
    setTagNames(tagNames.filter(t => t !== name));
  };

  const handleSave = async (publish = false) => {
    if (!title.trim()) return;
    setSaving(true);

    try {
      const body = {
        title, description, systemTag, genre,
        playerCountMin, playerCountMax,
        estimatedTime: estimatedTime || null,
        chapters, spoilerLevel, tagNames,
      };

      let scenarioId: string;
      if (isEdit) {
        const result = await scenarioApi.update(id!, body);
        scenarioId = result.id;
      } else {
        const result = await scenarioApi.create(body);
        scenarioId = result.id;
      }

      if (publish) {
        await scenarioApi.updateStatus(scenarioId, 'published', 'public');
      }

      navigate(publish ? `/scenarios/${scenarioId}` : '/my/scenarios');
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        {isEdit ? 'シナリオ編集' : '新規シナリオ作成'}
      </h1>

      {/* Basic info */}
      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">タイトル *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            placeholder="シナリオタイトル"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-y"
            placeholder="シナリオの概要を記述..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">システム</label>
            <input
              type="text"
              value={systemTag}
              onChange={e => setSystemTag(e.target.value)}
              list="systems"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="クトゥルフ神話TRPG"
            />
            <datalist id="systems">
              {availableTags.filter(t => t.category === 'system').map(t => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ジャンル</label>
            <input
              type="text"
              value={genre}
              onChange={e => setGenre(e.target.value)}
              list="genres"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="ホラー"
            />
            <datalist id="genres">
              {availableTags.filter(t => t.category === 'genre').map(t => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">最少PL</label>
            <input type="number" value={playerCountMin} onChange={e => setPlayerCountMin(parseInt(e.target.value))}
              min={1} max={20} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">最多PL</label>
            <input type="number" value={playerCountMax} onChange={e => setPlayerCountMax(parseInt(e.target.value))}
              min={1} max={20} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">所要時間</label>
            <input type="text" value={estimatedTime} onChange={e => setEstimatedTime(e.target.value)}
              placeholder="3-4時間" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ネタバレ度</label>
          <select value={spoilerLevel} onChange={e => setSpoilerLevel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
            <option value="none">なし</option>
            <option value="mild">軽度</option>
            <option value="heavy">重度</option>
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">タグ</label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {tagNames.map(name => (
              <span key={name} className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full text-xs flex items-center gap-1">
                {name}
                <button onClick={() => removeTag(name)} className="text-primary-400 hover:text-primary-600">x</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="タグを追加..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
            />
            <button onClick={addTag} className="btn-secondary text-xs">追加</button>
          </div>
        </div>
      </div>

      {/* Chapters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">チャプター</h2>
          <button onClick={addChapter} className="btn-secondary text-sm">+ チャプター追加</button>
        </div>

        {chapters.map((ch, index) => (
          <div key={ch.id} className="card space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400 font-mono">#{index + 1}</span>
              <input
                type="text"
                value={ch.title}
                onChange={e => updateChapter(index, 'title', e.target.value)}
                placeholder="チャプタータイトル"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none"
              />
              <label className="flex items-center gap-1 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={ch.gm_only}
                  onChange={e => updateChapter(index, 'gm_only', e.target.checked)}
                />
                GM専用
              </label>
              <button onClick={() => removeChapter(index)} className="text-red-400 hover:text-red-600 text-sm">
                削除
              </button>
            </div>
            <textarea
              value={ch.content}
              onChange={e => updateChapter(index, 'content', e.target.value)}
              rows={6}
              placeholder="チャプター内容を記述..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-y"
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-8">
        <button onClick={() => navigate(-1)} className="btn-ghost">キャンセル</button>
        <button onClick={() => handleSave(false)} disabled={saving || !title.trim()} className="btn-secondary">
          {saving ? '保存中...' : '下書き保存'}
        </button>
        <button onClick={() => handleSave(true)} disabled={saving || !title.trim()} className="btn-primary">
          {saving ? '公開中...' : '公開する'}
        </button>
      </div>
    </div>
  );
}
