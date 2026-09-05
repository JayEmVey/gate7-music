import React from 'react';
import { Playlist, Track, Language } from '../types';
import { DEFAULT_TRACK_COVER, getTrackCover } from '../data';
import { SpotifyItemTarget } from './SpotifyChooserModal';

interface PlaylistDetailModalProps {
  playlist: Playlist | null;
  isOpen: boolean;
  onClose: () => void;
  currentTrackId: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track, playlist: Playlist) => void;
  onRetry?: () => void;
  onOpenSpotify?: (target: SpotifyItemTarget) => void;
  language: Language;
}

export const PlaylistDetailModal: React.FC<PlaylistDetailModalProps> = ({
  playlist,
  isOpen,
  onClose,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onRetry,
  onOpenSpotify,
  language,
}) => {
  if (!isOpen || !playlist) return null;

  const playlistCover = playlist.coverUrl || playlist.tracks.find((track) => track.coverUrl)?.coverUrl || DEFAULT_TRACK_COVER;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl bg-[#18181C] border-4 border-[#FEBC11] shadow-brutal-xl p-6 sm:p-8 overflow-y-auto max-h-[90vh] text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 bg-[#222018] hover:bg-[#FEBC11] hover:text-[#0D0D0E] border-2 border-[#FEBC11] flex items-center justify-center font-black text-sm transition-all cursor-pointer shadow-brutal"
        >
          ✕
        </button>

        {/* Playlist Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 border-b-2 border-[#2E2E38] pb-6 mb-6">
          <div
            className="w-20 h-20 border-2 border-black shadow-brutal shrink-0 overflow-hidden"
          >
            <img src={playlistCover} alt={playlist.title} className="w-full h-full object-cover" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#202026] text-[#FEBC11] px-2 py-0.5 border border-[#3E3E4C]">
                {playlist.slotName}
              </span>
              <span className="text-xs font-mono font-bold text-gray-400">
                {playlist.duration} • {playlist.trackCount} {language === 'vi' ? 'bài hát' : 'tracks'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
              {playlist.title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 font-medium">
              {playlist.description}
            </p>
            {onOpenSpotify && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() =>
                    onOpenSpotify({
                      type: 'playlist',
                      id: playlist.spotifyId || playlist.id,
                      name: playlist.title,
                      slotName: playlist.slotName,
                    })
                  }
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-black uppercase border-2 border-black shadow-brutal transition-transform active:scale-95 cursor-pointer"
                >
                  <i className="fa-brands fa-spotify text-sm"></i>
                  <span>{language === 'vi' ? 'Mở Playlist trên Spotify' : 'Open Playlist on Spotify'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tracklist */}
        <div className="space-y-2">
          {playlist.loadError && (
            <div className="border-2 border-amber-400 bg-amber-950/40 px-3 py-2 text-xs font-medium text-amber-100 flex items-center justify-between gap-3">
              <span>{playlist.loadError}</span>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="shrink-0 bg-[#FEBC11] text-[#0D0D0E] border-2 border-black px-2 py-1 font-black uppercase shadow-brutal cursor-pointer"
                >
                  {language === 'vi' ? 'Thử lại' : 'Retry'}
                </button>
              )}
            </div>
          )}
          <div className="flex items-center justify-between text-[11px] font-black uppercase text-gray-400 px-3 pb-1 border-b border-[#2A2A34]">
            <span>{language === 'vi' ? 'BÀI HÁT' : 'TRACK'}</span>
            <span className="hidden sm:inline">{language === 'vi' ? 'HỢP CÀ PHÊ' : 'PAIRING'}</span>
            <span>{language === 'vi' ? 'THỜI LƯỢNG' : 'TIME'}</span>
          </div>

          {!playlist.loadError && playlist.tracks.length === 0 && (
            <p className="px-3 py-5 text-center text-sm text-gray-400">
              {language === 'vi' ? 'Đang tải bài hát từ Spotify…' : 'Loading tracks from Spotify…'}
            </p>
          )}

          {playlist.tracks.map((track, idx) => {
            const isCurrent = track.id === currentTrackId;

            return (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track, playlist)}
                className={`p-3 border-2 flex items-center justify-between gap-3 shadow-brutal transition-all cursor-pointer group ${
                  isCurrent
                    ? 'bg-[#26241B] border-[#FEBC11] text-white'
                    : 'bg-[#1E1E24] border-[#2E2E38] hover:border-[#FEBC11]/80 hover:bg-[#24242C]'
                }`}
              >
                {/* Track Number & Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-7 h-7 bg-[#141416] border border-[#3E3E4C] flex items-center justify-center text-xs font-mono font-bold text-gray-400 shrink-0 group-hover:bg-[#FEBC11] group-hover:text-black">
                    {isCurrent && isPlaying ? (
                      <i className="fa-solid fa-volume-high text-[#FEBC11] group-hover:text-black animate-pulse"></i>
                    ) : (
                      <span>{String(idx + 1).padStart(2, '0')}</span>
                    )}
                  </div>
                  <img
                    src={getTrackCover(track)}
                    alt={track.title}
                    className="w-9 h-9 object-cover border border-black shadow-sm shrink-0"
                  />
                  <div className="min-w-0">
                    <h4
                      className={`text-xs font-black truncate group-hover:text-[#FEBC11] ${
                        isCurrent ? 'text-[#FEBC11]' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </h4>
                    <p className="text-[11px] text-gray-400 truncate">{track.artist}</p>
                  </div>
                </div>

                {/* Pairing Note */}
                <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-gray-300">
                  <i className="fa-solid fa-mug-hot text-[#FEBC11] text-[10px]"></i>
                  <span>{track.coffeePairing || 'Cà phê Muối'}</span>
                </div>

                {/* Duration & Play Action */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-gray-400">
                    {track.duration}
                  </span>
                  {onOpenSpotify && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSpotify({
                          type: 'track',
                          id: track.spotifyId || playlist.spotifyId || track.id,
                          name: track.title,
                          artist: track.artist,
                          coverUrl: getTrackCover(track),
                        });
                      }}
                      className="w-7 h-7 flex items-center justify-center border text-[#1DB954] hover:text-[#1ed760] bg-[#141416] border-[#363644] hover:border-[#1DB954] text-xs shadow-brutal transition-all cursor-pointer"
                      title={language === 'vi' ? 'Mở bài hát này trên Spotify' : 'Open this song on Spotify'}
                    >
                      <i className="fa-brands fa-spotify"></i>
                    </button>
                  )}
                  <button
                    className={`w-7 h-7 flex items-center justify-center border text-xs shadow-brutal transition-all ${
                      isCurrent
                        ? 'bg-[#FEBC11] text-[#0D0D0E] border-black'
                        : 'bg-[#141416] text-gray-300 border-[#363644] group-hover:bg-[#FEBC11] group-hover:text-black'
                    }`}
                  >
                    <i className={`fa-solid ${isCurrent && isPlaying ? 'fa-pause' : 'fa-play ml-0.5'}`}></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t-2 border-[#2E2E38] flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-gray-400">
            {language === 'vi' ? 'Gate 7 Soundstage Specialty Curations' : 'Gate 7 Soundstage Specialty Curations'}
          </span>
          <button
            onClick={() => {
              if (playlist.tracks.length > 0) {
                onPlayTrack(playlist.tracks[0], playlist);
              }
              onClose();
            }}
            className="px-4 py-2 bg-[#FEBC11] hover:bg-yellow-400 text-[#0D0D0E] text-xs font-black uppercase tracking-wider border-2 border-black shadow-brutal flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-play"></i>
            {language === 'vi' ? 'Phát Toàn Bộ Playlist Này' : 'Play Full Playlist'}
          </button>
        </div>
      </div>
    </div>
  );
};
