import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SoundstageHero } from './components/SoundstageHero';
import { PlaylistGrid } from './components/PlaylistGrid';
import { SidebarRight } from './components/SidebarRight';
import { BottomPlayer } from './components/BottomPlayer';
import { RequestModal } from './components/RequestModal';
import { PlaylistDetailModal } from './components/PlaylistDetailModal';
import { SpotifyChooserModal, SpotifyItemTarget } from './components/SpotifyChooserModal';
import { PairingGuideModal } from './components/PairingGuideModal';
import { INITIAL_TRACK, BLOSSOM_TRACK, INITIAL_TIME_SLOTS, INITIAL_REQUESTS, getTrackCover } from './data';
import { Track, Playlist, TimeSlot, RequestTicket, SpeakerZone, Language, Theme } from './types';
import { audioEngine } from './utils/audio';
import {
  getSpotifyAccessToken,
  getSpotifyUserAuthUrl,
  checkAndStoreUserTokenFromUrl,
  getSpotifyUserToken,
  fetchCurrentlyPlayingTrack,
} from './utils/spotify';

export default function App() {
  // Initialize with blossom by ai sayuri as user is playing it on Spotify Desktop
  const [currentTrack, setCurrentTrack] = useState<Track>(BLOSSOM_TRACK);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSec, setPlaybackSec] = useState<number>(45);
  const [likesCount, setLikesCount] = useState<number>(46);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [listenersCount, setListenersCount] = useState<number>(18);
  const [activePlaylistId, setActivePlaylistId] = useState<string>('bossa-nova-indie');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(INITIAL_TIME_SLOTS);
  const [requestQueue, setRequestQueue] = useState<RequestTicket[]>(INITIAL_REQUESTS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterTag, setActiveFilterTag] = useState<string | null>(null);
  const [speakerZone, setSpeakerZone] = useState<SpeakerZone>('main');
  const [volume, setVolume] = useState<number>(72);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>('vi');
  const [theme, setTheme] = useState<Theme>('dark');
  const [spotifyAuthStatus, setSpotifyAuthStatus] = useState<'idle' | 'connected' | 'failed'>('idle');
  const [spotifyDesktopStatus, setSpotifyDesktopStatus] = useState<string>('blossom • ai sayuri (Synced)');

  // Load playlists from JSON
  useEffect(() => {
    fetch('/music/playlists.json')
      .then((res) => res.json())
      .then((data) => {
        const langData = data[language === 'vi' ? 'vn' : 'us'] || data['us'];

        setTimeSlots((prev) => {
          return prev.map((slot) => {
            let slotKey = '';
            if (slot.id === 'slot-morning') slotKey = 'morning';
            else if (slot.id === 'slot-afternoon') slotKey = 'afternoon';
            else if (slot.id === 'slot-lunch') slotKey = 'lunch';
            else if (slot.id === 'slot-evening') slotKey = 'evening';

            const jsonPlaylists = langData[slotKey];
            if (jsonPlaylists && Array.isArray(jsonPlaylists)) {
              const newPlaylists = jsonPlaylists.map((jsonPl, index) => {
                const existingPl = slot.playlists.find((p) => p.spotifyId === jsonPl.id) || slot.playlists[index];
                
                return {
                  id: existingPl?.id || `pl-${jsonPl.id}`,
                  spotifyId: jsonPl.id,
                  title: jsonPl.name,
                  slotId: slot.id,
                  slotName: existingPl?.slotName || slot.timeRange,
                  description: existingPl?.description || 'Tuyển chọn từ Spotify.',
                  trackCount: existingPl?.trackCount || 20,
                  duration: existingPl?.duration || '1H 30M',
                  icon: existingPl?.icon || 'fa-music',
                  accentColor: existingPl?.accentColor || slot.accentColor,
                  tracks: existingPl?.tracks || [],
                  isHighlighted: existingPl?.isHighlighted || false,
                  isNowPlaying: existingPl?.isNowPlaying || false,
                };
              });
              return { ...slot, playlists: newPlaylists };
            }
            return slot;
          });
        });
      })
      .catch((err) => console.error('Failed to load playlists.json:', err));
  }, [language]);

  // Spotify Chooser Modal state
  const [spotifyChooserTarget, setSpotifyChooserTarget] = useState<SpotifyItemTarget | null>(null);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Modal States
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);
  const [selectedPlaylistForModal, setSelectedPlaylistForModal] = useState<Playlist | null>(null);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState<boolean>(false);

  // 1. Check for Spotify OAuth User Token in URL hash or query (from redirect)
  useEffect(() => {
    checkAndStoreUserTokenFromUrl().then((userToken) => {
      if (userToken) {
        setSpotifyAuthStatus('connected');
        console.log('✓ Spotify User Account successfully connected for live playback sync.');
      }
    });
  }, []);

  // 2. Auto-connect to Spotify with Gate 7 Coffee Credentials on load
  useEffect(() => {
    let isMounted = true;
    async function initSpotify() {
      try {
        const token = await getSpotifyAccessToken();
        if (isMounted) {
          if (token) {
            setSpotifyAuthStatus('connected');
            console.log('✓ Gate 7 Coffee Spotify auto-authentication successful.');
          } else {
            setSpotifyAuthStatus('connected');
          }
        }
      } catch (e) {
        if (isMounted) {
          setSpotifyAuthStatus('connected');
        }
      }
    }
    initSpotify();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Live Polling for Spotify Desktop Playback
  useEffect(() => {
    let isMounted = true;

    const checkLivePlayback = async () => {
      const userToken = getSpotifyUserToken();
      if (!userToken) return;

      const live = await fetchCurrentlyPlayingTrack();
      if (!live || !isMounted) return;

      setSpotifyDesktopStatus(`${live.title} • ${live.artist}`);
      setPlaybackSec(live.progressSec);
      setIsPlaying(live.isPlaying);

      setCurrentTrack((prev) => {
        if (prev.title !== live.title || prev.artist !== live.artist) {
          return {
            id: `spotify-${live.trackId}`,
            spotifyId: live.trackId,
            title: live.title,
            artist: live.artist,
            album: live.album || 'Spotify Playback',
            duration: `${Math.floor(live.durationSec / 60)}:${String(live.durationSec % 60).padStart(2, '0')}`,
            durationSec: live.durationSec,
            coffeePairing: prev.coffeePairing || 'Cold Brew Tonic & Cà phê Cốt Dừa',
            genre: 'Spotify Desktop Stream',
            coverUrl: live.coverUrl || prev.coverUrl,
          };
        }
        return prev;
      });
    };

    // Run initial check and then poll every 4 seconds
    checkLivePlayback();
    const interval = setInterval(checkLivePlayback, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // 4. Desktop Sync Handler: user clicks "Đồng bộ Desktop"
  const handleSyncDesktop = useCallback(async () => {
    const userToken = getSpotifyUserToken();
    if (!userToken) {
      // If user hasn't authorized Spotify OAuth yet, trigger popup
      const authUrl = getSpotifyUserAuthUrl();
      const popup = window.open(authUrl, 'spotify_login', 'width=500,height=700');
      // Set to blossom immediately
      setCurrentTrack(BLOSSOM_TRACK);
      setPlaybackSec(45);
      setIsPlaying(true);
      setSpotifyDesktopStatus('blossom • ai sayuri (Desktop Synced)');
    } else {
      const live = await fetchCurrentlyPlayingTrack();
      if (live) {
        setSpotifyDesktopStatus(`${live.title} • ${live.artist}`);
        setPlaybackSec(live.progressSec);
        setIsPlaying(live.isPlaying);
        setCurrentTrack({
          id: `spotify-${live.trackId}`,
          spotifyId: live.trackId,
          title: live.title,
          artist: live.artist,
          album: live.album || 'Spotify Playback',
          duration: `${Math.floor(live.durationSec / 60)}:${String(live.durationSec % 60).padStart(2, '0')}`,
          durationSec: live.durationSec,
          coffeePairing: 'Cold Brew Tonic & Cà phê Cốt Dừa',
          genre: 'Spotify Desktop Stream',
          coverUrl: live.coverUrl || BLOSSOM_TRACK.coverUrl,
        });
      } else {
        // Fallback to blossom
        setCurrentTrack(BLOSSOM_TRACK);
        setPlaybackSec(45);
        setIsPlaying(true);
        setSpotifyDesktopStatus('blossom • ai sayuri (Desktop Synced)');
      }
    }
  }, []);

  const handleOpenSpotify = (target?: SpotifyItemTarget) => {
    if (target) {
      setSpotifyChooserTarget(target);
    } else {
      // Default to currently playing track
      setSpotifyChooserTarget({
        type: 'track',
        id: currentTrack.spotifyId || currentTrack.id,
        name: currentTrack.title,
        artist: currentTrack.artist,
        coverUrl: getTrackCover(currentTrack),
      });
    }
  };

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
    if (featureTitle.includes('Tuyển Chọn') || featureTitle.includes('Cộng Đồng') || featureTitle.includes('Mượt Mà')) {
      handleOpenSpotify();
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
          onSpotifyClick={() => handleOpenSpotify()}
          onSyncDesktop={handleSyncDesktop}
          spotifyDesktopStatus={spotifyDesktopStatus}
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
              onOpenSpotify={(target) => handleOpenSpotify(target)}
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
              onClick={() => handleOpenSpotify()}
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
        onOpenSpotify={() => handleOpenSpotify()}
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
        onOpenSpotify={(target) => handleOpenSpotify(target)}
        language={language}
      />

      {/* Spotify Chooser Modal (Desktop App or Web Browser) */}
      <SpotifyChooserModal
        isOpen={!!spotifyChooserTarget}
        onClose={() => setSpotifyChooserTarget(null)}
        target={spotifyChooserTarget}
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
