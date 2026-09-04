import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { SoundstageHero } from './components/SoundstageHero';
import { PlaylistGrid } from './components/PlaylistGrid';
import { SidebarRight } from './components/SidebarRight';
import { BottomPlayer } from './components/BottomPlayer';
import { RequestModal } from './components/RequestModal';
import { PlaylistDetailModal } from './components/PlaylistDetailModal';
import { SpotifySyncModal } from './components/SpotifySyncModal';
import { PairingGuideModal } from './components/PairingGuideModal';
import { INITIAL_TRACK, INITIAL_TIME_SLOTS, INITIAL_REQUESTS } from './data';
import { Track, Playlist, TimeSlot, RequestTicket, SpeakerZone, Language, Theme } from './types';
import { audioEngine } from './utils/audio';

export default function App() {
  const [currentTrack, setCurrentTrack] = useState<Track>(INITIAL_TRACK);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSec, setPlaybackSec] = useState<number>(134); // 02:14
  const [likesCount, setLikesCount] = useState<number>(46);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [listenersCount, setListenersCount] = useState<number>(18);
  const [activePlaylistId, setActivePlaylistId] = useState<string>('v-indie');
  const [timeSlots] = useState<TimeSlot[]>(INITIAL_TIME_SLOTS);
  const [requestQueue, setRequestQueue] = useState<RequestTicket[]>(INITIAL_REQUESTS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterTag, setActiveFilterTag] = useState<string | null>(null);
  const [speakerZone, setSpeakerZone] = useState<SpeakerZone>('main');
  const [volume, setVolume] = useState<number>(72);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>('vi');
  const [theme, setTheme] = useState<Theme>('dark');

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Modal States
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);
  const [selectedPlaylistForModal, setSelectedPlaylistForModal] = useState<Playlist | null>(null);
  const [isSpotifyModalOpen, setIsSpotifyModalOpen] = useState<boolean>(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState<boolean>(false);

  // Playback timer loop
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackSec((prev) => {
          if (prev >= currentTrack.durationSec) {
            return 0; // loop or reset
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentTrack.durationSec]);

  // Audio Engine sync
  useEffect(() => {
    if (isPlaying) {
      audioEngine.start();
    } else {
      audioEngine.stop();
    }
    return () => {
      audioEngine.stop();
    };
  }, [isPlaying]);

  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [volume]);

  // Handlers
  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleSeek = (sec: number) => {
    setPlaybackSec(sec);
  };

  const handleToggleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikesCount((prev) => prev - 1);
    } else {
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);
    }
  };

  const handleSelectPlaylist = (playlist: Playlist) => {
    setActivePlaylistId(playlist.id);
    if (playlist.tracks.length > 0) {
      const firstTrack = playlist.tracks[0];
      setCurrentTrack(firstTrack);
      setPlaybackSec(0);
      setIsPlaying(true);
    }
  };

  const handlePlaySpecificTrack = (track: Track, playlist: Playlist) => {
    setActivePlaylistId(playlist.id);
    setCurrentTrack(track);
    setPlaybackSec(0);
    setIsPlaying(true);
  };

  const handleNextTrack = () => {
    // Find next track in active playlist or fallback
    const allTracks = timeSlots.flatMap((slot) => slot.playlists.flatMap((pl) => pl.tracks));
    const currentIndex = allTracks.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % allTracks.length;
    setCurrentTrack(allTracks[nextIndex]);
    setPlaybackSec(0);
    setIsPlaying(true);
  };

  const handlePrevTrack = () => {
    const allTracks = timeSlots.flatMap((slot) => slot.playlists.flatMap((pl) => pl.tracks));
    const currentIndex = allTracks.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + allTracks.length) % allTracks.length;
    setCurrentTrack(allTracks[prevIndex]);
    setPlaybackSec(0);
    setIsPlaying(true);
  };

  const handleSubmitRequest = (ticketData: Omit<RequestTicket, 'id' | 'requestedAt' | 'status'>) => {
    const newTicket: RequestTicket = {
      id: `req-${Date.now()}`,
      songTitle: ticketData.songTitle,
      artist: ticketData.artist,
      tableLocation: ticketData.tableLocation,
      note: ticketData.note,
      requestedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      status: 'queued',
      queueNumber: requestQueue.length + 1,
    };
    setRequestQueue((prev) => [newTicket, ...prev]);
  };

  const handleToggleFilterTag = (tag: string) => {
    setActiveFilterTag((prev) => (prev === tag ? null : tag));
  };

  const handleDNAFeatureClick = (featureTitle: string) => {
    if (featureTitle.includes('Tuyển Chọn')) {
      setIsSpotifyModalOpen(true);
    } else if (featureTitle.includes('Cộng Đồng') || featureTitle.includes('Mượt Mà')) {
      setIsSpotifyModalOpen(true);
    } else {
      setIsRequestModalOpen(true);
    }
  };

  const handleSelectGenreFilter = (genre: string) => {
    if (genre.includes('V-Indie')) {
      setActiveFilterTag('#V-Indie');
    } else if (genre.includes('Lo-fi')) {
      setActiveFilterTag('#Lo-fi Chill');
    } else if (genre.includes('Jazz')) {
      setActiveFilterTag('#CoffeeJazz');
    } else if (genre.includes('Pop') || genre.includes('Chillhop')) {
      setActiveFilterTag('#Acoustic');
    } else {
      setActiveFilterTag('#DeepWork');
    }
  };

  const isLight = theme === 'light';

  return (
    <div
      className={`font-sans antialiased min-h-screen flex flex-col selection:bg-[#FEBC11] selection:text-black transition-colors duration-200 ${
        isLight ? 'bg-[#F7F7F4] text-black' : 'bg-[#121214] text-gray-100'
      }`}
    >
      {/* Top Ticker & Sticky Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onRequestClick={() => setIsRequestModalOpen(true)}
        onSpotifyClick={() => setIsSpotifyModalOpen(true)}
        onBoothClick={() => setIsPairingModalOpen(true)}
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 space-y-8 pb-36">
        {/* Hero Section: Live Soundstage Booth */}
        <SoundstageHero
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          playbackSec={playbackSec}
          onSeek={handleSeek}
          likesCount={likesCount}
          isLiked={isLiked}
          onToggleLike={handleToggleLike}
          listenersCount={listenersCount}
          onPairingClick={() => setIsPairingModalOpen(true)}
          onSpotifyClick={() => setIsSpotifyModalOpen(true)}
          language={language}
          theme={theme}
        />

        {/* 2-Column Grid: 8 Cols Playlists / 4 Cols Philosophy & Requests Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Playlists Shelves */}
          <div className="lg:col-span-8">
            <PlaylistGrid
              timeSlots={timeSlots}
              activePlaylistId={activePlaylistId}
              onSelectPlaylist={(pl) => setSelectedPlaylistForModal(pl)}
              onViewAllSlot={(slot) => {
                if (slot.playlists.length > 0) {
                  setSelectedPlaylistForModal(slot.playlists[0]);
                }
              }}
              activeFilterTag={activeFilterTag}
              searchQuery={searchQuery}
              language={language}
              theme={theme}
            />
          </div>

          {/* Right Column: DNA & Live Request Queue */}
          <div className="lg:col-span-4">
            <SidebarRight
              requestQueue={requestQueue}
              onRequestClick={() => setIsRequestModalOpen(true)}
              activeFilterTag={activeFilterTag}
              onToggleFilterTag={handleToggleFilterTag}
              onDNAFeatureClick={handleDNAFeatureClick}
              language={language}
              theme={theme}
            />
          </div>
        </div>

        {/* Footer */}
        <footer
          className={`pt-8 pb-4 border-t-2 flex flex-col md:flex-row items-center justify-between text-xs font-bold gap-4 transition-colors ${
            isLight ? 'border-black text-gray-700' : 'border-[#2A2A34] text-gray-400'
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className={isLight ? 'text-black' : 'text-white'}>© 2025 Gate 7 Coffee Roastery.</span>
            <span>•</span>
            <span>gate7.vn/music • {language === 'vi' ? 'Không gian kết nối qua từng tách cà phê' : 'Connecting through every cup of coffee'}</span>
          </div>

          <div className={`flex items-center gap-4 text-base ${isLight ? 'text-black' : 'text-gray-300'}`}>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#FEBC11] transition-colors"
              title="Facebook"
            >
              <i className="fa-brands fa-facebook"></i>
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#FEBC11] transition-colors"
              title="Instagram"
            >
              <i className="fa-brands fa-instagram"></i>
            </a>
            <button
              onClick={() => setIsSpotifyModalOpen(true)}
              className="hover:text-[#1DB954] transition-colors cursor-pointer"
              title="Spotify"
            >
              <i className="fa-brands fa-spotify"></i>
            </button>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#FEBC11] transition-colors"
              title="TikTok"
            >
              <i className="fa-brands fa-tiktok"></i>
            </a>
          </div>
        </footer>
      </main>

      {/* Persistent Bottom Audio Player Bar */}
      <BottomPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onNextTrack={handleNextTrack}
        onPrevTrack={handlePrevTrack}
        playbackSec={playbackSec}
        onSeek={handleSeek}
        isLiked={isLiked}
        onToggleLike={handleToggleLike}
        isShuffle={isShuffle}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        isRepeat={isRepeat}
        onToggleRepeat={() => setIsRepeat(!isRepeat)}
        speakerZone={speakerZone}
        onSelectSpeakerZone={setSpeakerZone}
        volume={volume}
        onChangeVolume={setVolume}
        onOpenTrackDetail={() => {
          const matched = timeSlots
            .flatMap((s) => s.playlists)
            .find((pl) => pl.tracks.some((t) => t.id === currentTrack.id));
          if (matched) {
            setSelectedPlaylistForModal(matched);
          } else {
            setSelectedPlaylistForModal(timeSlots[0].playlists[0]);
          }
        }}
        onOpenSpotifySync={() => setIsSpotifyModalOpen(true)}
        language={language}
        theme={theme}
      />

      {/* Modals & Screens */}
      <RequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSubmitRequest={handleSubmitRequest}
        language={language}
      />

      <PlaylistDetailModal
        playlist={selectedPlaylistForModal}
        isOpen={!!selectedPlaylistForModal}
        onClose={() => setSelectedPlaylistForModal(null)}
        currentTrackId={currentTrack.id}
        isPlaying={isPlaying}
        onPlayTrack={(track, pl) => handlePlaySpecificTrack(track, pl)}
        language={language}
      />

      <SpotifySyncModal
        isOpen={isSpotifyModalOpen}
        onClose={() => setIsSpotifyModalOpen(false)}
        speakerZone={speakerZone}
        onSelectSpeakerZone={setSpeakerZone}
        volume={volume}
        onChangeVolume={setVolume}
        language={language}
      />

      <PairingGuideModal
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        onSelectGenre={handleSelectGenreFilter}
        language={language}
      />
    </div>
  );
}
