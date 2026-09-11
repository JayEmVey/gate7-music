import React from 'react';
import { AlbumDetail, Language, Theme, Track } from '../types';
import { DEFAULT_TRACK_COVER } from '../data';
import { useModalBehavior } from './useModalBehavior';

interface AlbumDetailModalProps {
  album: AlbumDetail | null;
  isOpen: boolean;
  isLoading: boolean;
  error?: string;
  currentTrackId: string;
  isPlaying: boolean;
  onClose: () => void;
  onPlayTrack: (track: Track, album: AlbumDetail) => void;
  onPlayAlbum: (album: AlbumDetail) => void;
  language: Language;
  theme?: Theme;
}

function formatReleaseDate(date: string, language: Language): string {
  if (!date) return '';
  const parsed = new Date(date.length === 4 ? `${date}-01-01` : date.length === 7 ? `${date}-01` : date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: date.length > 7 ? 'numeric' : undefined,
  });
}

function formatTotalDuration(tracks: Track[]): string {
  const totalSec = tracks.reduce((sum, track) => sum + (track.durationSec || 0), 0);
  const mins = Math.round(totalSec / 60);
  return `${mins} min`;
}

export const AlbumDetailModal: React.FC<AlbumDetailModalProps> = ({
  album,
  isOpen,
  isLoading,
  error,
  currentTrackId,
  isPlaying,
  onClose,
  onPlayTrack,
  onPlayAlbum,
  language,
  theme = 'dark',
}) => {
  useModalBehavior(isOpen, onClose);
  const isLight = theme === 'light';

  if (!isOpen) return null;

  const albumTypeLabel = (() => {
    const type = (album?.albumType || '').toLowerCase();
    if (type === 'single') return language === 'vi' ? 'Single' : 'Single';
    if (type === 'compilation') return language === 'vi' ? 'Compilation' : 'Compilation';
    return language === 'vi' ? 'Album' : 'Album';
  })();

  const year = album?.releaseDate?.slice(0, 4) || '';
  const artistNames = album?.artists.map((artist) => artist.name).join(', ') || '';
  const cover = album?.coverUrl || album?.tracks.find((track) => track.coverUrl)?.coverUrl || DEFAULT_TRACK_COVER;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`relative w-full max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] border-4 border-[#FEBC11] shadow-brutal-xl p-4 sm:p-8 overflow-y-auto overflow-x-hidden ${
          isLight ? 'bg-white text-black' : 'bg-[#18181C] text-gray-100'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="album-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-5 right-5 z-20 w-8 h-8 hover:bg-[#FEBC11] hover:text-[#0D0D0E] border-2 border-[#FEBC11] flex items-center justify-center font-black text-sm transition-all cursor-pointer shadow-brutal ${
            isLight ? 'bg-white text-black' : 'bg-[#222018]'
          }`}
          aria-label={language === 'vi' ? 'Đóng album' : 'Close album'}
        >
          ✕
        </button>

        {isLoading && (
          <p className={`px-3 py-16 text-center text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
            {language === 'vi' ? 'Đang tải album…' : 'Loading album…'}
          </p>
        )}

        {!isLoading && error && (
          <p className={`border-2 border-amber-400 px-3 py-3 text-sm ${
            isLight ? 'bg-amber-50 text-amber-900' : 'bg-amber-950/40 text-amber-100'
          }`}>{error}</p>
        )}

        {!isLoading && !error && album && (
          <>
            <div className={`flex flex-col sm:flex-row items-start gap-5 border-b-2 pb-6 mb-5 pr-10 ${
              isLight ? 'border-gray-200' : 'border-[#2E2E38]'
            }`}>
              <div className="w-28 h-28 sm:w-36 sm:h-36 border-2 border-black shadow-brutal shrink-0 overflow-hidden">
                <img src={cover} alt={album.name} className="w-full h-full object-cover" />
              </div>

              <div className="min-w-0 space-y-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  {albumTypeLabel}
                </span>
                <h2 id="album-modal-title" className={`text-2xl sm:text-4xl font-black tracking-tight leading-tight ${
                  isLight ? 'text-black' : 'text-white'
                }`}>
                  {album.name}
                </h2>
                <p className={`text-sm font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                  <span className={isLight ? 'text-black' : 'text-white'}>{artistNames}</span>
                  {year ? ` • ${year}` : ''}
                  {` • ${album.tracks.length} ${language === 'vi' ? 'bài hát' : 'songs'}, ${formatTotalDuration(album.tracks)}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <button
                type="button"
                onClick={() => onPlayAlbum(album)}
                className="w-12 h-12 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black border-2 border-black shadow-brutal flex items-center justify-center cursor-pointer transition-transform active:scale-95"
                title={language === 'vi' ? 'Phát album' : 'Play album'}
              >
                <i className="fa-solid fa-play ml-0.5"></i>
              </button>
              <img src={cover} alt="" className="w-8 h-8 object-cover border border-black shadow-sm" />
            </div>

            <div className="space-y-1">
              <div className={`grid grid-cols-[2rem_1fr_3.5rem] gap-2 text-[11px] font-black uppercase px-2 pb-2 border-b ${
                isLight ? 'text-gray-500 border-gray-200' : 'text-gray-400 border-[#2A2A34]'
              }`}>
                <span>#</span>
                <span>{language === 'vi' ? 'Tiêu đề' : 'Title'}</span>
                <span className="text-right"><i className="fa-regular fa-clock"></i></span>
              </div>

              {album.tracks.map((track, index) => {
                const isCurrent = track.id === currentTrackId || (!!track.spotifyId && currentTrackId === `spotify-${track.spotifyId}`);
                return (
                  <button
                    type="button"
                    key={`${track.id}-${index}`}
                    onClick={() => onPlayTrack(track, album)}
                    className={`w-full grid grid-cols-[2rem_1fr_3.5rem] gap-2 items-center px-2 py-2.5 text-left transition-colors cursor-pointer group ${
                      isCurrent
                        ? isLight ? 'bg-[#FFFDF0]' : 'bg-[#26241B]'
                        : isLight ? 'hover:bg-gray-100' : 'hover:bg-[#24242C]'
                    }`}
                  >
                    <span className={`text-xs font-mono font-bold ${
                      isCurrent ? 'text-[#FEBC11]' : isLight ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {isCurrent && isPlaying
                        ? <i className="fa-solid fa-volume-high text-[#FEBC11] animate-pulse" />
                        : index + 1}
                    </span>
                    <span className="min-w-0">
                      <strong className={`block text-sm font-bold truncate ${
                        isCurrent ? 'text-[#FEBC11]' : isLight ? 'text-black' : 'text-white'
                      }`}>{track.title}</strong>
                      <span className={`block text-xs truncate ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                        {track.artist}
                      </span>
                    </span>
                    <span className={`text-xs font-mono text-right ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                      {track.duration}
                    </span>
                  </button>
                );
              })}
            </div>

            {(album.releaseDate || (album.copyrights && album.copyrights.length > 0)) && (
              <div className={`mt-6 pt-4 border-t text-xs space-y-1 ${
                isLight ? 'border-gray-200 text-gray-600' : 'border-[#2E2E38] text-gray-400'
              }`}>
                {album.releaseDate && <p>{formatReleaseDate(album.releaseDate, language)}</p>}
                {album.copyrights?.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
