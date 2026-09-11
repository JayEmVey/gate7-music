import React from 'react';
import { ArtistDetail, Language, Theme, Track } from '../types';
import { getTrackCover } from '../data';
import { useModalBehavior } from './useModalBehavior';

interface ArtistPopularModalProps {
  artist: ArtistDetail | null;
  isOpen: boolean;
  isLoading: boolean;
  error?: string;
  currentTrackId: string;
  isPlaying: boolean;
  onClose: () => void;
  onPlayTrack: (track: Track, artist: ArtistDetail) => void;
  onPlayArtist: (artist: ArtistDetail) => void;
  language: Language;
  theme?: Theme;
}

function formatFollowers(count: number, language: Language): string {
  return `${count.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')} ${
    language === 'vi' ? 'người theo dõi' : 'followers'
  }`;
}

export const ArtistPopularModal: React.FC<ArtistPopularModalProps> = ({
  artist,
  isOpen,
  isLoading,
  error,
  currentTrackId,
  isPlaying,
  onClose,
  onPlayTrack,
  onPlayArtist,
  language,
  theme = 'dark',
}) => {
  useModalBehavior(isOpen, onClose);
  const isLight = theme === 'light';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`relative w-full max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] border-4 border-[#FEBC11] shadow-brutal-xl p-4 sm:p-8 overflow-y-auto overflow-x-hidden ${
          isLight ? 'bg-white text-black' : 'bg-[#18181C] text-gray-100'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="artist-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-5 right-5 z-20 w-8 h-8 hover:bg-[#FEBC11] hover:text-[#0D0D0E] border-2 border-[#FEBC11] flex items-center justify-center font-black text-sm transition-all cursor-pointer shadow-brutal ${
            isLight ? 'bg-white text-black' : 'bg-[#222018]'
          }`}
          aria-label={language === 'vi' ? 'Đóng nghệ sĩ' : 'Close artist'}
        >
          ✕
        </button>

        {isLoading && (
          <p className={`px-3 py-16 text-center text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
            {language === 'vi' ? 'Đang tải nghệ sĩ…' : 'Loading artist…'}
          </p>
        )}

        {!isLoading && error && (
          <p className={`border-2 border-amber-400 px-3 py-3 text-sm ${
            isLight ? 'bg-amber-50 text-amber-900' : 'bg-amber-950/40 text-amber-100'
          }`}>{error}</p>
        )}

        {!isLoading && !error && artist && (
          <>
            <div className={`border-b-2 pb-5 mb-5 pr-10 ${isLight ? 'border-gray-200' : 'border-[#2E2E38]'}`}>
              <h2 id="artist-modal-title" className={`text-3xl sm:text-4xl font-black tracking-tight ${
                isLight ? 'text-black' : 'text-white'
              }`}>
                {artist.name}
              </h2>
              {artist.followers > 0 && (
                <p className={`mt-1 text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  {formatFollowers(artist.followers, language)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => onPlayArtist(artist)}
                className="w-12 h-12 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black border-2 border-black shadow-brutal flex items-center justify-center cursor-pointer transition-transform active:scale-95"
                title={language === 'vi' ? 'Phát bài phổ biến' : 'Play popular tracks'}
              >
                <i className="fa-solid fa-play ml-0.5"></i>
              </button>
              {artist.tracks[0] && (
                <img
                  src={getTrackCover(artist.tracks[0])}
                  alt=""
                  className="w-8 h-8 object-cover border border-black shadow-sm"
                />
              )}
            </div>

            <h3 className={`text-lg font-black mb-3 ${isLight ? 'text-black' : 'text-white'}`}>
              {language === 'vi' ? 'Phổ biến' : 'Popular'}
            </h3>

            <div className="space-y-1">
              {artist.tracks.length === 0 ? (
                <p className={`px-2 py-6 text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  {language === 'vi' ? 'Không tìm thấy bài hát của nghệ sĩ này.' : 'No tracks found for this artist.'}
                </p>
              ) : artist.tracks.map((track, index) => {
                const isCurrent = track.id === currentTrackId
                  || (!!track.spotifyId && currentTrackId === `spotify-${track.spotifyId}`);
                return (
                  <button
                    type="button"
                    key={`${track.id}-${index}`}
                    onClick={() => onPlayTrack(track, artist)}
                    className={`w-full flex items-center gap-3 px-2 py-2.5 text-left transition-colors cursor-pointer group ${
                      isCurrent
                        ? isLight ? 'bg-[#FFFDF0]' : 'bg-[#26241B]'
                        : isLight ? 'hover:bg-gray-100' : 'hover:bg-[#24242C]'
                    }`}
                  >
                    <span className={`w-5 text-center text-sm font-mono font-bold shrink-0 ${
                      isCurrent ? 'text-[#FEBC11]' : isLight ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {isCurrent && isPlaying
                        ? <i className="fa-solid fa-volume-high text-[#FEBC11] animate-pulse" />
                        : index + 1}
                    </span>
                    <img
                      src={getTrackCover(track)}
                      alt=""
                      className="w-10 h-10 object-cover border border-black shadow-sm shrink-0"
                    />
                    <span className={`min-w-0 flex-1 text-sm font-bold truncate ${
                      isCurrent ? 'text-[#FEBC11]' : isLight ? 'text-black' : 'text-white'
                    }`}>
                      {track.title}
                    </span>
                    <span className={`text-xs font-mono shrink-0 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                      {track.duration}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
