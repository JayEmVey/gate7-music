import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { SoundstageHero } from './components/SoundstageHero';
import { PlaylistGrid } from './components/PlaylistGrid';
import { SidebarRight } from './components/SidebarRight';
import { BottomPlayer } from './components/BottomPlayer';
import { RequestModal } from './components/RequestModal';
import { PlaylistDetailModal } from './components/PlaylistDetailModal';
import { SpotifyChooserModal, SpotifyItemTarget } from './components/SpotifyChooserModal';
import { PairingGuideModal } from './components/PairingGuideModal';
import { INITIAL_TIME_SLOTS, INITIAL_REQUESTS, getTrackCover } from './data';
import { Track, Playlist, TimeSlot, RequestTicket, SpeakerZone, Language, Theme, SpotifyWebPlaybackPlayer } from './types';
import {
  getSpotifyUserAuthUrl,
  checkAndStoreUserTokenFromUrl,
  getSpotifyUserToken,
  fetchCurrentlyPlayingTrack,
  refreshSpotifyUserToken,
  fetchCachedPlaylistTracks,
  transferSpotifyPlayback,
  startSpotifyPlayback,
  pauseSpotifyPlayback,
  seekSpotifyPlayback,
  skipToNextSpotifyTrack,
  skipToPreviousSpotifyTrack,
  setSpotifyRepeatMode,
  setSpotifyShuffle,
  setSpotifyVolume,
  getCurrentSlotKey,
  SPOTIFY_SCOPE_VERSION,
} from './utils/spotify';

function getCurrentTimeSlotId(): string {
  return `slot-${getCurrentSlotKey()}`;
}

function getInitialTimeSlots(): TimeSlot[] {
  const currentSlotId = getCurrentTimeSlotId();
  return INITIAL_TIME_SLOTS.map((slot) => ({
    ...slot,
    isCurrentSlot: slot.id === currentSlotId,
  }));
}

function getInitialActivePlaylistId(): string {
  const currentSlot = getInitialTimeSlots().find((slot) => slot.isCurrentSlot);
  return currentSlot?.playlists.find((playlist) => playlist.isNowPlaying)?.id
    || currentSlot?.playlists[0]?.id
    || 'bossa-nova-indie';
}

function toAppTrack(track: any, fallbackCover = ''): Track {
  const durationSec = Math.floor((track.duration_ms || track.durationSec * 1000 || 0) / 1000);
  return {
    id: `spotify-${track.id}`,
    spotifyId: track.id,
    title: track.name || track.title,
    artist: track.artists?.map((artist: { name: string }) => artist.name).join(', ') || track.artist || 'Unknown Artist',
    album: track.album?.name || track.album || 'Spotify Playback',
    duration: `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`,
    durationSec,
    coffeePairing: 'Cold Brew Tonic & Cà phê Cốt Dừa',
    genre: 'Spotify Web Playback',
    coverUrl: track.album?.images?.[0]?.url || track.coverUrl || fallbackCover,
  };
}

const EMPTY_SPOTIFY_TRACK: Track = {
  id: 'spotify-empty',
  title: 'No Spotify track playing',
  artist: 'Connect a Spotify playback device',
  album: 'Spotify Web Playback',
  duration: '00:00',
  durationSec: 0,
};

const PLAYBACK_STATE_KEY = 'gate7_playback_state';

interface PersistedPlaybackState {
  track: Track;
  playbackSec: number;
  isPlaying: boolean;
}

function getPersistedPlaybackState(): PersistedPlaybackState | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(PLAYBACK_STATE_KEY);
    if (!value) return null;
    const state = JSON.parse(value) as PersistedPlaybackState;
    if (!state.track?.spotifyId) return null;
    return state;
  } catch {
    localStorage.removeItem(PLAYBACK_STATE_KEY);
    return null;
  }
}

