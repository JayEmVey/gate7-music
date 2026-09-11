import React, { useEffect, useRef, useState } from 'react';
import { Track, Language, ShuffleMode, RepeatMode } from '../types';
import { getTrackCover } from '../data';

interface BottomPlayerProps {
  currentTrack: Track;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  playbackSec: number;
  onSeek: (sec: number) => void;
  isLiked: boolean;
  onToggleLike: () => void;
  shuffleMode: ShuffleMode;
  onToggleShuffle: () => void;
  repeatMode: RepeatMode;
  onToggleRepeat: () => void;
  volume: number;
  onChangeVolume: (vol: number) => void;
  onMuteToggle: () => void;
  onOpenAlbum: () => void;
  onOpenArtist: () => void;
  onOpenSpotify?: () => void;
  onPlayQueueTrack?: (track: Track) => void;
  spotifyQueue: Track[];
  language: Language;
  theme?: 'dark' | 'light';
  isAudioFeaturesLoading?: boolean;
  contextName?: string;
}

export const BottomPlayer: React.FC<BottomPlayerProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  playbackSec,
  onSeek,
  isLiked,
  onToggleLike,
  shuffleMode,
  onToggleShuffle,
  repeatMode,
  onToggleRepeat,
  volume,
  onChangeVolume,
  onMuteToggle,
  onOpenAlbum,
  onOpenArtist,
  onOpenSpotify,
  onPlayQueueTrack,
  spotifyQueue,
  language,
  theme = 'dark',
  isAudioFeaturesLoading = false,
  contextName,
}) => {
  const [showQueue, setShowQueue] = useState(false);
  const volumeDragActive = useRef(false);
  const queuePanelRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';

  useEffect(() => {
    if (!showQueue) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!queuePanelRef.current?.contains(event.target as Node)) {
        setShowQueue(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showQueue]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progressPercent = currentTrack.durationSec > 0
    ? Math.min(100, (playbackSec / currentTrack.durationSec) * 100)
    : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(Math.floor(ratio * currentTrack.durationSec));
  };

  const setVolumeFromClientX = (clientX: number, target: HTMLDivElement) => {
    const rect = target.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChangeVolume(Math.round(ratio * 100));
  };

  const handleVolumePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    volumeDragActive.current = true;
    setVolumeFromClientX(e.clientX, e.currentTarget);
  };

  const handleVolumePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!volumeDragActive.current) return;
    setVolumeFromClientX(e.clientX, e.currentTarget);
  };

  const handleVolumePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    volumeDragActive.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const shuffleActive = shuffleMode !== 'off';
  const shuffleTitle = (() => {
    if (shuffleMode === 'smart') {
      return language === 'vi' ? 'Tắt Smart Shuffle' : 'Disable Smart Shuffle';
    }
    if (shuffleMode === 'shuffle') {
      return language === 'vi' ? 'Tắt phát ngẫu nhiên' : 'Disable Shuffle';
    }
    const target = contextName || (language === 'vi' ? 'danh sách phát' : 'queue');
    return language === 'vi'
      ? `Bật phát ngẫu nhiên cho ${target}`
      : `Enable Shuffle for ${target}`;
  })();

  const repeatTitle = (() => {
    if (repeatMode === 'track') return language === 'vi' ? 'Lặp một bài' : 'Repeat one';
    if (repeatMode === 'context') return language === 'vi' ? 'Lặp danh sách' : 'Repeat context';
    return language === 'vi' ? 'Bật lặp lại' : 'Enable repeat';
  })();

  const volumeIconName = volume === 0
    ? 'fa-volume-xmark'
    : volume < 35
      ? 'fa-volume-low'
      : 'fa-volume-high';
  const volumeIconColor = volume === 0
    ? 'text-red-500'
    : isLight
      ? 'text-black'
      : 'text-[#FEBC11]';

  return (
    <aside
      className={`fixed bottom-0 left-0 right-0 z-50 select-none transition-colors duration-200 ${
        isLight
          ? 'bg-white border-t-4 border-black text-black shadow-[0_-8px_20px_rgba(0,0,0,0.08)]'
          : 'bg-[#151518] border-t-4 border-[#2A2A34] text-white shadow-[0_-8px_20px_rgba(0,0,0,0.8)]'
      }`}
    >
      <div
        onClick={handleSeekClick}
        className={`w-full h-1.5 cursor-pointer group ${
          isLight ? 'bg-black/10' : 'bg-[#282830]'
        }`}
        title="Nhấp để tua nhạc"
      >
        <div
          className="bg-[#FEBC11] h-full transition-all duration-150 group-hover:brightness-125"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      <div className="px-3 md:px-8 h-16 md:h-20 flex items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2 md:gap-3.5 min-w-0 flex-1 md:flex-none md:w-1/3">
          <div
            id="bar-track-cover"
            onClick={onTogglePlay}
            className="w-10 h-10 md:w-12 md:h-12 aspect-square rounded-none overflow-hidden relative border-2 border-black shadow-brutal shrink-0 group cursor-pointer bg-black select-none"
            title={
              isPlaying
                ? language === 'vi' ? 'Nhấp để tạm dừng' : 'Click to pause'
                : language === 'vi' ? 'Nhấp để phát' : 'Click to play'
            }
          >
            <img
              src={getTrackCover(currentTrack)}
              alt={currentTrack.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />

            {isAudioFeaturesLoading && (
              <div className="absolute inset-0 bg-black/55 flex items-center justify-center pointer-events-none" role="status" aria-label={language === 'vi' ? 'Đang phân tích âm thanh' : 'Analyzing audio'}>
                <i className="fa-solid fa-spinner animate-spin text-[#FEBC11] text-sm"></i>
              </div>
            )}

            {isPlaying ? (
              <div className="absolute bottom-1 right-1 bg-black/85 backdrop-blur-xs px-1 py-0.5 rounded-xs border border-[#FEBC11]/60 flex items-end gap-0.5 h-3.5 pointer-events-none">
                <span className="w-0.5 bg-[#FEBC11] rounded-t animate-equalizer-1 h-full"></span>
                <span className="w-0.5 bg-[#FEBC11] rounded-t animate-equalizer-3 h-full"></span>
                <span className="w-0.5 bg-[#FEBC11] rounded-t animate-equalizer-2 h-full"></span>
                <span className="w-0.5 bg-[#FEBC11] rounded-t animate-equalizer-4 h-full"></span>
              </div>
            ) : null}

            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play pl-0.5'} text-white text-xs`}></i>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenAlbum}
                className={`text-xs md:text-sm font-black truncate text-left cursor-pointer hover:underline max-w-[110px] sm:max-w-none ${
                  isLight ? 'text-black hover:text-amber-800' : 'text-white hover:text-[#FEBC11]'
                }`}
                title={language === 'vi' ? 'Xem album / single' : 'View album / single'}
              >
                {currentTrack.title}
              </button>
              <button
                type="button"
                onClick={onOpenSpotify}
                className="text-[#1DB954] hover:text-[#1ed760] text-xs cursor-pointer p-0.5 transition-colors shrink-0"
                title={language === 'vi' ? 'Mở bài hát trên Spotify' : 'Open song in Spotify'}
              >
                <i className="fa-brands fa-spotify text-sm"></i>
              </button>
            </div>
            {currentTrack.artist && currentTrack.artist.toLowerCase() !== currentTrack.title.toLowerCase() && (
              <button
                type="button"
                onClick={onOpenArtist}
                className={`block text-[10px] md:text-xs font-semibold truncate cursor-pointer text-left hover:underline ${
                  isLight ? 'text-gray-700 hover:text-black' : 'text-gray-400 hover:text-gray-300'
                }`}
                title={language === 'vi' ? 'Xem nghệ sĩ' : 'View artist'}
              >
                {currentTrack.artist}
              </button>
            )}
          </div>

          <button
            id="bar-like-btn"
            type="button"
            onClick={onToggleLike}
            className="text-red-500 hover:scale-110 active:scale-95 transition-transform p-1 cursor-pointer shrink-0"
            title={isLiked ? 'Đã lưu vào danh sách yêu thích' : 'Lưu vào danh sách yêu thích'}
          >
            <i
              className={
                isLiked
                  ? 'fa-solid fa-heart text-base text-red-500'
                  : `fa-regular fa-heart text-base ${isLight ? 'text-gray-600' : 'text-gray-400'} hover:text-red-500`
              }
            ></i>
          </button>
        </div>

        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <button
            type="button"
            onClick={onToggleShuffle}
            className={`hidden sm:inline-flex items-center justify-center relative text-sm font-black transition-colors cursor-pointer ${
              shuffleActive
                ? 'text-[#FEBC11]'
                : isLight
                ? 'text-gray-600 hover:text-black'
                : 'text-gray-400 hover:text-[#FEBC11]'
            }`}
            title={shuffleTitle}
            aria-pressed={shuffleActive}
          >
            <i className="fa-solid fa-shuffle"></i>
            {shuffleMode === 'smart' && (
              <span className="absolute -top-1 -right-1.5 w-1.5 h-1.5 rounded-full bg-[#FEBC11]" aria-hidden />
            )}
          </button>

          <button
            type="button"
            onClick={onPrevTrack}
            className={`text-base transition-colors cursor-pointer ${
              isLight ? 'text-black hover:text-amber-800' : 'text-gray-300 hover:text-[#FEBC11]'
            }`}
            title={language === 'vi' ? 'Bài trước' : 'Previous'}
          >
            <i className="fa-solid fa-backward-step"></i>
          </button>

          <button
            id="bar-play-btn"
            type="button"
            onClick={onTogglePlay}
            className="w-10 h-10 md:w-11 md:h-11 bg-[#FEBC11] hover:bg-yellow-400 text-[#0D0D0E] border-2 border-black shadow-brutal hover:scale-105 active:scale-95 flex items-center justify-center text-sm transition-all cursor-pointer"
            title={isPlaying ? (language === 'vi' ? 'Tạm dừng' : 'Pause') : (language === 'vi' ? 'Phát' : 'Play')}
          >
            <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play ml-0.5'}`} id="bar-play-icon"></i>
          </button>

          <button
            type="button"
            onClick={onNextTrack}
            className={`text-base transition-colors cursor-pointer ${
              isLight ? 'text-black hover:text-amber-800' : 'text-gray-300 hover:text-[#FEBC11]'
            }`}
            title={language === 'vi' ? 'Bài kế tiếp' : 'Next'}
          >
            <i className="fa-solid fa-forward-step"></i>
          </button>

          <button
            type="button"
            onClick={onToggleRepeat}
            className={`hidden sm:inline-flex items-center justify-center relative text-sm transition-colors cursor-pointer ${
              repeatMode !== 'off'
                ? 'text-[#FEBC11]'
                : isLight
                ? 'text-gray-600 hover:text-black'
                : 'text-gray-400 hover:text-[#FEBC11]'
            }`}
            title={repeatTitle}
            aria-pressed={repeatMode !== 'off'}
          >
            <i className="fa-solid fa-repeat"></i>
            {repeatMode === 'track' && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-black leading-none">1</span>
            )}
          </button>
        </div>

        <div className="hidden md:flex items-center justify-end gap-2.5 flex-1 md:w-1/3 relative">
          <span className={`text-[11px] font-mono font-bold whitespace-nowrap ${isLight ? 'text-black' : 'text-gray-300'}`}>
            {formatTime(playbackSec)} / {currentTrack.duration}
          </span>

          <div className="relative" ref={queuePanelRef}>
            <button
              type="button"
              onClick={() => setShowQueue((visible) => !visible)}
              className={`flex items-center gap-2 text-xs font-black px-2.5 py-1 border-2 border-black shadow-brutal cursor-pointer transition-colors ${
                showQueue
                  ? 'bg-[#FEBC11] text-[#0D0D0E]'
                  : isLight
                    ? 'bg-white text-black hover:bg-gray-100'
                    : 'bg-[#202026] hover:bg-[#282830] text-gray-200'
              }`}
              title={language === 'vi' ? 'Hàng đợi' : 'Queue'}
            >
              <i className="fa-solid fa-list"></i>
              <span className="hidden xl:inline text-[11px]">QUEUE {spotifyQueue.length}</span>
            </button>

            {showQueue && (
              <div
                className={`absolute bottom-full right-0 mb-3 w-[min(24rem,calc(100vw-1.5rem))] border-2 border-black shadow-brutal-xl p-3 z-50 ${
                  isLight ? 'bg-white text-black' : 'bg-[#1A1A1E] text-white border-[#FEBC11]'
                }`}
              >
                <div className={`flex items-center justify-between gap-2 px-1 pb-2 mb-3 border-b ${
                  isLight ? 'border-black/20' : 'border-[#2E2E38]'
                }`}>
                  <span className={`text-[10px] font-black uppercase truncate ${
                    isLight ? 'text-black' : 'text-white'
                  }`}>
                    {language === 'vi' ? 'Danh sách chờ' : 'Queue'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQueue(false)}
                    className={`w-6 h-6 border flex items-center justify-center text-[10px] font-black cursor-pointer ${
                      isLight
                        ? 'border-gray-300 bg-white hover:bg-gray-100'
                        : 'border-[#3E3E4C] bg-[#141416] hover:bg-[#FEBC11] hover:text-black'
                    }`}
                    aria-label={language === 'vi' ? 'Đóng hàng đợi' : 'Close queue'}
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-4">
                  <div className={`text-[10px] font-black uppercase px-1 mb-2 ${
                    isLight ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {language === 'vi' ? 'Đang phát' : 'Now playing'}
                  </div>
                  <div className={`w-full p-3 border-2 flex items-center justify-between gap-3 shadow-brutal ${
                    isLight
                      ? 'bg-[#FFFDF0] border-[#FEBC11]'
                      : 'bg-[#26241B] border-[#FEBC11]'
                  }`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={getTrackCover(currentTrack)}
                        alt=""
                        className="w-10 h-10 object-cover border border-black shadow-sm shrink-0"
                      />
                      <div className="min-w-0">
                        <strong className="block text-xs font-black truncate text-[#FEBC11]">
                          {currentTrack.title}
                        </strong>
                        <span className={`block text-[11px] truncate ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                          {currentTrack.artist}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onTogglePlay}
                      className="w-7 h-7 flex items-center justify-center border text-xs shadow-brutal bg-[#FEBC11] text-[#0D0D0E] border-black cursor-pointer"
                      title={isPlaying
                        ? (language === 'vi' ? 'Tạm dừng' : 'Pause')
                        : (language === 'vi' ? 'Phát' : 'Play')}
                    >
                      <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play ml-0.5'}`} />
                    </button>
                  </div>
                </div>

                <div className={`text-[10px] font-black uppercase px-1 pb-2 mb-2 border-b truncate ${
                  isLight ? 'border-black/20 text-black' : 'text-[#FEBC11] border-[#2E2E38]'
                }`}>
                  {language === 'vi'
                    ? `Nội dung tiếp theo từ ${contextName || 'hàng đợi'}`
                    : `Next from: ${contextName || 'queue'}`}
                </div>

                <div className={`flex items-center justify-between text-[11px] font-black uppercase px-3 pb-1 border-b ${
                  isLight ? 'text-gray-500 border-gray-200' : 'text-gray-400 border-[#2A2A34]'
                }`}>
                  <span>{language === 'vi' ? 'BÀI HÁT' : 'TRACK'}</span>
                  <span>{language === 'vi' ? 'PHÁT' : 'PLAY'}</span>
                </div>

                {spotifyQueue.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto space-y-2 mt-2 pr-0.5">
                    {spotifyQueue.slice(0, 12).map((track, index) => (
                      <button
                        type="button"
                        key={`${track.spotifyId || track.id}-${index}`}
                        onClick={() => onPlayQueueTrack?.(track)}
                        className={`w-full p-3 border-2 flex items-center justify-between gap-3 shadow-brutal transition-all text-left cursor-pointer group ${
                          isLight
                            ? 'bg-[#F9FAFB] border-gray-300 hover:border-[#FEBC11]/80 hover:bg-gray-100'
                            : 'bg-[#1E1E24] border-[#2E2E38] hover:border-[#FEBC11]/80 hover:bg-[#24242C]'
                        }`}
                      >
                        <span className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={getTrackCover(track)}
                            alt=""
                            className="w-10 h-10 object-cover border border-black shadow-sm shrink-0"
                          />
                          <span className="min-w-0">
                            <strong className={`block text-xs font-black truncate group-hover:text-[#FEBC11] ${
                              isLight ? 'text-black' : 'text-white'
                            }`}>{track.title}</strong>
                            <span className={`block text-[11px] truncate ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                              {track.artist}
                            </span>
                          </span>
                        </span>
                        <span className={`w-7 h-7 flex items-center justify-center border text-xs shadow-brutal shrink-0 ${
                          isLight
                            ? 'bg-white text-gray-600 border-gray-300 group-hover:bg-[#FEBC11] group-hover:text-black'
                            : 'bg-[#141416] text-gray-300 border-[#363644] group-hover:bg-[#FEBC11] group-hover:text-black'
                        }`}>
                          <i className="fa-solid fa-play ml-0.5" />
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={`px-2 py-4 text-xs font-bold ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    {language === 'vi' ? 'Spotify không có bài tiếp theo.' : 'Spotify has no upcoming tracks.'}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenSpotify}
            className="inline-flex items-center gap-1.5 text-xs font-black bg-[#FEBC11] text-[#0D0D0E] border-2 border-black px-2.5 py-1 shadow-brutal hover:bg-yellow-400 transition-colors cursor-pointer"
            title={language === 'vi' ? 'Mở bài đang phát trên Spotify' : 'Open currently playing track on Spotify'}
          >
            <i className="fa-brands fa-spotify text-sm"></i>
            <span>SPOTIFY</span>
          </button>

          <div className="flex items-center gap-2 w-28">
            <button
              type="button"
              onClick={onMuteToggle}
              className={`text-xs cursor-pointer hover:brightness-125 ${volumeIconColor}`}
              title={volume === 0
                ? (language === 'vi' ? 'Bật âm thanh' : 'Unmute')
                : (language === 'vi' ? 'Tắt tiếng' : 'Mute')}
              aria-label={volume === 0 ? 'Unmute' : 'Mute'}
            >
              <i className={`fa-solid ${volumeIconName}`}></i>
            </button>
            <div
              role="slider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={volume}
              aria-label={language === 'vi' ? 'Âm lượng' : 'Volume'}
              tabIndex={0}
              onPointerDown={handleVolumePointerDown}
              onPointerMove={handleVolumePointerMove}
              onPointerUp={handleVolumePointerUp}
              onPointerCancel={handleVolumePointerUp}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  onChangeVolume(Math.min(100, volume + 5));
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  onChangeVolume(Math.max(0, volume - 5));
                }
              }}
              className={`w-full h-2 overflow-hidden cursor-pointer group border touch-none ${
                isLight ? 'bg-black/10 border-black/30' : 'bg-[#282830] border-[#3C3C48]'
              }`}
              title={`${language === 'vi' ? 'Âm lượng' : 'Volume'}: ${volume}%`}
            >
              <div
                className="bg-[#FEBC11] h-full transition-[width] duration-75 group-hover:brightness-125 pointer-events-none"
                style={{ width: `${volume}%` }}
              ></div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSpotify}
          className="md:hidden flex items-center justify-center w-8 h-8 text-[#1DB954] border-2 border-black bg-[#0D0D0E] shadow-brutal shrink-0 cursor-pointer"
          title={language === 'vi' ? 'Mở Spotify' : 'Open Spotify'}
        >
          <i className="fa-brands fa-spotify text-base"></i>
        </button>
      </div>
    </aside>
  );
};
