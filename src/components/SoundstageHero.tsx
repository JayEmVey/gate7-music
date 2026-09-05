import React from 'react';
import { Track, TrackAudioFeatures, Language } from '../types';
import { SonicPairingG7Icon } from './SonicPairingG7Icon';
import { getTrackCover } from '../data';
import { getCoffeePairing } from '../utils/pairing';

interface SoundstageHeroProps {
  currentTrack: Track;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSec: number;
  onSeek: (sec: number) => void;
  onPairingClick: () => void;
  onSpotifyClick: () => void;
  onSyncDesktop?: () => void;
  spotifyDesktopStatus?: string;
  spotifySource?: 'desktop' | 'web';
  language: Language;
  theme?: 'dark' | 'light';
}

export const SoundstageHero: React.FC<SoundstageHeroProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  playbackSec,
  onSeek,
  onPairingClick,
  onSpotifyClick,
  onSyncDesktop,
  spotifyDesktopStatus,
  spotifySource = 'desktop',
  language,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [dateTimeStr, setDateTimeStr] = React.useState<string>('');
  const audioFeatures = currentTrack.audioFeatures;

  const keyNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const keyLabel = (features: TrackAudioFeatures) => {
    if (features.key < 0 || features.key > 11 || features.mode < 0) return 'Key unknown';
    return `${keyNames[features.key]} ${features.mode === 1 ? 'Major' : 'Minor'}`;
  };

  const moodLabel = (features: TrackAudioFeatures) => {
    if (features.valence >= 0.7) return language === 'vi' ? 'Hưng phấn' : 'Euphoric';
    if (features.valence <= 0.3) return language === 'vi' ? 'Trầm buồn' : 'Melancholy';
    return language === 'vi' ? 'Cân bằng' : 'Balanced Mood';
  };

  const coffeePairing = getCoffeePairing(audioFeatures, 'Drip Drop Coffee', language);

  React.useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      };
      setDateTimeStr(
        language === 'vi'
          ? now.toLocaleString('vi-VN', options)
          : now.toLocaleString('en-US', options)
      );
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, [language]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const subtitleText = (() => {
    const title = currentTrack.title?.trim() || '';
    const artist = currentTrack.artist?.trim() || '';
    const album = currentTrack.album?.trim() || '';

    const normalizedTitle = title.toLowerCase();
    const normalizedArtist = artist.toLowerCase();
    const normalizedAlbum = album.toLowerCase();

    const cleanArtist = artist && normalizedArtist !== normalizedTitle ? artist : '';
    const cleanAlbum = album && normalizedAlbum !== normalizedTitle ? album : '';

    if (!cleanArtist && !cleanAlbum) return '';
    if (cleanArtist && cleanAlbum) return `${cleanArtist} • ${cleanAlbum}`;
    return cleanArtist || cleanAlbum;
  })();

  const progressPercent = Math.min(100, (playbackSec / currentTrack.durationSec) * 100);
  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(Math.floor(ratio * currentTrack.durationSec));
  };

  return (
    <section
      id="soundstage-hero-banner"
      aria-label="Đang phát tại quán"
      className={`relative overflow-hidden p-6 lg:p-8 transition-colors duration-200 ${
        isLight
          ? 'bg-white border-3 border-black shadow-[6px_6px_0px_#000000] text-black'
          : 'bg-[#18181C] border-4 border-[#2A2A34] shadow-brutal-xl text-white'
      }`}
    >
      {/* Atmospheric Glow in Background */}
      {isLight ? (
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-[#FEBC11]/15 rounded-full blur-3xl pointer-events-none"></div>
      ) : (
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-[#FEBC11]/10 rounded-full blur-3xl pointer-events-none"></div>
      )}

      {/* Top Badges / High-Energy Live Tag */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 relative z-10">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FEBC11] text-[#0D0D0E] text-xs font-black uppercase tracking-wider border-2 border-black shadow-brutal sticker-rotate-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
            <i className="fa-solid fa-broadcast-tower"></i>
            {language === 'vi' ? 'ON AIR: ĐANG PHÁT TẠI QUÁN' : 'ON AIR: LIVE IN STORE'}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border-2 border-black shadow-brutal ${
              isLight ? 'bg-white text-black' : 'bg-[#202026] text-gray-200 border-[#33333E]'
            }`}
          >
            <i className="fa-solid fa-location-dot text-[#FEBC11]"></i>
            Gate 7 Coffee Roastery • 162A Nguyễn Trường Tộ
          </span>
          {dateTimeStr && (
            <span
              id="datetime"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold border-2 border-black shadow-brutal ${
                isLight ? 'bg-[#F9FAFB] text-gray-800' : 'bg-[#1C1C22] text-[#FEBC11] border-[#363644]'
              }`}
            >
              <i className="fa-regular fa-clock"></i>
              {dateTimeStr}
            </span>
          )}
        </div>
      </div>

      {/* Core Track Stage Info */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left: Spotify Song Thumbnail in Square Box + Playing Animation */}
        <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
          {/* Framed Square Song Thumbnail with Playing Animation */}
          <div className="relative shrink-0 group">
            <div
              id="hero-track-cover"
              onClick={onTogglePlay}
              className={`w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 aspect-square rounded-none border-4 border-black shadow-brutal-xl relative overflow-hidden bg-black cursor-pointer select-none transition-transform duration-300 group-hover:-translate-y-1 ${
                isPlaying ? 'ring-2 ring-[#FEBC11]' : ''
              }`}
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
              {/* Spotify Song Thumbnail Image */}
              <img
                src={getTrackCover(currentTrack)}
                alt={currentTrack.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isPlaying ? 'scale-[1.03]' : 'scale-100'
                } group-hover:scale-105`}
              />

              {/* Gradient Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none"></div>

              {/* Hover Play/Pause Interactive Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                <div className="w-14 h-14 rounded-full bg-[#FEBC11] border-2 border-black shadow-brutal flex items-center justify-center text-black hover:scale-110 transition-transform">
                  <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play pl-0.5'} text-lg`}></i>
                </div>
              </div>

              {/* Sound Frequency Visualizer Strip at bottom of cover */}
              {isPlaying && (
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 flex items-end gap-0.5 px-1 py-0.5 pointer-events-none z-10">
                  <div className="h-full flex-1 bg-[#FEBC11] animate-pulse"></div>
                  <div className="h-2/3 flex-1 bg-emerald-400 animate-pulse delay-75"></div>
                  <div className="h-full flex-1 bg-[#FEBC11] animate-pulse delay-150"></div>
                  <div className="h-3/4 flex-1 bg-amber-400 animate-pulse delay-100"></div>
                  <div className="h-full flex-1 bg-[#FEBC11] animate-pulse delay-200"></div>
                </div>
              )}
            </div>

            {/* Live Playing Animation Equalizer Sticker / Badge */}
            <div
              className={`absolute -bottom-2.5 -right-2 bg-[#0D0D0E] text-[#FEBC11] border-2 border-black px-3 py-1.5 flex items-end gap-1.5 h-8 shadow-brutal sticker-rotate-2 z-30 transition-all ${
                isPlaying ? 'scale-100' : 'opacity-90'
              }`}
            >
              <div className="flex items-center gap-1.5 mr-1 select-none">
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-600 animate-ping' : 'bg-gray-500'}`}></span>
                <span className="text-[10px] font-black uppercase tracking-wider text-white">
                  {isPlaying
                    ? language === 'vi'
                      ? 'ĐANG PHÁT'
                      : 'NOW PLAYING'
                    : language === 'vi'
                    ? 'TẠM DỪNG'
                    : 'PAUSED'}
                </span>
              </div>
              <span className={`w-1 bg-[#FEBC11] rounded-t ${isPlaying ? 'animate-equalizer-1 h-full' : 'h-2'}`}></span>
              <span className={`w-1 bg-[#FEBC11] rounded-t ${isPlaying ? 'animate-equalizer-2 h-full' : 'h-3'}`}></span>
              <span className={`w-1 bg-[#FEBC11] rounded-t ${isPlaying ? 'animate-equalizer-3 h-full' : 'h-1.5'}`}></span>
              <span className={`w-1 bg-[#FEBC11] rounded-t ${isPlaying ? 'animate-equalizer-4 h-full' : 'h-4'}`}></span>
              <span className={`w-1 bg-[#FEBC11] rounded-t ${isPlaying ? 'animate-equalizer-5 h-full' : 'h-2.5'}`}></span>
            </div>
          </div>

          {/* Track Typography & Highlights */}
          <div className="text-center sm:text-left space-y-2.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span
                className={`text-[11px] font-black uppercase px-2.5 py-0.5 tracking-wider ${
                  isLight
                    ? 'bg-black text-white'
                    : 'bg-[#24242C] text-[#FEBC11] border border-[#FEBC11]/40'
                }`}
              >
                {language === 'vi' ? 'KHUNG GIỜ VÀNG 9 AM – 11 AM' : 'GOLDEN HOUR 9 AM – 11 AM'}
              </span>

              {/* Spotify Playback Source Badge */}
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider border border-black shadow-brutal bg-[#1DB954] text-black"
                title={spotifySource === 'web' ? 'Bài đang phát từ Spotify Web' : 'Bài đang phát từ Spotify Desktop'}
              >
                <i className="fa-brands fa-spotify text-xs"></i>
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></span>
                <span>{spotifySource === 'web' ? 'SPOTIFY WEB' : 'SPOTIFY DESKTOP'}</span>
              </span>

              {typeof audioFeatures?.loudness === 'number' && (
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider border border-black shadow-brutal bg-[#FEBC11] text-black"
                  title={language === 'vi' ? `Độ lớn ước tính: ${audioFeatures.loudness.toFixed(1)} dB` : `Estimated loudness: ${audioFeatures.loudness.toFixed(1)} dB`}
                >
                  <i className="fa-solid fa-volume-high text-[10px]"></i>
                  <span>{audioFeatures.loudness.toFixed(1)} dB</span>
                </span>
              )}

              {spotifyDesktopStatus && (
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 border border-black ${isLight ? 'bg-gray-100 text-gray-800' : 'bg-[#1F1F26] text-emerald-400 border-emerald-500/30'}`}>
                  {spotifyDesktopStatus}
                </span>
              )}
            </div>

            <h1
              className={`text-3xl md:text-5xl font-black tracking-tight uppercase leading-none ${
                isLight ? 'text-black' : 'text-white'
              }`}
            >
              {currentTrack.title}
            </h1>

            {subtitleText && (
              <p className={`text-base md:text-lg font-bold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                {subtitleText}
              </p>
            )}

            {/* Audio DNA Badges & Coffee Pairing */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              {audioFeatures && (
                <>
                  <span className="inline-flex items-center gap-1.5 text-xs font-black border-2 border-black px-3 py-1 shadow-brutal bg-[#FEBC11] text-[#0D0D0E]" title={currentTrack.audioFeaturesSource === 'estimated' ? 'Estimated until RapidAPI audio analysis is available' : 'RapidAPI tempo, key and mode'}>
                    <i className="fa-solid fa-music"></i>
                    {Math.round(audioFeatures.tempo)} BPM • {keyLabel(audioFeatures)}{currentTrack.audioFeaturesSource === 'estimated' ? ' ~' : ''}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-black border-2 border-black px-3 py-1 shadow-brutal bg-emerald-300 text-black">
                    <i className="fa-solid fa-face-smile"></i>
                    {moodLabel(audioFeatures)}
                  </span>
                  {audioFeatures.danceability >= 0.7 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-black border-2 border-black px-3 py-1 shadow-brutal bg-cyan-300 text-black">
                      <i className="fa-solid fa-person-running"></i>
                      {language === 'vi' ? 'Groove cao' : 'High Groove Factor'}
                    </span>
                  )}
                  {audioFeatures.liveness > 0.8 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-black border-2 border-black px-3 py-1 shadow-brutal bg-rose-300 text-black">
                      <i className="fa-solid fa-microphone-lines"></i>
                      {language === 'vi' ? 'Cảm giác Live Session' : 'Live Session Feel'}
                    </span>
                  )}
                </>
              )}

              {!audioFeatures && (
                <span className="inline-flex items-center gap-1.5 text-xs font-black border-2 border-black px-3 py-1 shadow-brutal bg-[#2A2A30] text-gray-300" title={language === 'vi' ? 'Spotify không cung cấp Audio Features cho bài này' : 'Spotify did not provide Audio Features for this track'}>
                  <i className="fa-solid fa-circle-info"></i>
                  {language === 'vi' ? 'Chưa có dữ liệu âm thanh' : 'Audio features unavailable'}
                </span>
              )}

              <button
                id="hero-pairing-btn"
                onClick={onPairingClick}
                className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 border-2 border-black shadow-brutal transition-all cursor-pointer ${
                  isLight
                    ? 'bg-white text-black hover:bg-[#FFFBEB]'
                    : 'bg-[#FEBC11]/20 hover:bg-[#FEBC11]/30 text-[#FEBC11] border-[#FEBC11]/50'
                }`}
                title="Nhấp để xem ghi chú hương vị cà phê và âm nhạc"
              >
                <i className="fa-solid fa-mug-hot text-[#FEBC11]"></i>{' '}
                {language === 'vi' ? 'Hợp nhất với:' : 'Best with:'} {coffeePairing}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Action Controls + Progress Bar */}
        <div className="flex flex-col items-center lg:items-end gap-3.5 w-full lg:w-80 shrink-0">
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5">
            {/* Toggle Vinyl Play/Pause Button */}
            <button
              id="hero-play-btn"
              aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
              onClick={onTogglePlay}
              className="w-14 h-14 bg-[#FEBC11] hover:bg-yellow-400 text-[#0D0D0E] border-3 border-black shadow-brutal-lg hover:scale-105 active:scale-95 flex items-center justify-center text-2xl transition-all cursor-pointer"
            >
              <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play ml-1'}`} id="hero-play-icon"></i>
            </button>

            {/* Sync Desktop Button */}
            {onSyncDesktop && (
              <button
                id="hero-spotify-sync-btn"
                onClick={onSyncDesktop}
                className="px-3.5 py-3.5 bg-[#FEBC11] hover:bg-yellow-400 text-[#0D0D0E] text-xs font-black border-2 border-black shadow-brutal hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 uppercase tracking-wider cursor-pointer"
                title={language === 'vi' ? 'Đồng bộ bài hát đang phát trên Spotify Desktop' : 'Sync playing track from Spotify Desktop'}
              >
                <i className="fa-solid fa-arrows-rotate"></i>
                <span className="hidden sm:inline">{language === 'vi' ? 'Đồng bộ' : 'Sync'}</span>
              </button>
            )}

            <button
              id="hero-spotify-open-btn"
              onClick={onSpotifyClick}
              className="px-4 py-3.5 bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-black border-2 border-black shadow-brutal hover:scale-105 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-wider cursor-pointer"
            >
              <i className="fa-brands fa-spotify text-base"></i>
              <span>{language === 'vi' ? 'Mở Spotify' : 'Open Spotify'}</span>
            </button>
          </div>

          {/* High-Contrast Progress Bar */}
          <div className="w-full space-y-1.5 pt-2">
            <div
              onClick={handleBarClick}
              className={`w-full h-3.5 p-0.5 border-2 border-black shadow-brutal overflow-hidden cursor-pointer group ${
                isLight ? 'bg-black' : 'bg-[#202026] border-[#33333E]'
              }`}
              title="Nhấp để chuyển đoạn nhạc"
            >
              <div
                className="bg-[#FEBC11] h-full transition-all duration-200 group-hover:brightness-110"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            <div className={`flex justify-between text-xs font-mono font-bold ${isLight ? 'text-black' : 'text-gray-300'}`}>
              <span>{formatTime(playbackSec)}</span>
              <span>{currentTrack.duration}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gate 7 Sonic Flavor Pairings Interactive Spotlight Banner */}
      <div
        id="sonic-flavor-spotlight"
        onClick={onPairingClick}
        className={`relative z-10 mt-6 pt-5 border-t-2 border-black flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 border-2 border-black shadow-brutal transition-all cursor-pointer group ${
          isLight
            ? 'bg-[#FFFDF0] hover:bg-[#FFFBE0]'
            : 'bg-[#141418] hover:bg-[#1A1A20] border-[#2E2E38] hover:border-[#FEBC11]'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="shrink-0 pt-1">
            <SonicPairingG7Icon size="md" showRipples={true} showSteam={true} badgeText="TRY IT" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isLight ? 'text-black group-hover:text-amber-800' : 'text-[#FEBC11] group-hover:text-yellow-300'
                }`}
              >
                <i className="fa-solid fa-mug-hot"></i>
                Gate 7 Sonic Flavor Pairings
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 border border-black ${
                  isLight ? 'bg-[#FEBC11] text-[#0D0D0E]' : 'bg-[#202026] text-amber-300 border-amber-400/40'
                }`}
              >
                Acoustic Frequency Match
              </span>
            </div>
            <p className={`text-xs md:text-sm font-medium max-w-2xl leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              {language === 'vi'
                ? 'Từng nốt hương của cà phê đặc sản được khuếch đại bằng tần số âm thanh tương thích. Khám phá sự kết hợp hoàn hảo cho tách cà phê của bạn.'
                : 'Every flavor note of specialty coffee is amplified by matching sound frequencies. Discover the ideal pairing for your cup.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          <div className="hidden lg:flex flex-col text-right">
            <span className={`text-[10px] font-mono uppercase ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              {language === 'vi' ? 'Khuyên dùng hôm nay' : "Today's pairing"}
            </span>
            <span className={`text-xs font-black ${isLight ? 'text-black' : 'text-[#FEBC11]'}`}>
              {coffeePairing} ✦ {currentTrack.genre}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onPairingClick();
            }}
            className="px-4 py-2 bg-[#FEBC11] hover:bg-yellow-400 text-[#0D0D0E] text-xs font-black uppercase tracking-wider border-2 border-black shadow-brutal flex items-center gap-2 transition-transform group-hover:scale-105 active:scale-95 cursor-pointer"
          >
            <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
            <span>{language === 'vi' ? 'Thử Nghiệm' : 'Trial Pairing'}</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </section>
  );
};

