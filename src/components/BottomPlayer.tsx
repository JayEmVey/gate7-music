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
  onOpenSpotifySync: () => void;
  language: Language;
  theme?: 'dark' | 'light';
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
  onOpenSpotifySync,
  language,
  theme = 'dark',
}) => {
  const [showSpeakerMenu, setShowSpeakerMenu] = useState(false);
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
      className={`fixed bottom-0 left-0 right-0 h-24 px-4 md:px-8 flex items-center justify-between z-50 select-none transition-colors duration-200 ${
        isLight
          ? 'bg-white border-t-4 border-black text-black shadow-[0_-8px_20px_rgba(0,0,0,0.08)]'
          : 'bg-[#151518] border-t-4 border-[#2A2A34] text-white shadow-[0_-8px_20px_rgba(0,0,0,0.8)]'
      }`}
    >
      {/* LEFT: Currently Playing Song Info */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-[200px]">
        {/* Spotify Song Thumbnail Framed in Square Box + Playing Animation */}
        <div
          id="bar-track-cover"
          onClick={onTogglePlay}
          className="w-12 h-12 md:w-14 md:h-14 aspect-square rounded-none overflow-hidden relative border-2 border-black shadow-brutal shrink-0 group cursor-pointer bg-black select-none"
          title={
            isPlaying
              ? language === 'vi'
                ? 'Nhấp để tạm dừng'
                : 'Click to pause'
              : language === 'vi'
              ? 'Nhấp để phát'
              : 'Click to play'
          }
        >
          <img
            src={getTrackCover(currentTrack)}
            alt={currentTrack.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />

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
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenTrackDetail}
              className={`text-sm font-black truncate text-left cursor-pointer hover:underline ${
                isLight ? 'text-black hover:text-amber-800' : 'text-white hover:text-[#FEBC11]'
              }`}
            >
              {currentTrack.title}
            </button>
            <span
              onClick={onOpenSpotifySync}
              className="text-[#1DB954] text-xs cursor-pointer"
              title="Đang đồng bộ từ Spotify"
            >
              <i className="fa-brands fa-spotify"></i>
            </span>
          </div>
          <p
            onClick={onOpenTrackDetail}
            className={`text-xs font-semibold truncate cursor-pointer ${
              isLight ? 'text-gray-700 hover:text-black' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {currentTrack.artist} • Gate 7 Soundstage
          </p>
        </div>

        <button
          id="bar-like-btn"
          onClick={onToggleLike}
          className="text-red-500 hover:scale-110 active:scale-95 transition-transform p-1 cursor-pointer"
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

      {/* CENTER: Player Controls & Interactive Scrubber */}
      <div className="flex flex-col items-center gap-1.5 max-w-xl w-2/4 px-4">
        <div className="flex items-center gap-4 md:gap-6">
          <button
            onClick={onToggleShuffle}
            className={`text-sm font-black transition-colors cursor-pointer ${
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
            className="w-11 h-11 bg-[#FEBC11] hover:bg-yellow-400 text-[#0D0D0E] border-2 border-black shadow-brutal hover:scale-105 active:scale-95 flex items-center justify-center text-sm transition-all cursor-pointer"
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
            className={`text-sm transition-colors cursor-pointer ${
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

        {/* Scrubber Seek Bar */}
        <div className="w-full flex items-center gap-3 max-w-md">
          <span className={`text-[11px] font-mono font-bold ${isLight ? 'text-black' : 'text-gray-300'}`}>
            {formatTime(playbackSec)}
          </span>
          <div
            onClick={handleSeekClick}
            className="relative flex-1 cursor-pointer py-1 group"
            title="Nhấp để tua nhạc"
          >
            <div
              className={`w-full h-2 overflow-hidden rounded-xs border ${
                isLight ? 'bg-black/10 border-black/30' : 'bg-[#282830] border-[#3C3C48]'
              }`}
            >
              <div
                className="bg-[#FEBC11] h-full transition-all duration-150 group-hover:brightness-125"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
          <span className={`text-[11px] font-mono font-bold ${isLight ? 'text-black' : 'text-gray-400'}`}>
            {currentTrack.duration}
          </span>
        </div>
      </div>

      {/* RIGHT: Volume, Lossless & Speaker Sync */}
      <div className="flex items-center justify-end gap-3.5 w-1/4 min-w-[200px] relative">
        <button
          onClick={onOpenSpotifySync}
          className="hidden sm:inline-flex text-xs font-black bg-[#FEBC11] text-[#0D0D0E] border-2 border-black px-2.5 py-1 shadow-brutal hover:bg-yellow-400 transition-colors cursor-pointer"
          title="Lossless Hi-Fi Audio & Soundstage Settings"
        >
          HI-FI 72dB
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
        <div className="hidden md:flex items-center gap-2 w-24">
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
    </aside>
  );
};

