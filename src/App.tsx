import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePlaylistSync } from './hooks/usePlaylistSync';
import { Header } from './components/Header';
import { DeviceNameSettings } from './components/DeviceNameSettings';
import { DEVICE_SUFFIX_STORAGE_KEY, getStoredDeviceSuffix, getSpotifyDeviceName } from './utils/deviceName';
import { SoundstageHero } from './components/SoundstageHero';
import { PlaylistGrid } from './components/PlaylistGrid';
import { SidebarRight } from './components/SidebarRight';
import { BottomPlayer } from './components/BottomPlayer';
import { RequestModal } from './components/RequestModal';
import { PlaylistDetailModal } from './components/PlaylistDetailModal';
import { SearchResultsPanel } from './components/SearchResultsPanel';
import { AlbumDetailModal } from './components/AlbumDetailModal';
import { ArtistPopularModal } from './components/ArtistPopularModal';
import { SpotifyChooserModal, SpotifyItemTarget } from './components/SpotifyChooserModal';
import { PairingGuideModal } from './components/PairingGuideModal';
import { INITIAL_TIME_SLOTS, INITIAL_REQUESTS, getTrackCover } from './data';
import { Track, Playlist, TimeSlot, RequestTicket, Language, Theme, SpotifyWebPlaybackPlayer, AlbumDetail, ArtistDetail, ShuffleMode, RepeatMode } from './types';
import { getActivePlaylistId, getUpcomingPlaylistQueue } from './utils/tracks';
import {
  getSpotifyUserAuthUrl,
  checkAndStoreUserTokenFromUrl,
  getSpotifyUserToken,
  refreshSpotifyUserToken,
  fetchSpotifySearchTracks,
  fetchSpotifyTrackAudioFeatures,
  fetchSpotifyAlbum,
  fetchSpotifyPlaylistMeta,
  fetchSpotifyArtist,
  fetchSpotifyArtistTopTracks,
  SONIC_CATEGORY_QUERIES,
  fetchSpotifyCurrentUser,
  transferSpotifyPlayback,
  startSpotifyPlayback,
  addSpotifyTrackToQueue,
  pauseSpotifyPlayback,
  seekSpotifyPlayback,
  skipToNextSpotifyTrack,
  skipToPreviousSpotifyTrack,
  setSpotifyRepeatMode,
  setSpotifyShuffle,
  setSpotifyVolume,
  getCurrentSlotKey,
  SPOTIFY_SCOPE_VERSION,
  SpotifyApiError,
} from './utils/spotify';

function getCurrentTimeSlotId(): string {
  return `slot-${getCurrentSlotKey()}`;
}

function getInitialTimeSlots(): TimeSlot[] {
  const currentSlotId = getCurrentTimeSlotId();
  return INITIAL_TIME_SLOTS.map((slot) => ({
    ...slot,
    isCurrentSlot: slot.id === currentSlotId,
    // public/music/playlists.json is the authoritative Spotify configuration.
    // The seed data remains available for layout/metadata fallbacks only.
    playlists: slot.playlists.map(({ spotifyId: _obsoleteSpotifyId, ...playlist }) => playlist),
  }));
}

type PlaylistManifestEntry = {
  id: string;
  trackCount?: number;
  durationSec?: number;
};

const playlistDurationLabel = (seconds: number) =>
  `${Math.floor(seconds / 3600)}H ${Math.floor((seconds % 3600) / 60)}M`;

/** Ensure only one playlist is marked isNowPlaying (matches activePlaylistId). */
function withExclusiveNowPlaying(slots: TimeSlot[], activeId: string): TimeSlot[] {
  let changed = false;
  const next = slots.map((slot) => ({
    ...slot,
    playlists: slot.playlists.map((playlist) => {
      const isNowPlaying = playlist.id === activeId;
      if (playlist.isNowPlaying !== isNowPlaying) changed = true;
      return playlist.isNowPlaying === isNowPlaying ? playlist : { ...playlist, isNowPlaying };
    }),
  }));
  return changed ? next : slots;
}

function toAppTrack(track: any, fallbackCover = '', previousTrack?: Track): Track {
  const spotifyId = track.id || track.spotifyId;
  const durationSec = Math.floor((track.duration_ms || track.durationSec * 1000 || 0) / 1000);
  const artistId = track.artists?.[0]?.id || track.artistId || previousTrack?.artistId;
  const albumId = track.album?.id || track.albumId || previousTrack?.albumId;
  return {
    id: spotifyId ? `spotify-${spotifyId}` : track.id || `local-${Date.now()}`,
    spotifyId,
    title: track.name || track.title,
    artist: track.artists?.map((artist: { name: string }) => artist.name).join(', ') || track.artist || 'Unknown Artist',
    artistId,
    album: track.album?.name || track.album || 'Spotify Playback',
    albumId,
    albumType: track.album?.album_type || track.albumType || previousTrack?.albumType,
    releaseDate: track.album?.release_date || track.releaseDate || previousTrack?.releaseDate,
    duration: track.duration || `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`,
    durationSec,
    coffeePairing: track.coffeePairing || previousTrack?.coffeePairing,
    genre: track.genre || 'Spotify Web Playback',
    coverUrl: track.album?.images?.[0]?.url || track.coverUrl || fallbackCover,
    canvasUrl: track.canvasUrl || (spotifyId && previousTrack?.spotifyId === spotifyId ? previousTrack.canvasUrl : undefined),
    audioFeatures: track.audioFeatures || (previousTrack?.spotifyId === spotifyId && previousTrack.audioFeaturesSource === 'worker' ? previousTrack.audioFeatures : undefined),
    audioFeaturesSource: track.audioFeatures ? 'worker' : previousTrack?.spotifyId === spotifyId && previousTrack.audioFeaturesSource === 'worker' ? 'worker' : undefined,
  };
}

