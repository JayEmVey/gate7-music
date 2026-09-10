import React, { useState } from 'react';
import { Track, SpeakerZone, Language } from '../types';
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
  isShuffle: boolean;
  onToggleShuffle: () => void;
  isRepeat: boolean;
  onToggleRepeat: () => void;
  speakerZone: SpeakerZone;
  onSelectSpeakerZone: (zone: SpeakerZone) => void;
  volume: number;
  onChangeVolume: (vol: number) => void;
  onOpenTrackDetail: () => void;
  onOpenSpotify?: () => void;
  spotifyQueue: Track[];
  language: Language;
  theme?: 'dark' | 'light';
  isAudioFeaturesLoading?: boolean;
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
  isShuffle,
  onToggleShuffle,
  isRepeat,
  onToggleRepeat,
  speakerZone,
  onSelectSpeakerZone,
  volume,
  onChangeVolume,
  onOpenTrackDetail,
  onOpenSpotify,
  spotifyQueue,
  language,
  theme = 'dark',
  isAudioFeaturesLoading = false,
}) => {
  const [showSpeakerMenu, setShowSpeakerMenu] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const isLight = theme === 'light';

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, (playbackSec / currentTrack.durationSec) * 100);

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(Math.floor(ratio * currentTrack.durationSec));
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onChangeVolume(Math.round(ratio * 100));
  };

  const speakerLabels: Record<SpeakerZone, string> = {
    main: 'Gate 7 Main Loa',
    floor2: 'Loa Không Gian Tầng 2',
    bar: 'Quầy Bar Roastery Loa',
    garden: 'Loa Sân Vườn Ngoài Trời',
  };

  return (
    <aside
      className={`fixed bottom-0 left-0 right-0 z-50 select-none transition-colors duration-200 ${
        isLight
          ? 'bg-white border-t-4 border-black text-black shadow-[0_-8px_20px_rgba(0,0,0,0.08)]'
          : 'bg-[#151518] border-t-4 border-[#2A2A34] text-white shadow-[0_-8px_20px_rgba(0,0,0,0.8)]'
      }`}
    >
      {/* Scrubber bar — full width at top on all screens */}
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

      {/* Main player row */}
      <div className="px-3 md:px-8 h-16 md:h-20 flex items-center justify-between gap-2 md:gap-4">
        {/* LEFT: Track info */}
        <div className="flex items-center gap-2 md:gap-3.5 min-w-0 flex-1 md:flex-none md:w-1/3">
          {/* Thumbnail */}
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

            {/* Playing Animation: Animated Equalizer overlay on thumbnail */}
            {isPlaying ? (
              <div className="absolute bottom-1 right-1 bg-black/85 backdrop-blur-xs px-1 py-0.5 rounded-xs border border-[#FEBC11]/60 flex items-end gap-0.5 h-3.5 pointer-events-none">
                <span className="w-0.5 bg-[#FEBC11] rounded-t animate-equalizer-1 h-full"></span>
                <span className="w-0.5 bg-[#FEBC11] rounded-t animate-equalizer-3 h-full"></span>
                <span className="w-0.5 bg-[#FEBC11] rounded-t animate-equalizer-2 h-full"></span>
                <span className="w-0.5 bg-[#FEBC11] rounded-t animate-equalizer-4 h-full"></span>
              </div>
            ) : null}

            {/* Hover Play/Pause Overlay Icon */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play pl-0.5'} text-white text-xs`}></i>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenTrackDetail}
                className={`text-xs md:text-sm font-black truncate text-left cursor-pointer hover:underline max-w-[110px] sm:max-w-none ${
                  isLight ? 'text-black hover:text-amber-800' : 'text-white hover:text-[#FEBC11]'
                }`}
              >
                {currentTrack.title}
              </button>
              <button
                onClick={onOpenSpotify}
                className="text-[#1DB954] hover:text-[#1ed760] text-xs cursor-pointer p-0.5 transition-colors shrink-0"
                title={language === 'vi' ? 'Mở bài hát trên Spotify' : 'Open song in Spotify'}
              >
                <i className="fa-brands fa-spotify text-sm"></i>
              </button>
            </div>
            {currentTrack.artist && currentTrack.artist.toLowerCase() !== currentTrack.title.toLowerCase() && (
              <p
                onClick={onOpenTrackDetail}
                className={`text-[10px] md:text-xs font-semibold truncate cursor-pointer ${
                  isLight ? 'text-gray-700 hover:text-black' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {currentTrack.artist}
              </p>
            )}
          </div>

          <button
            id="bar-like-btn"
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

        {/* CENTER: Player controls (always visible) */}
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <button
            onClick={onToggleShuffle}
            className={`hidden sm:block text-sm font-black transition-colors cursor-pointer ${
              isShuffle
                ? 'text-[#FEBC11]'
                : isLight
                ? 'text-gray-600 hover:text-black'
                : 'text-gray-400 hover:text-[#FEBC11]'
            }`}
            title="Trộn bài ngẫu nhiên"
          >
            <i className="fa-solid fa-shuffle"></i>
          </button>

          <button
            onClick={onPrevTrack}
            className={`text-base transition-colors cursor-pointer ${
              isLight ? 'text-black hover:text-amber-800' : 'text-gray-300 hover:text-[#FEBC11]'
            }`}
            title="Bài trước"
          >
            <i className="fa-solid fa-backward-step"></i>
          </button>

          <button
            id="bar-play-btn"
            onClick={onTogglePlay}
            className="w-10 h-10 md:w-11 md:h-11 bg-[#FEBC11] hover:bg-yellow-400 text-[#0D0D0E] border-2 border-black shadow-brutal hover:scale-105 active:scale-95 flex items-center justify-center text-sm transition-all cursor-pointer"
            title={isPlaying ? 'Tạm dừng' : 'Phát'}
          >
            <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play ml-0.5'}`} id="bar-play-icon"></i>
          </button>

          <button
            onClick={onNextTrack}
            className={`text-base transition-colors cursor-pointer ${
              isLight ? 'text-black hover:text-amber-800' : 'text-gray-300 hover:text-[#FEBC11]'
            }`}
            title="Bài kế tiếp"
          >
            <i className="fa-solid fa-forward-step"></i>
          </button>

          <button
            onClick={onToggleRepeat}
            className={`hidden sm:block text-sm transition-colors cursor-pointer ${
              isRepeat
                ? 'text-[#FEBC11]'
                : isLight
                ? 'text-gray-600 hover:text-black'
                : 'text-gray-400 hover:text-[#FEBC11]'
            }`}
            title="Lặp lại danh sách"
          >
            <i className="fa-solid fa-repeat"></i>
          </button>
        </div>

        {/* RIGHT: Volume & extras — desktop only details */}
        <div className="hidden md:flex items-center justify-end gap-2.5 flex-1 md:w-1/3 relative">
          {/* Time display */}
          <span className={`text-[11px] font-mono font-bold whitespace-nowrap ${isLight ? 'text-black' : 'text-gray-300'}`}>
            {formatTime(playbackSec)} / {currentTrack.duration}
          </span>

          <div className="relative">
            <button
              onClick={() => setShowQueue((visible) => !visible)}
              className={`flex items-center gap-2 text-xs font-black px-2.5 py-1 border-2 border-black shadow-brutal cursor-pointer transition-colors ${
                isLight ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#202026] hover:bg-[#282830] text-gray-200'
              }`}
              title={language === 'vi' ? 'Hàng đợi Spotify' : 'Spotify queue'}
            >
              <i className="fa-solid fa-list"></i>
              <span className="hidden xl:inline text-[11px]">QUEUE {spotifyQueue.length}</span>
            </button>

            {showQueue && (
              <div
                className={`absolute bottom-full right-0 mb-3 w-72 border-2 border-black shadow-brutal-xl p-2 z-50 ${
                  isLight ? 'bg-white text-black' : 'bg-[#1A1A1E] text-white border-[#FEBC11]'
                }`}
              >
                <div className={`text-[10px] font-black uppercase px-2 py-1 border-b ${isLight ? 'border-black/20' : 'text-[#FEBC11] border-[#2E2E38]'}`}>
                  {language === 'vi' ? 'HÀNG ĐỢI SPOTIFY' : 'SPOTIFY QUEUE'}
                </div>
                {spotifyQueue.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    {spotifyQueue.slice(0, 12).map((track, index) => (
                      <div key={`${track.spotifyId || track.id}-${index}`} className="flex items-center gap-2 px-2 py-1.5 border-b border-black/10 last:border-0">
                        <span className="text-[10px] font-black text-[#FEBC11] w-4">{index + 1}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{track.title}</div>
                          <div className={`text-[10px] truncate ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{track.artist}</div>
                        </div>
                      </div>
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
            onClick={onOpenSpotify}
            className="inline-flex items-center gap-1.5 text-xs font-black bg-[#FEBC11] text-[#0D0D0E] border-2 border-black px-2.5 py-1 shadow-brutal hover:bg-yellow-400 transition-colors cursor-pointer"
            title={language === 'vi' ? 'Mở bài đang phát trên Spotify' : 'Open currently playing track on Spotify'}
          >
            <i className="fa-brands fa-spotify text-sm"></i>
            <span>SPOTIFY</span>
          </button>

          {/* Speaker Zone Selector */}
          <div className="relative">
            <button
              onClick={() => setShowSpeakerMenu(!showSpeakerMenu)}
              className={`flex items-center gap-2 text-xs font-black px-2.5 py-1 border-2 border-black shadow-brutal cursor-pointer transition-colors ${
                isLight ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#202026] hover:bg-[#282830] text-gray-200'
              }`}
              title="Chọn khu vực phát loa tại quán"
            >
              <i className="fa-solid fa-computer text-[#1DB954]"></i>
              <span className="hidden xl:inline text-[11px]">
                {speakerLabels[speakerZone]}
              </span>
            </button>

            {showSpeakerMenu && (
              <div
                className={`absolute bottom-full right-0 mb-3 w-56 border-2 border-black shadow-brutal-xl p-2 z-50 space-y-1 ${
                  isLight ? 'bg-white text-black' : 'bg-[#1A1A1E] text-white border-[#FEBC11]'
                }`}
              >
                <div
                  className={`text-[10px] font-black uppercase px-2 py-1 border-b ${
                    isLight ? 'text-black border-black/20' : 'text-[#FEBC11] border-[#2E2E38]'
                  }`}
                >
                  {language === 'vi' ? 'HỆ THỐNG LOA TOÀN QUÁN' : 'ROASTERY SOUND ZONES'}
                </div>
                {(['main', 'floor2', 'bar', 'garden'] as SpeakerZone[]).map((zone) => (
                  <button
                    key={zone}
                    onClick={() => {
                      onSelectSpeakerZone(zone);
                      setShowSpeakerMenu(false);
                    }}
                    className={`w-full text-left text-xs px-2.5 py-1.5 font-bold flex items-center justify-between transition-colors ${
                      speakerZone === zone
                        ? 'bg-[#FEBC11] text-[#0D0D0E]'
                        : isLight
                        ? 'text-black hover:bg-gray-100'
                        : 'text-gray-200 hover:bg-[#25252C]'
                    }`}
                  >
                    <span>{speakerLabels[zone]}</span>
                    {speakerZone === zone && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Volume Bar */}
          <div className="flex items-center gap-2 w-24">
            <i
              onClick={() => onChangeVolume(volume > 0 ? 0 : 80)}
              className={`fa-solid ${
                volume === 0 ? 'fa-volume-xmark text-red-500' : isLight ? 'fa-volume-high text-black' : 'fa-volume-high text-gray-300'
              } text-xs cursor-pointer hover:text-[#FEBC11]`}
              title={volume === 0 ? 'Bật âm thanh' : 'Tắt tiếng'}
            ></i>
            <div
              onClick={handleVolumeClick}
              className={`w-full h-2 overflow-hidden cursor-pointer group border ${
                isLight ? 'bg-black/10 border-black/30' : 'bg-[#282830] border-[#3C3C48]'
              }`}
              title={`Âm lượng: ${volume}%`}
            >
              <div
                className="bg-[#FEBC11] h-full transition-all group-hover:brightness-125"
                style={{ width: `${volume}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Mobile-only: Spotify button */}
        <button
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

