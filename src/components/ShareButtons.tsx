import React from 'react';

interface Props {
  title: string;
  url?: string;
}

export default function ShareButtons({ title, url }: Props) {
  const shareUrl = url || window.location.href;
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(shareUrl);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // fallback
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">共有:</span>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-blue-50 hover:text-blue-600 transition-colors"
      >
        X
      </a>
      <button
        onClick={copyToClipboard}
        className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 transition-colors"
      >
        URL
      </button>
    </div>
  );
}
