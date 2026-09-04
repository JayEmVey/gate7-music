import React, { useState } from 'react';
import { ExternalLink, Music2, Disc, Copy, Check, X, Laptop } from 'lucide-react';
import { SpotifyItemTarget, buildSpotifyUrl, buildSpotifyAppUri } from '../utils/spotify';
import { Language, Theme } from '../types';

export type { SpotifyItemTarget };

interface SpotifyChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: SpotifyItemTarget | null;
  language: Language;
  theme?: Theme;
}

export const SpotifyChooserModal: React.FC<SpotifyChooserModalProps> = ({
  isOpen,
  onClose,
  target,
  language,
  theme = 'dark',
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !target) return null;

  const isLight = theme === 'light';
  const webUrl = buildSpotifyUrl(target.type, target.id);
  const appUri = buildSpotifyAppUri(target.type, target.id);

  const handleOpenApp = () => {
    window.location.href = appUri;
    onClose();
  };

  const handleOpenWeb = () => {
    window.open(webUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(webUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const isPlaylist = target.type === 'playlist';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md border-3 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transition-colors ${
          isLight ? 'bg-white text-black' : 'bg-[#18181C] text-white'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="spotify-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center text-black font-black border-2 border-black shadow-brutal-sm">
              <i className="fa-brands fa-spotify text-lg text-black"></i>
            </div>
            <div>
              <h3 id="spotify-modal-title" className="text-base font-black tracking-tight uppercase">
                {language === 'vi' ? 'Mở trên Spotify' : 'Open in Spotify'}
              </h3>
              <p className="text-[11px] font-bold text-gray-500">
                {isPlaylist
                  ? language === 'vi'
                    ? 'Danh sách phát Gate 7 Roastery'
                    : 'Gate 7 Roastery Curated Playlist'
                  : language === 'vi'
                  ? 'Giai điệu đang phát'
                  : 'Now Playing Track'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 border-2 border-black shadow-brutal-sm font-black transition-all cursor-pointer ${
              isLight ? 'bg-gray-100 hover:bg-gray-200 text-black' : 'bg-[#25252D] hover:bg-[#32323D] text-white'
            }`}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Item Card */}
        <div
          className={`my-5 p-3.5 border-2 border-black flex items-center gap-3.5 shadow-brutal-sm ${
            isLight ? 'bg-[#F9F9F7]' : 'bg-[#202026]'
          }`}
        >
          {target.coverUrl ? (
            <img
              src={target.coverUrl}
              alt={target.name}
              className="w-14 h-14 object-cover border-2 border-black shrink-0 shadow-sm"
              onError={(e) => {
                // Fallback to placeholder if broken image
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-14 h-14 bg-[#FEBC11] border-2 border-black flex items-center justify-center shrink-0">
              {isPlaylist ? <Disc className="w-7 h-7 text-black" /> : <Music2 className="w-7 h-7 text-black" />}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <span className="inline-block px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-[#1DB954] text-black border border-black mb-1">
              {isPlaylist
                ? language === 'vi'
                  ? 'Playlist'
                  : 'Playlist'
                : language === 'vi'
                ? 'Bài hát'
                : 'Song'}
            </span>
            <h4 className="text-sm font-black truncate leading-tight">{target.name}</h4>
            <p className="text-xs font-bold text-gray-500 truncate mt-0.5">
              {target.artist || target.slotName || 'Gate 7 Coffee Roastery'}
            </p>
          </div>
        </div>

        {/* Instructions / Prompt */}
        <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-4">
          {language === 'vi'
            ? 'Bạn muốn mở giai điệu này qua ứng dụng máy tính hay trên trình duyệt web?'
            : 'How would you like to open this on Spotify?'}
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Option 1: Desktop App */}
          <button
            type="button"
            id="open-spotify-app"
            onClick={handleOpenApp}
            className="w-full flex items-center justify-between px-4 py-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-black text-xs uppercase tracking-wide border-2 border-black shadow-brutal active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Laptop className="w-4 h-4" />
              <span>{language === 'vi' ? 'Ứng dụng Spotify (Desktop)' : 'Spotify Desktop App'}</span>
            </div>
            <span className="text-[10px] font-extrabold bg-black/15 px-2 py-0.5 border border-black group-hover:bg-black group-hover:text-white transition-colors">
              spotify://
            </span>
          </button>

          {/* Option 2: Web Browser */}
          <button
            type="button"
            id="open-spotify-web"
            onClick={handleOpenWeb}
            className={`w-full flex items-center justify-between px-4 py-3 font-black text-xs uppercase tracking-wide border-2 border-black shadow-brutal active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-gray-100 text-black'
                : 'bg-[#23232B] hover:bg-[#2C2C36] text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ExternalLink className="w-4 h-4 text-[#1DB954]" />
              <span>{language === 'vi' ? 'Trình duyệt Web' : 'Web Browser'}</span>
            </div>
            <span className="text-[10px] font-extrabold text-gray-400">open.spotify.com</span>
          </button>
        </div>

        {/* Footer actions: Copy Link & Close */}
        <div className="mt-5 pt-4 border-t border-black/20 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-500 font-black">
                  {language === 'vi' ? 'Đã sao chép link!' : 'Copied link!'}
                </span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{language === 'vi' ? 'Sao chép link' : 'Copy link'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="font-bold text-gray-500 hover:text-black dark:hover:text-white cursor-pointer"
          >
            {language === 'vi' ? 'Đóng' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