export default function App() {
  const persistedPlayback = getPersistedPlaybackState();
  const [currentTrack, setCurrentTrack] = useState<Track>(persistedPlayback?.track || EMPTY_SPOTIFY_TRACK);
  const [isPlaying, setIsPlaying] = useState<boolean>(persistedPlayback?.isPlaying ?? false);
  const [playbackSec, setPlaybackSec] = useState<number>(persistedPlayback?.playbackSec ?? 0);
  const [likesCount, setLikesCount] = useState<number>(46);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [listenersCount, setListenersCount] = useState<number>(18);
  const [activePlaylistId, setActivePlaylistId] = useState<string>(getInitialActivePlaylistId);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(getInitialTimeSlots);
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
  const [spotifyDesktopStatus, setSpotifyDesktopStatus] = useState<string>('Waiting for Spotify playback');
  const spotifyPlayerRef = useRef<SpotifyWebPlaybackPlayer | null>(null);
  const spotifyDeviceIdRef = useRef<string | null>(null);
  const loadedPlaylistIdsRef = useRef(new Set<string>());
  const hydratingPlaylistIdsRef = useRef(new Set<string>());
  const failedPlaylistIdsRef = useRef(new Set<string>());
  const playlistTrackCacheRef = useRef(new Map<string, Track[]>());
  const playlistTrackRequestsRef = useRef(new Map<string, Promise<Track[]>>());
  const pendingRestoreRef = useRef<PersistedPlaybackState | null>(persistedPlayback);
  const isLocalPlaybackActiveRef = useRef(false);
  const [spotifyPlayerReady, setSpotifyPlayerReady] = useState(false);

  useEffect(() => {
    const updateCurrentSlot = () => {
      const currentSlotId = getCurrentTimeSlotId();
      setTimeSlots((slots) => slots.map((slot) => ({
        ...slot,
        isCurrentSlot: slot.id === currentSlotId,
      })));
    };

    updateCurrentSlot();
    const interval = window.setInterval(updateCurrentSlot, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  // Load playlists from JSON
  useEffect(() => {
    loadedPlaylistIdsRef.current.clear();
    hydratingPlaylistIdsRef.current.clear();
    failedPlaylistIdsRef.current.clear();
    fetch('/music/playlists.json')
      .then((res) => res.json())
      .then((data) => {
        const langData = data[language === 'vi' ? 'vn' : 'us'] || data['us'];
        loadedPlaylistIdsRef.current.clear();
        hydratingPlaylistIdsRef.current.clear();
        failedPlaylistIdsRef.current.clear();

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
                  trackCount: existingPl?.trackCount || 0,
                  duration: existingPl?.duration || '1H 30M',
                  icon: existingPl?.icon || 'fa-music',
                  accentColor: existingPl?.accentColor || slot.accentColor,
                  coverUrl: jsonPl.coverUrl || existingPl?.coverUrl || existingPl?.tracks.find((track) => track.coverUrl)?.coverUrl,
                  tracks: existingPl?.tracks || [],
                  isHighlighted: existingPl?.spotifyId === jsonPl.id && Boolean(existingPl.isHighlighted),
                  isNowPlaying: existingPl?.spotifyId === jsonPl.id && Boolean(existingPl.isNowPlaying),
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

  // Establish a user session on page load. PKCE keeps the client secret out of the browser.
  useEffect(() => {
    checkAndStoreUserTokenFromUrl().then(async (userToken) => {
      if (localStorage.getItem('spotify_scope_version') !== SPOTIFY_SCOPE_VERSION && !userToken) {
        localStorage.removeItem('spotify_user_token');
        localStorage.removeItem('spotify_user_token_expires_at');
        localStorage.removeItem('spotify_user_refresh_token');
      }
      const cachedToken = userToken || getSpotifyUserToken() || await refreshSpotifyUserToken();
      if (cachedToken) {
        setSpotifyAuthStatus('connected');
      } else {
        const authUrl = await getSpotifyUserAuthUrl();
        window.location.assign(authUrl);
      }
    });
  }, []);

  // Receive a successful OAuth result from the login popup.
  useEffect(() => {
    const onSpotifyAuthComplete = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'spotify-auth-complete') {
        return;
      }
      setSpotifyAuthStatus('connected');
      console.log('✓ Spotify User Account successfully connected for live playback sync.');
    };

    window.addEventListener('message', onSpotifyAuthComplete);
    return () => window.removeEventListener('message', onSpotifyAuthComplete);
  }, []);

  // Connect the Web Playback SDK and mirror its state into the page.
  useEffect(() => {
    if (spotifyAuthStatus !== 'connected') return;
    let script: HTMLScriptElement | null = null;
    let mounted = true;
    const initializePlayer = () => {
      if (!mounted || !window.Spotify || spotifyPlayerRef.current) return;
      const player = new window.Spotify.Player({
        name: 'Gate 7 Soundstage',
        getOAuthToken: async (callback) => {
          const token = getSpotifyUserToken() || await refreshSpotifyUserToken();
          if (token) callback(token);
        },
        volume: volume / 100,
      });
      spotifyPlayerRef.current = player;
      player.addListener('ready', async ({ device_id }) => {
        spotifyDeviceIdRef.current = device_id;
        setSpotifyPlayerReady(true);
        const saved = getPersistedPlaybackState();
        if (saved) {
          setCurrentTrack(saved.track);
          setPlaybackSec(saved.playbackSec);
          setIsPlaying(false);
          setSpotifyDesktopStatus('Spotify player ready — press Play to resume');
        } else {
          setSpotifyDesktopStatus('Spotify player ready — select a track or press Play');
        }
      });
      player.addListener('not_ready', () => {
        isLocalPlaybackActiveRef.current = false;
        setSpotifyPlayerReady(false);
      });
      player.addListener('initialization_error', ({ message }) => setSpotifyDesktopStatus(`Spotify player unavailable: ${message}`));
      player.addListener('authentication_error', ({ message }) => {
        setSpotifyAuthStatus('failed');
        setSpotifyDesktopStatus(`Spotify authentication failed: ${message}`);
      });
      player.addListener('account_error', ({ message }) => {
        setSpotifyAuthStatus('failed');
        setSpotifyDesktopStatus(`Spotify Premium is required: ${message}`);
      });
      player.addListener('autoplay_failed', () => setSpotifyDesktopStatus('Press Play to allow Spotify audio in this browser'));
      player.addListener('playback_error', ({ message }) => setSpotifyDesktopStatus(`Spotify playback error: ${message}`));
      player.addListener('player_state_changed', (state) => {
        if (!state?.track_window?.current_track) {
          isLocalPlaybackActiveRef.current = false;
          return;
        }
        isLocalPlaybackActiveRef.current = true;
        pendingRestoreRef.current = null;
        const liveTrack = toAppTrack(state.track_window.current_track, currentTrack.coverUrl);
        setCurrentTrack(liveTrack);
        setPlaybackSec(Math.floor((state.position || 0) / 1000));
        setIsPlaying(!state.paused);
        setSpotifyDesktopStatus(`${liveTrack.title} • ${liveTrack.artist}`);
        setTimeSlots((slots) => slots.map((slot) => ({
          ...slot,
          playlists: slot.playlists.map((playlist) => ({
            ...playlist,
            isNowPlaying: playlist.tracks.some((track) => track.spotifyId === liveTrack.spotifyId),
          })),
        })));
      });
      player.connect();
    };

    if (window.Spotify) {
      initializePlayer();
    } else {
      script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      window.onSpotifyWebPlaybackSDKReady = initializePlayer;
      document.body.appendChild(script);
    }
    return () => {
      mounted = false;
      window.onSpotifyWebPlaybackSDKReady = undefined;
      script?.remove();
      spotifyPlayerRef.current?.disconnect();
      spotifyPlayerRef.current = null;
    };
  }, [spotifyAuthStatus]);

  // Keep remote metadata fresh until the browser player has taken ownership.
  useEffect(() => {
    const pollRemotePlayback = async () => {
      if (document.visibilityState === 'hidden') return;
      if (isLocalPlaybackActiveRef.current) return;
      const live = await fetchCurrentlyPlayingTrack();
      if (!live) return;
      setCurrentTrack((prev) => toAppTrack({
        id: live.trackId,
        name: live.title,
        artist: live.artist,
        album: live.album,
        durationSec: live.durationSec,
        coverUrl: live.coverUrl || prev.coverUrl,
      }, prev.coverUrl));
      setPlaybackSec(live.progressSec);
      setIsPlaying(live.isPlaying);
    };
    const interval = window.setInterval(pollRemotePlayback, 15_000);
    document.addEventListener('visibilitychange', pollRemotePlayback);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', pollRemotePlayback);
    };
  }, [spotifyPlayerReady]);

  // The SDK may emit state events at irregular intervals. Poll the local player
  // position while it owns playback so the progress display remains authoritative.
  useEffect(() => {
    if (!spotifyPlayerReady) return;
    const interval = window.setInterval(async () => {
      const state = await spotifyPlayerRef.current?.getCurrentState();
      if (!state) return;
      isLocalPlaybackActiveRef.current = true;
      setPlaybackSec(Math.floor((state.position || 0) / 1000));
      setIsPlaying(!state.paused);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [spotifyPlayerReady]);

  // Desktop Sync Handler: user clicks "Đồng bộ Desktop"
  const handleSyncDesktop = useCallback(async () => {
    const userToken = getSpotifyUserToken();
    if (!userToken) {
      // If user hasn't authorized Spotify OAuth yet, trigger popup
      const authUrl = await getSpotifyUserAuthUrl();
      const popup = window.open(authUrl, 'spotify_login', 'width=500,height=700');
      if (!popup) {
        setSpotifyAuthStatus('failed');
        console.warn('Spotify login popup was blocked by the browser.');
        return;
      }
      setIsPlaying(false);
      setPlaybackSec(0);
      setSpotifyDesktopStatus('Spotify login required');
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
          coverUrl: live.coverUrl || currentTrack.coverUrl,
        });
      } else {
        setIsPlaying(false);
        setPlaybackSec(0);
        setSpotifyDesktopStatus('No Spotify track is currently playing');
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

  useEffect(() => {
    if (!currentTrack.spotifyId) return;
    localStorage.setItem(PLAYBACK_STATE_KEY, JSON.stringify({
      track: currentTrack,
      playbackSec,
      isPlaying,
    } satisfies PersistedPlaybackState));
  }, [currentTrack, playbackSec, isPlaying]);

  useEffect(() => {
    spotifyPlayerRef.current?.setVolume(volume / 100);
    if (!getSpotifyUserToken()) return;
    const timeout = window.setTimeout(() => {
      setSpotifyVolume(volume, spotifyDeviceIdRef.current || undefined).catch((error) => {
        console.warn('Could not set Spotify playback volume:', error);
      });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [volume, spotifyAuthStatus, spotifyPlayerReady]);

  // Handlers
  const handleTogglePlay = async () => {
    const player = spotifyPlayerRef.current;
    if (!spotifyPlayerReady || !player) {
      try {
        const changed = isPlaying
          ? await pauseSpotifyPlayback(spotifyDeviceIdRef.current || undefined)
          : await startSpotifyPlayback(spotifyDeviceIdRef.current || undefined, currentTrack.spotifyId
            ? { uris: [`spotify:track:${currentTrack.spotifyId}`] }
            : undefined);
        if (!changed) throw new Error('Spotify rejected the playback request');
        setIsPlaying(!isPlaying);
      } catch (error) {
        console.warn('Could not change remote Spotify playback:', error);
        setSpotifyDesktopStatus('Spotify player is still connecting');
      }
      return;
    }

    try {
      await player.activateElement();
      const state = await player.getCurrentState();
      if (state) {
        await player.togglePlay();
        return;
      }

      const deviceId = spotifyDeviceIdRef.current;
      if (!deviceId) throw new Error('Spotify browser device is unavailable');
      const saved = pendingRestoreRef.current;
      const transferred = await transferSpotifyPlayback(deviceId, false);
      if (!transferred) throw new Error('Spotify could not transfer playback to this browser');

      if (saved?.isPlaying && saved.track.spotifyId) {
        const resumed = await startSpotifyPlayback(deviceId, {
          uris: [`spotify:track:${saved.track.spotifyId}`],
        });
        if (!resumed) throw new Error('Spotify could not resume the saved track');
        if (saved.playbackSec > 0) {
          await seekSpotifyPlayback(saved.playbackSec * 1000, deviceId);
        }
        pendingRestoreRef.current = null;
      } else {
        await startSpotifyPlayback(deviceId);
      }
    } catch (error) {
      if (!spotifyPlayerReady || !spotifyPlayerRef.current) {
        try {
          const changed = isPlaying
            ? await pauseSpotifyPlayback(spotifyDeviceIdRef.current || undefined)
            : await startSpotifyPlayback(spotifyDeviceIdRef.current || undefined, currentTrack.spotifyId
              ? { uris: [`spotify:track:${currentTrack.spotifyId}`] }
              : undefined);
          if (changed) {
            setIsPlaying(!isPlaying);
            return;
          }
        } catch (remoteError) {
          console.warn('Could not change remote Spotify playback:', remoteError);
        }
      }
      console.warn('Could not toggle Spotify playback:', error);
      setSpotifyDesktopStatus('Spotify playback could not be changed');
    }
  };

  const handleSeek = async (sec: number) => {
    try {
      if (spotifyPlayerRef.current && spotifyPlayerReady) {
        await spotifyPlayerRef.current.seek(sec * 1000);
      } else {
        const changed = await seekSpotifyPlayback(sec * 1000, spotifyDeviceIdRef.current || undefined);
        if (!changed) throw new Error('Spotify rejected the seek request');
      }
      setPlaybackSec(sec);
    } catch (error) {
      console.warn('Could not seek Spotify playback:', error);
    }
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
    loadPlaylistTracks(playlist);
  };

  const handlePlaySpecificTrack = async (track: Track, playlist: Playlist) => {
    setActivePlaylistId(playlist.id);
    const player = spotifyPlayerRef.current;
    if (player && spotifyDeviceIdRef.current && track.spotifyId) {
      await player.activateElement();
      const transferred = await transferSpotifyPlayback(spotifyDeviceIdRef.current, false);
      if (!transferred) {
        setSpotifyDesktopStatus('Spotify browser player is unavailable');
        return;
      }
      const started = await startSpotifyPlayback(spotifyDeviceIdRef.current, {
        uris: [`spotify:track:${track.spotifyId}`],
      });
      if (!started) {
        setSpotifyDesktopStatus('Spotify rejected this playback request');
        return;
      }
      pendingRestoreRef.current = null;
      return;
    }
    if (track.spotifyId) {
      try {
        const started = await startSpotifyPlayback(spotifyDeviceIdRef.current || undefined, {
          uris: [`spotify:track:${track.spotifyId}`],
        });
        if (!started) throw new Error('Spotify rejected this playback request');
        setCurrentTrack(track);
        setPlaybackSec(0);
        setIsPlaying(true);
        return;
      } catch (error) {
        console.warn('Could not start selected Spotify track:', error);
      }
    }
    setSpotifyDesktopStatus('Spotify player is still connecting');
  };

  const handleNextTrack = async () => {
    if (spotifyPlayerReady && spotifyPlayerRef.current) {
      try {
        await spotifyPlayerRef.current.activateElement();
        await spotifyPlayerRef.current.nextTrack();
      } catch (error) {
        console.warn('Could not skip to next Spotify track:', error);
        setSpotifyDesktopStatus('Spotify could not skip to the next track');
      }
      return;
    }
    if (getSpotifyUserToken()) {
      try {
        const skipped = await skipToNextSpotifyTrack(spotifyDeviceIdRef.current || undefined);
        if (!skipped) throw new Error('Spotify rejected the next-track request');
        return;
      } catch (error) {
        console.warn('Could not skip to next Spotify track:', error);
        setSpotifyDesktopStatus('Spotify could not skip to the next track');
        return;
      }
    }
    // Find next track in active playlist or fallback
    const allTracks = timeSlots.flatMap((slot) => slot.playlists.flatMap((pl) => pl.tracks));
    const currentIndex = allTracks.findIndex((t) => t.id === currentTrack.id);
    if (allTracks.length === 0) return;
    const nextIndex = (currentIndex + 1) % allTracks.length;
    setCurrentTrack(allTracks[nextIndex]);
    setPlaybackSec(0);
    setIsPlaying(true);
  };

  const handlePrevTrack = async () => {
    if (spotifyPlayerReady && spotifyPlayerRef.current) {
      try {
        await spotifyPlayerRef.current.activateElement();
        await spotifyPlayerRef.current.previousTrack();
      } catch (error) {
        console.warn('Could not skip to previous Spotify track:', error);
        setSpotifyDesktopStatus('Spotify could not skip to the previous track');
      }
      return;
    }
    if (getSpotifyUserToken()) {
      try {
        const skipped = await skipToPreviousSpotifyTrack(spotifyDeviceIdRef.current || undefined);
        if (!skipped) throw new Error('Spotify rejected the previous-track request');
        return;
      } catch (error) {
        console.warn('Could not skip to previous Spotify track:', error);
        setSpotifyDesktopStatus('Spotify could not skip to the previous track');
        return;
      }
    }
    const allTracks = timeSlots.flatMap((slot) => slot.playlists.flatMap((pl) => pl.tracks));
    const currentIndex = allTracks.findIndex((t) => t.id === currentTrack.id);
    if (allTracks.length === 0) return;
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

  const loadPlaylistTracks = async (playlist: Playlist) => {
    if (!playlist.spotifyId || loadedPlaylistIdsRef.current.has(playlist.id)) {
      setSelectedPlaylistForModal(playlist);
      return;
    }

    const cacheKey = `gate7_playlist_tracks:${playlist.spotifyId}`;
    let tracks = playlistTrackCacheRef.current.get(playlist.id);
    if (!tracks) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) tracks = JSON.parse(cached) as Track[];
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    try {
      if (!tracks) {
        let request = playlistTrackRequestsRef.current.get(playlist.id);
        if (!request) {
          request = fetchCachedPlaylistTracks(playlist.spotifyId).then((spotifyTracks) => spotifyTracks.map((track) => ({
            id: `spotify-${track.id}`,
            spotifyId: track.id,
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: `${Math.floor(track.durationSec / 60)}:${String(track.durationSec % 60).padStart(2, '0')}`,
            durationSec: track.durationSec,
            coffeePairing: 'Cold Brew Tonic & Cà phê Cốt Dừa',
            coverUrl: track.coverUrl,
          })));
          playlistTrackRequestsRef.current.set(playlist.id, request);
        }
        try {
          tracks = await request;
        } finally {
          playlistTrackRequestsRef.current.delete(playlist.id);
        }
        playlistTrackCacheRef.current.set(playlist.id, tracks);
        sessionStorage.setItem(cacheKey, JSON.stringify(tracks));
      }

      loadedPlaylistIdsRef.current.add(playlist.id);
      const updatedPlaylist = {
        ...playlist,
        loadError: undefined,
        tracks,
        trackCount: tracks.length,
        coverUrl: playlist.coverUrl || tracks.find((track) => track.coverUrl)?.coverUrl,
        isNowPlaying: tracks.some((track) => track.spotifyId === currentTrack.spotifyId),
      };
      setTimeSlots((slots) => slots.map((slot) => ({
        ...slot,
        playlists: slot.playlists.map((item) => item.id === playlist.id ? updatedPlaylist : item),
      })));
      setSelectedPlaylistForModal(updatedPlaylist);
    } catch (error) {
      console.warn('Could not load Spotify playlist tracks:', error);
      setSelectedPlaylistForModal({
        ...playlist,
        loadError: error instanceof Error ? error.message : 'Spotify could not load this playlist.',
      });
    }
  };

  const handleToggleShuffle = async () => {
    const next = !isShuffle;
    try {
      const changed = await setSpotifyShuffle(next, spotifyDeviceIdRef.current || undefined);
      if (!changed) throw new Error('Spotify rejected the shuffle request');
      setIsShuffle(next);
    } catch (error) {
      console.warn('Could not change Spotify shuffle:', error);
    }
  };

  const handleToggleRepeat = async () => {
    const next = !isRepeat;
    try {
      const changed = await setSpotifyRepeatMode(next ? 'context' : 'off', spotifyDeviceIdRef.current || undefined);
      if (!changed) throw new Error('Spotify rejected the repeat request');
      setIsRepeat(next);
    } catch (error) {
      console.warn('Could not change Spotify repeat mode:', error);
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
              onSelectPlaylist={handleSelectPlaylist}
              onViewAllSlot={(slot) => {
                if (slot.playlists.length > 0) {
                  handleSelectPlaylist(slot.playlists[0]);
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
        onToggleShuffle={handleToggleShuffle}
        isRepeat={isRepeat}
        onToggleRepeat={handleToggleRepeat}
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
        onRetry={() => {
          if (selectedPlaylistForModal) void loadPlaylistTracks(selectedPlaylistForModal);
        }}
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