function spotifyPlaylistTrackToAppTrack(track: {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumId?: string;
  albumType?: string;
  releaseDate?: string;
  durationSec: number;
  coverUrl: string;
  canvasUrl?: string;
  audioFeatures?: Track['audioFeatures'];
}): Track {
  return {
    id: `spotify-${track.id}`,
    spotifyId: track.id,
    title: track.title,
    artist: track.artist,
    artistId: track.artistId,
    album: track.album,
    albumId: track.albumId,
    albumType: track.albumType,
    releaseDate: track.releaseDate,
    duration: `${Math.floor(track.durationSec / 60)}:${String(track.durationSec % 60).padStart(2, '0')}`,
    durationSec: track.durationSec,
    coverUrl: track.coverUrl,
    canvasUrl: track.canvasUrl,
    audioFeatures: track.audioFeatures,
    audioFeaturesSource: track.audioFeatures ? 'worker' : undefined,
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
const THEME_STORAGE_KEY = 'gate7_theme';
const LANGUAGE_STORAGE_KEY = 'gate7_language';

interface PersistedPlaybackState {
  track: Track;
  playbackSec: number;
  isPlaying: boolean;
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
}

function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'vi';
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return savedLanguage === 'en' || savedLanguage === 'vi' ? savedLanguage : 'vi';
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
  const [currentTrack, setCurrentTrack] = useState<Track>(() => {
    // Always re-read from localStorage at mount time so a new tab picks up
    // the last track written by a previous session.
    const fresh = getPersistedPlaybackState();
    return fresh?.track || EMPTY_SPOTIFY_TRACK;
  });
  const currentTrackRef = useRef(currentTrack);
  const [isPlaying, setIsPlaying] = useState<boolean>(() => getPersistedPlaybackState()?.isPlaying ?? false);
  const [playbackSec, setPlaybackSec] = useState<number>(() => getPersistedPlaybackState()?.playbackSec ?? 0);
  const [likesCount, setLikesCount] = useState<number>(46);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [playbackPlaylistId, setPlaybackPlaylistId] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(getInitialTimeSlots);
  const timeSlotsRef = useRef(timeSlots);
  const [requestQueue, setRequestQueue] = useState<RequestTicket[]>(INITIAL_REQUESTS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string>();
  const [desktopSearchFocusRequest, setDesktopSearchFocusRequest] = useState(0);
  const [activeFilterTag, setActiveFilterTag] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(72);
  const volumeBeforeMuteRef = useRef(72);
  const [shuffleMode, setShuffleMode] = useState<ShuffleMode>('off');
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [playbackContextName, setPlaybackContextName] = useState<string>('');
  const [playbackContextUri, setPlaybackContextUri] = useState<string>('');
  const playbackContextUriRef = useRef('');
  // Browsing a playlist never changes playback. Prefer the actual Spotify
  // context, then match the current song against the loaded playlist tracks.
  const playlists = timeSlots.flatMap((slot) => slot.playlists);
  const contextPlaylistId = playbackContextUri.startsWith('spotify:playlist:')
    ? playbackContextUri.split(':').pop()
    : undefined;
  const activePlaylistId = currentTrack.spotifyId
    ? getActivePlaylistId(playlists, currentTrack, contextPlaylistId, playbackPlaylistId)
    : '';
  const activePlaylist = playlists.find((playlist) => playlist.id === activePlaylistId);
  const activePlaylistIdRef = useRef(activePlaylistId);

  const [albumModal, setAlbumModal] = useState<AlbumDetail | null>(null);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [isAlbumLoading, setIsAlbumLoading] = useState(false);
  const [albumError, setAlbumError] = useState<string>();
  const [artistModal, setArtistModal] = useState<ArtistDetail | null>(null);
  const [isArtistModalOpen, setIsArtistModalOpen] = useState(false);
  const [isArtistLoading, setIsArtistLoading] = useState(false);
  const [artistError, setArtistError] = useState<string>();
  const [language, setLanguage] = useState<Language>(getStoredLanguage);
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [spotifyAuthStatus, setSpotifyAuthStatus] = useState<'idle' | 'connected' | 'failed'>('idle');
  const [spotifyDesktopStatus, setSpotifyDesktopStatus] = useState<string>('');
  const [spotifySource, setSpotifySource] = useState<'desktop' | 'web'>('web');
  const [spotifyQueue, setSpotifyQueue] = useState<Track[]>([]);
  const [spotifyUserProfile, setSpotifyUserProfile] = useState<{
    id: string;
    displayName: string;
    profileUrl: string;
    imageUrl?: string;
  } | null>(null);
  const [isAudioFeaturesLoading, setIsAudioFeaturesLoading] = useState(false);
  const spotifyPlayerRef = useRef<SpotifyWebPlaybackPlayer | null>(null);
  const [deviceSuffix, setDeviceSuffix] = useState(getStoredDeviceSuffix);
  const deviceSuffixRef = useRef(deviceSuffix);
  const handleSaveDeviceSuffix = async (suffix: string) => {
    await spotifyPlayerRef.current?.setName(getSpotifyDeviceName(suffix));
    localStorage.setItem(DEVICE_SUFFIX_STORAGE_KEY, suffix);
    deviceSuffixRef.current = suffix;
    setDeviceSuffix(suffix);
  };
  const spotifyDeviceIdRef = useRef<string | null>(null);
  const pendingRestoreRef = useRef<PersistedPlaybackState | null>(persistedPlayback);
  const isLocalPlaybackActiveRef = useRef(false);
  const heroSectionRef = useRef<HTMLDivElement | null>(null);
  const previousTrackIdentityRef = useRef(currentTrack.spotifyId || currentTrack.id);
  const [showBottomPlayer, setShowBottomPlayer] = useState(false);
  const [spotifyPlayerReady, setSpotifyPlayerReady] = useState(false);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    timeSlotsRef.current = timeSlots;
  }, [timeSlots]);

  useEffect(() => {
    activePlaylistIdRef.current = activePlaylistId;
    setTimeSlots((slots) => withExclusiveNowPlaying(slots, activePlaylistId));
  }, [activePlaylistId]);

  useEffect(() => {
    playbackContextUriRef.current = playbackContextUri;
  }, [playbackContextUri]);

  const resolvePlaybackContext = useCallback(async (contextUri?: string | null, fallbackName?: string) => {
    const uri = contextUri || '';
    // The SDK can emit several state events for one track/context. Metadata is
    // already resolved (or being resolved) for this URI, so never turn those
    // events into repeated Spotify Web API requests.
    if (uri === playbackContextUriRef.current) {
      if (fallbackName) setPlaybackContextName((name) => name || fallbackName);
      return;
    }
    setPlaybackContextUri(uri);
    playbackContextUriRef.current = uri;

    if (uri.startsWith('spotify:playlist:')) {
      const playlistId = uri.split(':').pop();
      if (!playlistId) return;
      if (fallbackName) setPlaybackContextName(fallbackName);
      try {
        const meta = await fetchSpotifyPlaylistMeta(playlistId);
        if (meta?.name) setPlaybackContextName(meta.name);
      } catch {
        // Keep fallback / previous name.
      }
      return;
    }

    if (fallbackName) setPlaybackContextName(fallbackName);
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

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

  useEffect(() => {
    const heroSection = heroSectionRef.current;
    if (!heroSection) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowBottomPlayer(!entry.isIntersecting),
      { rootMargin: '-72px 0px 0px 0px' },
    );
    observer.observe(heroSection);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const trackIdentity = currentTrack.spotifyId || currentTrack.id;
    if (trackIdentity === previousTrackIdentityRef.current) return;

    previousTrackIdentityRef.current = trackIdentity;
    heroSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentTrack.id, currentTrack.spotifyId]);

  // Load playlists from JSON
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/music/playlists.json').then((res) => {
        if (!res.ok) throw new Error(`Playlist configuration request failed (${res.status})`);
        return res.json();
      }),
      fetch('/api/playlists/manifest')
        .then((res) => res.ok ? res.json() : { playlists: [] })
        .catch(() => ({ playlists: [] })),
    ])
      .then(([data, manifest]) => {
        if (cancelled) return;
        const published = new Map<string, PlaylistManifestEntry>(
          (Array.isArray(manifest?.playlists) ? manifest.playlists : [])
            .filter((entry: PlaylistManifestEntry) => entry && typeof entry.id === 'string')
            .map((entry: PlaylistManifestEntry) => [entry.id, entry]),
        );
        const langData = data[language === 'vi' ? 'vn' : 'us'] || data['us'];
        setTimeSlots((prev) => {
          const merged = prev.map((slot) => {
            let slotKey = '';
            if (slot.id === 'slot-morning') slotKey = 'morning';
            else if (slot.id === 'slot-afternoon') slotKey = 'afternoon';
            else if (slot.id === 'slot-lunch') slotKey = 'lunch';
            else if (slot.id === 'slot-evening') slotKey = 'evening';

            const jsonPlaylists = langData[slotKey];
            if (jsonPlaylists && Array.isArray(jsonPlaylists)) {
              const newPlaylists = jsonPlaylists.map((jsonPl, index) => {
                const existingPl = slot.playlists.find((p) => p.spotifyId === jsonPl.id) || slot.playlists[index];
                const summary = published.get(jsonPl.id);
                const trackCount = typeof summary?.trackCount === 'number'
                  ? summary.trackCount
                  : existingPl?.spotifyId === jsonPl.id ? existingPl.trackCount : 0;
                const duration = typeof summary?.durationSec === 'number'
                  ? playlistDurationLabel(summary.durationSec)
                  : existingPl?.spotifyId === jsonPl.id ? existingPl.duration : '0H 0M';
                
                return {
                  id: existingPl?.id || `pl-${jsonPl.id}`,
                  spotifyId: jsonPl.id,
                  title: jsonPl.name,
                  slotId: slot.id,
                  slotName: existingPl?.slotName || slot.timeRange,
                  description: existingPl?.description || 'Tuyển chọn từ Spotify.',
                  trackCount,
                  duration,
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
          return withExclusiveNowPlaying(merged, activePlaylistIdRef.current);
        });
      })
      .catch((err) => console.error('Failed to load playlists.json:', err));
    return () => { cancelled = true; };
  }, [language]);

  // Spotify Chooser Modal state
  const [spotifyChooserTarget, setSpotifyChooserTarget] = useState<SpotifyItemTarget | null>(null);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Modal States
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);
  const [selectedPlaylistForModal, setSelectedPlaylistForModal] = useState<Playlist | null>(null);
  const loadPlaylistTracks = usePlaylistSync({
    setSlots: setTimeSlots,
    setSelected: setSelectedPlaylistForModal,
    mapTrack: spotifyPlaylistTrackToAppTrack,
  });
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

  // Load the signed-in Spotify profile for the footer social link.
  useEffect(() => {
    if (spotifyAuthStatus !== 'connected') return;
    let cancelled = false;
    void fetchSpotifyCurrentUser().then((profile) => {
      if (!cancelled && profile) setSpotifyUserProfile(profile);
    });
    return () => {
      cancelled = true;
    };
  }, [spotifyAuthStatus]);

  // Connect the Web Playback SDK and mirror its state into the page.
  useEffect(() => {
    if (spotifyAuthStatus !== 'connected') return;
    let script: HTMLScriptElement | null = null;
    let mounted = true;
    const initializePlayer = () => {
      if (!mounted || !window.Spotify || spotifyPlayerRef.current) return;
      const player = new window.Spotify.Player({
        name: getSpotifyDeviceName(deviceSuffixRef.current),
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
        setSpotifySource('web');
        setSpotifyDesktopStatus('');

        // Playback state comes from `player_state_changed`; until the SDK emits
        // it, restore the last local state instead of querying /v1/me/player.
        const saved = getPersistedPlaybackState();
        if (saved?.track?.spotifyId) {
          setCurrentTrack(saved.track);
          setPlaybackSec(saved.playbackSec);
          setIsPlaying(false); // Cannot auto-resume; user must press Play
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
        setSpotifySource('web');
        pendingRestoreRef.current = null;
        const liveTrack = toAppTrack(
          state.track_window.current_track,
          currentTrackRef.current.coverUrl,
          currentTrackRef.current,
        );
        setCurrentTrack(liveTrack);
        setPlaybackSec(Math.floor((state.position || 0) / 1000));
        setIsPlaying(!state.paused);

        const currentId = state.track_window.current_track.id;
        const seen = new Set<string>();
        const sdkQueue = (state.track_window.next_tracks || [])
          .filter((track: any) => track?.id && track.type !== 'episode')
          .map((track: any) => toAppTrack(track))
          .filter((track: Track) => {
            if (!track.spotifyId || track.spotifyId === currentId || seen.has(track.spotifyId)) return false;
            seen.add(track.spotifyId);
            return true;
          });

        // Prefer Spotify playlist context so LIVE moves with the real source playlist.
        // Never mark every playlist that merely contains the track — that duplicates LIVE.
        const contextUri = state.context?.uri || '';
        const contextPlaylistId = contextUri.startsWith('spotify:playlist:')
          ? contextUri.split(':').pop()
          : undefined;
        const contextPlaylist = contextPlaylistId
          ? timeSlotsRef.current
              .flatMap((slot) => slot.playlists)
              .find((playlist) => playlist.spotifyId === contextPlaylistId)
          : undefined;
        setSpotifyQueue(contextPlaylist
          ? getUpcomingPlaylistQueue(sdkQueue, contextPlaylist.tracks, liveTrack)
          : sdkQueue.slice(0, 7));
        void resolvePlaybackContext(
          contextUri,
          contextUri.startsWith('spotify:album:')
            ? state.track_window.current_track.album?.name
            : undefined,
        );

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

  // The SDK emits track changes; read its local position for a smooth progress bar.
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
    const trackId = currentTrack.spotifyId;
    if (!trackId) {
      setIsAudioFeaturesLoading(false);
      return;
    }

    let cancelled = false;

    setIsAudioFeaturesLoading(true);
    if (currentTrack.audioFeaturesSource !== 'worker') {
      setCurrentTrack((prev) => {
        if (prev.spotifyId !== trackId || prev.audioFeaturesSource === 'worker') return prev;
        const { audioFeatures: _audioFeatures, audioFeaturesSource: _audioFeaturesSource, ...trackWithoutFeatures } = prev;
        return trackWithoutFeatures;
      });
    }

    fetchSpotifyTrackAudioFeatures(trackId).then((audioFeatures) => {
      if (cancelled || !audioFeatures) return;
      setCurrentTrack((prev) => prev.spotifyId === trackId
        ? { ...prev, audioFeatures, audioFeaturesSource: 'worker' }
        : prev);
    }).finally(() => {
      if (!cancelled) setIsAudioFeaturesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentTrack.spotifyId]);

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
    setIsLiked((prev) => !prev);
    setLikesCount((prev) => Math.max(0, prev + (isLiked ? -1 : 1)));
  };

  const handleSelectPlaylist = (playlist: Playlist) => {
    void loadPlaylistTracks(playlist);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(undefined);
    setIsSearchActive(false);
    setIsSearchLoading(false);
  };

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setSearchError(undefined);
      setIsSearchActive(false);
      setIsSearchLoading(false);
    }
  };

  const handleSearchSubmit = async (nextQuery = searchQuery) => {
    const query = nextQuery.trim();
    if (!query) return;
    setSearchQuery(query);

    const normalizedQuery = query.toLowerCase();
    const localTracks = timeSlots
      .flatMap((slot) => slot.playlists.flatMap((playlist) => playlist.tracks))
      .filter((track, index, tracks) => {
        const matches = `${track.title} ${track.artist} ${track.album || ''}`.toLowerCase().includes(normalizedQuery);
        return matches && tracks.findIndex((candidate) => candidate.id === track.id) === index;
      });

    setSearchResults(localTracks);
    setSearchError(undefined);
    setIsSearchActive(true);
    setIsSearchLoading(true);

    try {
      const spotifyTracks = await fetchSpotifySearchTracks(query);
      setSearchResults(spotifyTracks.map(spotifyPlaylistTrackToAppTrack));
    } catch (error) {
      if (localTracks.length === 0) {
        setSearchError(error instanceof Error ? error.message : 'Spotify search failed.');
      }
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleOpenCurrentAlbum = async () => {
    setSelectedPlaylistForModal(null);
    setIsArtistModalOpen(false);
    setIsAlbumModalOpen(true);
    setIsAlbumLoading(true);
    setAlbumError(undefined);

    try {
      const albumId = currentTrack.albumId;
      if (!albumId) {
        throw new Error(language === 'vi' ? 'Không tìm thấy album của bài hát này.' : 'Could not find this track’s album.');
      }

      const album = await fetchSpotifyAlbum(albumId);
      if (!album) throw new Error(language === 'vi' ? 'Không tải được album.' : 'Could not load album.');

      setAlbumModal({
        id: album.id,
        name: album.name,
        albumType: album.albumType,
        releaseDate: album.releaseDate,
        totalTracks: album.totalTracks,
        coverUrl: album.coverUrl,
        artists: album.artists,
        copyrights: album.copyrights,
        tracks: album.tracks.map(spotifyPlaylistTrackToAppTrack),
      });
    } catch (error) {
      setAlbumModal(null);
      setAlbumError(error instanceof Error ? error.message : 'Could not load album.');
    } finally {
      setIsAlbumLoading(false);
    }
  };

  const handleOpenCurrentArtist = async () => {
    setSelectedPlaylistForModal(null);
    setIsAlbumModalOpen(false);
    setIsArtistModalOpen(true);
    setIsArtistLoading(true);
    setArtistError(undefined);

    try {
      const artistId = currentTrack.artistId;
      if (!artistId) {
        throw new Error(language === 'vi' ? 'Không tìm thấy nghệ sĩ của bài hát này.' : 'Could not find this track’s artist.');
      }

      const artist = await fetchSpotifyArtist(artistId);
      if (!artist) throw new Error(language === 'vi' ? 'Không tải được nghệ sĩ.' : 'Could not load artist.');

      const topTracks = await fetchSpotifyArtistTopTracks(artistId, artist.name);

      setArtistModal({
        id: artist.id,
        name: artist.name,
        imageUrl: artist.imageUrl,
        followers: artist.followers,
        tracks: topTracks.map(spotifyPlaylistTrackToAppTrack),
      });
    } catch (error) {
      setArtistModal(null);
      setArtistError(error instanceof Error ? error.message : 'Could not load artist.');
    } finally {
      setIsArtistLoading(false);
    }
  };

  const startPlaybackWithBody = async (playbackBody: Record<string, unknown>, fallbackTrack?: Track): Promise<boolean> => {
    const player = spotifyPlayerRef.current;
    const deviceId = spotifyDeviceIdRef.current;

    if (player && deviceId) {
      try {
        await player.activateElement();
        const transferred = await transferSpotifyPlayback(deviceId, false);
        if (!transferred) {
          setSpotifyDesktopStatus('Spotify browser player is unavailable');
          return false;
        }
        const started = await startSpotifyPlayback(deviceId, playbackBody);
        if (!started) {
          setSpotifyDesktopStatus('Spotify rejected this playback request');
          return false;
        }
        pendingRestoreRef.current = null;
        if (fallbackTrack) {
          setCurrentTrack(fallbackTrack);
          setPlaybackSec(0);
          setIsPlaying(true);
        }
        return true;
      } catch (error) {
        console.warn('Could not start Spotify playback via SDK:', error);
      }
    }

    try {
      const started = await startSpotifyPlayback(deviceId || undefined, playbackBody);
      if (!started) throw new Error('Spotify rejected this playback request');
      if (fallbackTrack) {
        setCurrentTrack(fallbackTrack);
        setPlaybackSec(0);
        setIsPlaying(true);
      }
      return true;
    } catch (error) {
      console.warn('Could not start Spotify playback:', error);
      setSpotifyDesktopStatus('Spotify player is still connecting');
      return false;
    }
  };

  const handlePlaySpecificTrack = async (track: Track, playlist: Playlist) => {
    // Only use context_uri for real Spotify playlists (not synthetic ones like
    // search results whose spotifyId is a local key, not a real Spotify ID).
    const isRealSpotifyPlaylist = playlist.spotifyId
      && playlist.spotifyId !== 'search-results'
      && !playlist.spotifyId.startsWith('pl-')
      && !playlist.spotifyId.startsWith('album-')
      && !playlist.spotifyId.startsWith('artist-')
      && playlist.spotifyId.length > 10;

    const playbackBody: Record<string, unknown> = isRealSpotifyPlaylist
      ? {
          context_uri: `spotify:playlist:${playlist.spotifyId}`,
          // Cached playlists can omit unavailable/local/episode items, so their
          // array index is not necessarily Spotify's playlist position. The URI
          // keeps the selected track and its following context aligned.
          offset: { uri: `spotify:track:${track.spotifyId}` },
        }
      : { uris: [`spotify:track:${track.spotifyId}`] };

    if (!track.spotifyId) {
      setSpotifyDesktopStatus('No Spotify ID for this track');
      return;
    }

    const started = await startPlaybackWithBody(playbackBody, track);
    if (!started) return;

    setPlaybackPlaylistId(playlist.id);
    setPlaybackContextName(playlist.title);
    if (isRealSpotifyPlaylist && playlist.spotifyId) {
      // Reflect the newly selected playlist immediately. The SDK replaces this
      // optimistic sequence with Spotify's authoritative queue on its next event.
      setSpotifyQueue(getUpcomingPlaylistQueue([], playlist.tracks, track));
      void resolvePlaybackContext(`spotify:playlist:${playlist.spotifyId}`, playlist.title);
    } else {
      // Single-track play has no playlist/album context. Clear the local queue so
      // Spotify autoplay duplicates of the same song do not fill "Next from".
      setPlaybackContextUri('');
      playbackContextUriRef.current = '';
      setSpotifyQueue([]);
    }
  };

  const handlePlaySearchTrack = async (track: Track, query: string, results: Track[]) => {
    if (!track.spotifyId) {
      setSpotifyDesktopStatus('No Spotify ID for this track');
      return;
    }

    const seen = new Set<string>([track.spotifyId]);
    const following = results.filter((candidate) => {
      if (!candidate.spotifyId || seen.has(candidate.spotifyId)) return false;
      seen.add(candidate.spotifyId);
      return true;
    });
    const selectedTrackUri = `spotify:track:${track.spotifyId}`;
    const started = await startPlaybackWithBody({ uris: [selectedTrackUri] }, track);
    if (!started) return;

    // A multi-URI play request can start at a different item when Spotify
    // shuffle is enabled. Start the clicked track alone, then build the queue.
    void (async () => {
      try {
        for (const candidate of following) {
          const queued = await addSpotifyTrackToQueue(
            `spotify:track:${candidate.spotifyId!}`,
            spotifyDeviceIdRef.current || undefined,
          );
          if (!queued) break;
        }
      } catch (error) {
        console.warn('Could not build Spotify search queue:', error);
      }
    })();

    setPlaybackPlaylistId('search-results');
    setPlaybackContextName(`Search: ${query}`);
    setPlaybackContextUri('');
    playbackContextUriRef.current = '';
    setSpotifyQueue(following);
  };

  const handlePlayAlbumTrack = async (track: Track, album: AlbumDetail) => {
    if (!track.spotifyId) return;
    const index = album.tracks.findIndex((candidate) => candidate.spotifyId === track.spotifyId);
    await startPlaybackWithBody({
      context_uri: `spotify:album:${album.id}`,
      ...(index >= 0 ? { offset: { position: index } } : {}),
    }, track);
    void resolvePlaybackContext(`spotify:album:${album.id}`, album.name);
  };

  const handlePlayAlbum = async (album: AlbumDetail) => {
    const first = album.tracks[0];
    if (!first?.spotifyId) return;
    await startPlaybackWithBody({
      context_uri: `spotify:album:${album.id}`,
    }, first);
    void resolvePlaybackContext(`spotify:album:${album.id}`, album.name);
  };

  const handlePlayArtistTrack = async (track: Track, artist: ArtistDetail) => {
    if (!track.spotifyId) return;
    const uris = artist.tracks
      .filter((candidate) => candidate.spotifyId)
      .map((candidate) => `spotify:track:${candidate.spotifyId}`);
    const offset = Math.max(0, artist.tracks.findIndex((candidate) => candidate.spotifyId === track.spotifyId));
    await startPlaybackWithBody({
      uris,
      offset: { position: offset },
    }, track);
    setPlaybackContextName(artist.name);
    setPlaybackContextUri('');
    playbackContextUriRef.current = '';
  };

  const handlePlayArtist = async (artist: ArtistDetail) => {
    const first = artist.tracks[0];
    if (!first?.spotifyId) return;
    const uris = artist.tracks
      .filter((candidate) => candidate.spotifyId)
      .map((candidate) => `spotify:track:${candidate.spotifyId}`);
    await startPlaybackWithBody({ uris }, first);
    setPlaybackContextName(artist.name);
    setPlaybackContextUri('');
    playbackContextUriRef.current = '';
  };

  const handlePlayQueueTrack = async (track: Track) => {
    if (!track.spotifyId) return;
    const trackUri = `spotify:track:${track.spotifyId}`;
    const queueIndex = spotifyQueue.findIndex((item) => item.spotifyId === track.spotifyId);
    if (queueIndex < 0) return;

    const contextUri = playbackContextUriRef.current || playbackContextUri;
    let started = false;

    // Prefer jumping inside the active playlist/album so Spotify keeps "Next from" intact.
    if (contextUri.startsWith('spotify:playlist:') || contextUri.startsWith('spotify:album:')) {
      started = await startPlaybackWithBody({
        context_uri: contextUri,
        offset: { uri: trackUri },
      }, track);
    }

    // Fallback: continue from the clicked queue item through the rest of the queue.
    // Keep the existing context name/URI label even if Spotify session becomes URI-based.
    if (!started) {
      const remaining = spotifyQueue
        .slice(queueIndex)
        .filter((item) => item.spotifyId)
        .map((item) => `spotify:track:${item.spotifyId!}`);
      started = await startPlaybackWithBody({
        uris: remaining.length > 0 ? remaining : [trackUri],
      }, track);
    }

    if (!started) return;

    setSpotifyQueue((previous) => {
      const index = previous.findIndex((item) => item.spotifyId === track.spotifyId);
      return index >= 0 ? previous.slice(index + 1) : previous;
    });
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

  const handleFilterSimilarSongs = async (sonicCategory: string) => {
    // Use the first (most descriptive) query for this sonic category as the
    // search text so the user sees and can edit the actual Spotify query.
    const queries = SONIC_CATEGORY_QUERIES[sonicCategory];
    const searchText = queries?.[0] ?? sonicCategory;
    await handleSearchSubmit(searchText);
  };

  const handleToggleShuffle = async () => {
    // Spotify Web API cannot enable Smart Shuffle; we mirror the official
    // off ↔ shuffle toggle and surface Smart Shuffle when Spotify reports it.
    const nextEnabled = shuffleMode === 'off';
    try {
      const changed = await setSpotifyShuffle(nextEnabled, spotifyDeviceIdRef.current || undefined);
      if (!changed) throw new Error('Spotify rejected the shuffle request');
      setShuffleMode(nextEnabled ? 'shuffle' : 'off');
    } catch (error) {
      console.warn('Could not change Spotify shuffle:', error);
    }
  };

  const handleToggleRepeat = async () => {
    const next: RepeatMode = repeatMode === 'off'
      ? 'context'
      : repeatMode === 'context'
        ? 'track'
        : 'off';
    try {
      const changed = await setSpotifyRepeatMode(next, spotifyDeviceIdRef.current || undefined);
      if (!changed) throw new Error('Spotify rejected the repeat request');
      setRepeatMode(next);
    } catch (error) {
      console.warn('Could not change Spotify repeat mode:', error);
    }
  };

  const handleChangeVolume = (nextVolume: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(nextVolume)));
    if (clamped > 0) volumeBeforeMuteRef.current = clamped;
    setVolume(clamped);
  };

  const handleMuteToggle = () => {
    if (volume > 0) {
      volumeBeforeMuteRef.current = volume;
      setVolume(0);
      return;
    }
    setVolume(volumeBeforeMuteRef.current > 0 ? volumeBeforeMuteRef.current : 80);
  };

  const isLight = theme === 'light';

  return (
    <div
      className={`font-sans antialiased min-h-screen flex flex-col selection:bg-[#FEBC11] selection:text-black transition-colors duration-200 overflow-x-clip touch-manipulation ${
        isLight ? 'bg-[#F7F7F4] text-black' : 'bg-[#121214] text-gray-100'
      }`}
    >
      {/* Top Ticker & Sticky Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={handleSearchQueryChange}
        onClearSearch={handleClearSearch}
        onSearchSubmit={() => {
          setDesktopSearchFocusRequest((request) => request + 1);
          void handleSearchSubmit();
        }}
        onRequestClick={() => setIsRequestModalOpen(true)}
        onBoothClick={() => setIsPairingModalOpen(true)}
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 space-y-8 pb-28 md:pb-36">
        {/* Hero Section: Live Soundstage Booth — always visible */}
        <div ref={heroSectionRef}>
          <SoundstageHero
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onNextTrack={handleNextTrack}
            onPrevTrack={handlePrevTrack}
            isLiked={isLiked}
            onToggleLike={handleToggleLike}
            shuffleMode={shuffleMode}
            onToggleShuffle={handleToggleShuffle}
            repeatMode={repeatMode}
            onToggleRepeat={handleToggleRepeat}
            playbackSec={playbackSec}
            onSeek={handleSeek}
            onPairingClick={() => setIsPairingModalOpen(true)}
            activePlaylist={activePlaylist}
            onPlaylistClick={handleSelectPlaylist}
            spotifyDesktopStatus={spotifyDesktopStatus}
            spotifySource={spotifySource}
            isAudioFeaturesLoading={isAudioFeaturesLoading}
            language={language}
            theme={theme}
          />
        </div>

        {/* Playlists and the current time slot use the full content width. */}
        <div className="space-y-8">
          <div>
            {isSearchActive ? (
              <SearchResultsPanel
                query={searchQuery}
                tracks={searchResults}
                isLoading={isSearchLoading}
                error={searchError}
                currentTrackId={currentTrack.id}
                isPlaying={isPlaying}
                onClear={handleClearSearch}
                autoFocus
                autoFocusDesktopOnly
                focusRequestKey={desktopSearchFocusRequest}
                onSearch={(query) => void handleSearchSubmit(query)}
                onPlayTrack={(track) => {
                  void handlePlaySearchTrack(track, searchQuery, searchResults);
                }}
                language={language}
                theme={theme}
              />
            ) : (
              <PlaylistGrid
                timeSlots={timeSlots}
                activePlaylistId={activePlaylistId}
                currentTrack={currentTrack}
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
            )}
          </div>

          <div>
            <SidebarRight
              requestQueue={requestQueue}
              onRequestClick={() => setIsRequestModalOpen(true)}
              onSearchClick={() => setIsMobileSearchOpen(true)}
              onSpotifyClick={() => handleOpenSpotify()}
              activeFilterTag={activeFilterTag}
              onToggleFilterTag={handleToggleFilterTag}
              onDNAFeatureClick={handleDNAFeatureClick}
              language={language}
              theme={theme}
            />
          </div>
        </div>

        <DeviceNameSettings
          suffix={deviceSuffix}
          onSave={handleSaveDeviceSuffix}
          language={language}
          theme={theme}
        />

        {/* Footer */}
        <footer
          className={`pt-8 pb-4 border-t-2 flex flex-col md:flex-row items-center justify-between text-xs font-bold gap-4 transition-colors ${
            isLight ? 'border-black text-gray-700' : 'border-[#2A2A34] text-gray-400'
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className={isLight ? 'text-black' : 'text-white'}>© 2026 Gate 7 Coffee Roastery.</span>
            <span>•</span>
            <span>music.gate7.vn • {language === 'vi' ? 'music as you are' : 'music as you are'}</span>
          </div>

          <div className={`flex items-center gap-4 text-base ${isLight ? 'text-black' : 'text-gray-300'}`}>
            <a
              href="https://facebook.com/gate7.coffee"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#FEBC11] transition-colors"
              title="Facebook"
            >
              <i className="fa-brands fa-facebook"></i>
            </a>
            <a
              href="https://www.instagram.com/gate7.coffee"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#FEBC11] transition-colors"
              title="Instagram"
            >
              <i className="fa-brands fa-instagram"></i>
            </a>
            <button
              onClick={() => {
                if (spotifyUserProfile) {
                  handleOpenSpotify({
                    type: 'user',
                    id: spotifyUserProfile.id,
                    name: spotifyUserProfile.displayName,
                    coverUrl: spotifyUserProfile.imageUrl,
                  });
                  return;
                }
                window.open('https://open.spotify.com/', '_blank', 'noopener,noreferrer');
              }}
              className="hover:text-[#1DB954] transition-colors cursor-pointer"
              title={spotifyUserProfile ? spotifyUserProfile.displayName : 'Spotify'}
            >
              <i className="fa-brands fa-spotify"></i>
            </button>
            <a
              href="https://www.tiktok.com/@gate.7.coffee"
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

      {showBottomPlayer && (
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
          shuffleMode={shuffleMode}
          onToggleShuffle={handleToggleShuffle}
          repeatMode={repeatMode}
          onToggleRepeat={handleToggleRepeat}
          volume={volume}
          onChangeVolume={handleChangeVolume}
          onMuteToggle={handleMuteToggle}
          onOpenAlbum={() => void handleOpenCurrentAlbum()}
          onOpenArtist={() => void handleOpenCurrentArtist()}
          onOpenSpotify={() => handleOpenSpotify()}
          onPlayQueueTrack={(track) => void handlePlayQueueTrack(track)}
          spotifyQueue={spotifyQueue}
          language={language}
          theme={theme}
          isAudioFeaturesLoading={isAudioFeaturesLoading}
          contextName={playbackContextName}
        />
      )}

      {/* Modals & Screens */}
      <RequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSubmitRequest={handleSubmitRequest}
        language={language}
        theme={theme}
      />

      <PlaylistDetailModal
        playlist={selectedPlaylistForModal}
        isOpen={!!selectedPlaylistForModal}
        onClose={() => setSelectedPlaylistForModal(null)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayTrack={(track, pl) => handlePlaySpecificTrack(track, pl)}
        onRetry={() => {
          if (selectedPlaylistForModal) void loadPlaylistTracks(selectedPlaylistForModal);
        }}
        onOpenSpotify={(target) => handleOpenSpotify(target)}
        language={language}
        theme={theme}
      />

      <AlbumDetailModal
        album={albumModal}
        isOpen={isAlbumModalOpen}
        isLoading={isAlbumLoading}
        error={albumError}
        currentTrackId={currentTrack.id}
        isPlaying={isPlaying}
        onClose={() => {
          setIsAlbumModalOpen(false);
          setAlbumError(undefined);
        }}
        onPlayTrack={(track, album) => void handlePlayAlbumTrack(track, album)}
        onPlayAlbum={(album) => void handlePlayAlbum(album)}
        language={language}
        theme={theme}
      />

      <ArtistPopularModal
        artist={artistModal}
        isOpen={isArtistModalOpen}
        isLoading={isArtistLoading}
        error={artistError}
        currentTrackId={currentTrack.id}
        isPlaying={isPlaying}
        onClose={() => {
          setIsArtistModalOpen(false);
          setArtistError(undefined);
        }}
        onPlayTrack={(track, artist) => void handlePlayArtistTrack(track, artist)}
        onPlayArtist={(artist) => void handlePlayArtist(artist)}
        language={language}
        theme={theme}
      />

      {/* Mobile search context window */}
      {isMobileSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-3 pt-16 backdrop-blur-sm md:hidden"
          role="presentation"
          onClick={() => setIsMobileSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl"
            role="dialog"
            aria-modal="true"
            aria-label={language === 'vi' ? 'Tìm kiếm' : 'Search'}
            onClick={(event) => event.stopPropagation()}
          >
            <SearchResultsPanel
              query={searchQuery}
              tracks={searchResults}
              isLoading={isSearchLoading}
              error={searchError}
              currentTrackId={currentTrack.id}
              isPlaying={isPlaying}
              onClear={handleClearSearch}
              onClose={() => setIsMobileSearchOpen(false)}
              autoFocus
              onSearch={(query) => void handleSearchSubmit(query)}
              onPlayTrack={(track) => void handlePlaySearchTrack(track, searchQuery, searchResults)}
              language={language}
              theme={theme}
            />
          </div>
        </div>
      )}

      {/* Spotify Chooser Modal (Desktop App or Web Browser) */}
      <SpotifyChooserModal
        isOpen={!!spotifyChooserTarget}
        onClose={() => setSpotifyChooserTarget(null)}
        target={spotifyChooserTarget}
        language={language}
        theme={theme}
      />

      <PairingGuideModal
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        onSelectGenre={handleSelectGenreFilter}
        onFilterSimilarSongs={handleFilterSimilarSongs}
        language={language}
        currentTrack={currentTrack}
        theme={theme}
      />
    </div>
  );
}
