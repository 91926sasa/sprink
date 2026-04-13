import React from 'react';

interface Chapter {
  id: string;
  title: string;
  gm_only: boolean;
}

interface Props {
  chapters: Chapter[];
  activeChapterId?: string;
  onSelect: (chapterId: string) => void;
  showGmOnly?: boolean;
}

export default function TableOfContents({ chapters, activeChapterId, onSelect, showGmOnly = true }: Props) {
  const visibleChapters = showGmOnly ? chapters : chapters.filter(ch => !ch.gm_only);

  return (
    <nav className="bg-white border border-gray-200 rounded-xl p-4 sticky top-20">
      <h3 className="font-semibold text-sm text-gray-700 mb-3">目次</h3>
      <ol className="space-y-1">
        {visibleChapters.map((ch, index) => (
          <li key={ch.id}>
            <button
              onClick={() => onSelect(ch.id)}
              className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                activeChapterId === ch.id
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-gray-400 mr-1.5">{index + 1}.</span>
              {ch.title || `チャプター ${index + 1}`}
              {ch.gm_only && <span className="ml-1 text-xs text-red-400">GM</span>}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
