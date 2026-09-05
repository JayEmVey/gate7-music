// Gate 7 Coffee Roastery - Spotify Web API Integration
// User authentication uses OAuth Authorization Code with PKCE.

export const SPOTIFY_CONFIG = {
  clientId: 'be83df152a954a5fbe64cd9f065cb832',
  scopes: 'streaming user-read-currently-playing user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative',
};

export const SPOTIFY_SCOPE_VERSION = 'web-playback-playlists-v2';

const PKCE_VERIFIER_KEY = 'spotify_pkce_verifier';
const PKCE_STATE_KEY = 'spotify_oauth_state';
const PKCE_REDIRECT_URI_KEY = 'spotify_oauth_redirect_uri';
const RAPIDAPI_HOST = 'spotify-extended-audio-features-api.p.rapidapi.com';
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY?.trim();
let spotifyRequestQueue: Promise<unknown> = Promise.resolve();
let spotifyRateLimitUntil = 0;

function queueSpotifyRequest(request: () => Promise<Response>): Promise<Response> {
  const run = async () => {
    const delayMs = Math.max(0, spotifyRateLimitUntil - Date.now());
    if (delayMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
    const response = await request();
    if (response.status === 429) noteSpotifyRateLimit(response);
    return response;
  };
  const next = spotifyRequestQueue.then(run, run);
  spotifyRequestQueue = next.catch(() => undefined);
  return next;
}

function noteSpotifyRateLimit(response: Response): void {
  const retryAfter = Number(response.headers.get('Retry-After') || 0);
  const delaySeconds = Math.min(Math.max(retryAfter || 2, 1), 30);
  spotifyRateLimitUntil = Math.max(spotifyRateLimitUntil, Date.now() + delaySeconds * 1000);
}

function getRedirectUri(): string {
  const configuredUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI?.trim();
  // Spotify rejects `localhost` aliases for OAuth callbacks. Local development
  // must use the literal loopback IP; deployed builds use their HTTPS origin.
  if (import.meta.env.DEV) return configuredUri || 'https://127.0.0.1:3000/';
  return `${window.location.origin}/`;
}

function createRandomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function createCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export interface SpotifyAuthStatus {
  authenticated: boolean;
  token?: string;
  source: 'user_oauth' | 'cached' | 'error';
  error?: string;
}

export interface SpotifyItemTarget {
  type: 'playlist' | 'track';
  id: string;
  name: string;
  artist?: string;
  coverUrl?: string;
  slotName?: string;
}

export interface SpotifyLivePlaybackInfo {
  isPlaying: boolean;
  progressSec: number;
  durationSec: number;
  trackId: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  spotifyUri: string;
}

export interface SpotifyPlaylistTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSec: number;
  coverUrl: string;
  spotifyUri: string;
}

export interface SpotifyTrackAudioFeatures {
  acousticness: number;
  danceability: number;
  energy: number;
  instrumentalness: number;
  key: number;
  liveness: number;
  loudness: number;
  mode: number;
  tempo: number;
  valence: number;
}

export async function fetchSpotifySearchTracks(query: string): Promise<SpotifyPlaylistTrack[]> {
  const params = new URLSearchParams({
    q: query.trim(),
    type: 'track,artist',
    limit: '10',
    market: 'US',
  });
  const response = await spotifyFetch(`/search?${params.toString()}`);
  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body.error?.message || body.error?.reason || '';
    } catch {
      // Keep the status message when Spotify returns a non-JSON error body.
    }
    throw new SpotifyApiError(response.status, `Could not search Spotify (${response.status}${detail ? `: ${detail}` : ''})`);
  }
  const data = await response.json();
  return (data.tracks?.items || []).filter((item: any) => item?.id).map((item: any) => ({
    id: item.id,
    title: item.name,
    artist: item.artists?.map((artist: { name: string }) => artist.name).join(', ') || 'Unknown Artist',
    album: item.album?.name || '',
    durationSec: Math.floor((item.duration_ms || 0) / 1000),
    coverUrl: item.album?.images?.[0]?.url || '',
    spotifyUri: item.uri || `spotify:track:${item.id}`,
  }));
}

export async function fetchSpotifyTrackAudioFeatures(trackId: string): Promise<SpotifyTrackAudioFeatures | null> {
  if (!trackId || !RAPIDAPI_KEY) return null;

  try {
    const response = await fetch(`https://${RAPIDAPI_HOST}/v1/audio-features/${encodeURIComponent(trackId)}`, {
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || typeof data.tempo !== 'number') return null;

    return {
      acousticness: Number(data.acousticness ?? 0),
      danceability: Number(data.danceability ?? 0),
      energy: Number(data.energy ?? 0),
      instrumentalness: Number(data.instrumentalness ?? 0),
      key: Number(data.key ?? -1),
      liveness: Number(data.liveness ?? 0),
      loudness: Number(data.loudness ?? 0),
      mode: Number(data.mode ?? -1),
      tempo: Number(data.tempo),
      valence: Number(data.valence ?? 0),
    };
  } catch (error) {
    return null;
  }
}

export class SpotifyApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SpotifyApiError';
  }
}

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

/**
 * Diagnostic logger for Spotify Auth Flow
 */
export const spotifyDiagnostics = {
  log: (step: string, details?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[Spotify Auth Diagnostic] ${timestamp} | ${step}`, details ? details : '');
  }
};

/**
 * Constructs Spotify User OAuth URL for live playback reading (Authorization Code)
 */
export async function getSpotifyUserAuthUrl(redirectUri?: string): Promise<string> {
  const targetRedirect = redirectUri || getRedirectUri();
  const verifier = createRandomString(64);
  const state = createRandomString(32);
  const codeChallenge = await createCodeChallenge(verifier);

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);
  sessionStorage.setItem(PKCE_REDIRECT_URI_KEY, targetRedirect);
  
  const params = new URLSearchParams({
    client_id: SPOTIFY_CONFIG.clientId,
    response_type: 'code', // Switch to code flow since token flow is disabled/deprecated
    redirect_uri: targetRedirect,
    scope: SPOTIFY_CONFIG.scopes,
    show_dialog: 'true',
    state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });
  
  const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
  spotifyDiagnostics.log('Generated Auth URL (Auth Code Flow)', { targetRedirect, url });
  
  return url;
}

/**
 * Checks URL for Spotify authorization code and exchanges it for a token
 */
export async function checkAndStoreUserTokenFromUrl(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  spotifyDiagnostics.log('Checking URL for auth response', { search: window.location.search, hash: window.location.hash });
  
  const searchParams = new URLSearchParams(window.location.search);
  
  if (searchParams.has('error')) {
    spotifyDiagnostics.log('Auth error received from Spotify', searchParams.get('error'));
    return null;
  }

  const code = searchParams.get('code');
  if (!code) {
    spotifyDiagnostics.log('No authorization code found in URL');
    return null;
  }

  const returnedState = searchParams.get('state');
  const expectedState = sessionStorage.getItem(PKCE_STATE_KEY);
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  const targetRedirect = sessionStorage.getItem(PKCE_REDIRECT_URI_KEY) || getRedirectUri();
  if (!verifier || !expectedState || returnedState !== expectedState) {
    spotifyDiagnostics.log('OAuth state or PKCE verifier validation failed');
    return null;
  }

  spotifyDiagnostics.log('Authorization code found, exchanging for access token...');
  
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: targetRedirect,
        client_id: SPOTIFY_CONFIG.clientId,
        code_verifier: verifier,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      spotifyDiagnostics.log('Failed to exchange code for token', { status: response.status, error: errorText });
      return null;
    }

    const data: SpotifyTokenResponse = await response.json();
    if (data.access_token) {
      spotifyDiagnostics.log('Successfully exchanged code for access token', { expiresIn: data.expires_in });
      localStorage.setItem('spotify_user_token', data.access_token);
      localStorage.setItem('spotify_scope_version', SPOTIFY_SCOPE_VERSION);
      
      if (data.expires_in) {
        const expiresAt = Date.now() + Number(data.expires_in) * 1000;
        localStorage.setItem('spotify_user_token_expires_at', String(expiresAt));
      }
      
      // Also store refresh token if we want to use it later
      if (data.refresh_token) {
        localStorage.setItem('spotify_user_refresh_token', data.refresh_token);
      }
      
      // Clean URL without reload
      window.history.replaceState(null, '', window.location.pathname);
      sessionStorage.removeItem(PKCE_VERIFIER_KEY);
      sessionStorage.removeItem(PKCE_STATE_KEY);
      sessionStorage.removeItem(PKCE_REDIRECT_URI_KEY);
      if (window.opener) {
        window.opener.postMessage({ type: 'spotify-auth-complete' }, window.location.origin);
        window.close();
      }
      return data.access_token;
    }
  } catch (error) {
    spotifyDiagnostics.log('Error during token exchange', error);
  }
  
  return null;
}

/**
 * Returns saved Spotify User Token if valid
 */
export function getSpotifyUserToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('spotify_user_token');
  const expiresAt = Number(localStorage.getItem('spotify_user_token_expires_at') || 0);

  if (token) {
    if (expiresAt && Date.now() > expiresAt - 30000) {
      spotifyDiagnostics.log('Cached user token expired', { expiresAt });
      localStorage.removeItem('spotify_user_token');
      return null;
    }
    spotifyDiagnostics.log('Using cached valid user token');
    return token;
  }
  
  spotifyDiagnostics.log('No cached user token found');
  return null;
}

export async function refreshSpotifyUserToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem('spotify_user_refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: SPOTIFY_CONFIG.clientId,
      }).toString(),
    });
    if (!response.ok) return null;

    const data: SpotifyTokenResponse = await response.json();
    localStorage.setItem('spotify_user_token', data.access_token);
    localStorage.setItem('spotify_user_token_expires_at', String(Date.now() + data.expires_in * 1000));
    if (data.refresh_token) localStorage.setItem('spotify_user_refresh_token', data.refresh_token);
    return data.access_token;
  } catch (error) {
    console.warn('Could not refresh Spotify user token:', error);
    return null;
  }
}

async function spotifyFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token = getSpotifyUserToken();
  if (!token) token = await refreshSpotifyUserToken();
  if (!token) throw new Error('Spotify authentication required');

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  let response = await queueSpotifyRequest(() => fetch(`https://api.spotify.com/v1${path}`, { ...init, headers }));
  if (response.status === 401) {
    token = await refreshSpotifyUserToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      response = await queueSpotifyRequest(() => fetch(`https://api.spotify.com/v1${path}`, { ...init, headers }));
    }
    if (response.status === 401) {
      disconnectSpotifyUser();
    }
  }
  // Playlist hydration can issue many requests during startup. Honor Spotify's
  // retry hint and use bounded backoff so temporary rate limits do not become
  // permanent empty playlists.
  for (let attempt = 0; response.status === 429 && attempt < 3; attempt += 1) {
    noteSpotifyRateLimit(response);
    response = await queueSpotifyRequest(() => fetch(`https://api.spotify.com/v1${path}`, { ...init, headers }));
  }
  return response;
}

export async function fetchSpotifyPlaylistTracks(playlistId: string, playlistName?: string): Promise<SpotifyPlaylistTrack[]> {
  let resolvedPlaylistId = playlistId;
  let response = await spotifyFetch(`/playlists/${resolvedPlaylistId}/items?limit=50&offset=0`);

  // Playlist IDs in the editorial catalog can change. Resolve an old ID once by name
  // so a stale catalog entry does not leave the playlist permanently empty.
  if (response.status === 404 && playlistName) {
    const searchResponse = await spotifyFetch(`/search?q=${encodeURIComponent(playlistName)}&type=playlist&limit=1`);
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const replacementId = searchData.playlists?.items?.[0]?.id;
      if (replacementId) {
        resolvedPlaylistId = replacementId;
        response = await spotifyFetch(`/playlists/${resolvedPlaylistId}/items?limit=50&offset=0`);
      }
    }
  }

  const tracks: SpotifyPlaylistTrack[] = [];
  let offset = 0;
  let total = 0;
  do {
    if (offset > 0) {
      response = await spotifyFetch(`/playlists/${resolvedPlaylistId}/items?limit=50&offset=${offset}`);
    }
    if (!response.ok) {
      if (response.status === 403) {
        throw new SpotifyApiError(
          response.status,
          `Spotify cannot return items for playlist ${playlistId}. In Development Mode, the signed-in account must own the playlist or be a collaborator.`,
        );
      }
      throw new SpotifyApiError(response.status, `Could not load playlist ${playlistId} (${response.status} ${response.statusText})`);
    }
    const data = await response.json();
    for (const entry of data.items || []) {
      const item = entry.track || entry.item;
      if (!item?.id) continue;
      tracks.push({
        id: item.id,
        title: item.name,
        artist: item.artists?.map((artist: { name: string }) => artist.name).join(', ') || 'Unknown Artist',
        album: item.album?.name || '',
        durationSec: Math.floor((item.duration_ms || 0) / 1000),
        coverUrl: item.album?.images?.[0]?.url || '',
        spotifyUri: item.uri || `spotify:track:${item.id}`,
      });
    }
    total = Number(data.total || tracks.length);
    offset += data.items?.length || 0;
  } while (offset < total && offset > 0);
  return tracks;
}

export async function controlSpotifyPlayback(path: string, method = 'PUT', body?: Record<string, unknown>): Promise<boolean> {
  const response = await spotifyFetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.ok || response.status === 204;
}

function withDeviceId(path: string, deviceId?: string): string {
  if (!deviceId) return path;
  return `${path}${path.includes('?') ? '&' : '?'}device_id=${encodeURIComponent(deviceId)}`;
}

export function startSpotifyPlayback(deviceId?: string, body?: Record<string, unknown>): Promise<boolean> {
  return controlSpotifyPlayback(withDeviceId('/me/player/play', deviceId), 'PUT', body);
}

export function pauseSpotifyPlayback(deviceId?: string): Promise<boolean> {
  return controlSpotifyPlayback(withDeviceId('/me/player/pause', deviceId), 'PUT');
}

export function skipToNextSpotifyTrack(deviceId?: string): Promise<boolean> {
  return controlSpotifyPlayback(withDeviceId('/me/player/next', deviceId), 'POST');
}

export function skipToPreviousSpotifyTrack(deviceId?: string): Promise<boolean> {
  return controlSpotifyPlayback(withDeviceId('/me/player/previous', deviceId), 'POST');
}

export function seekSpotifyPlayback(positionMs: number, deviceId?: string): Promise<boolean> {
  const position = Math.max(0, Math.floor(positionMs));
  return controlSpotifyPlayback(withDeviceId(`/me/player/seek?position_ms=${position}`, deviceId), 'PUT');
}

export function setSpotifyRepeatMode(mode: 'track' | 'context' | 'off', deviceId?: string): Promise<boolean> {
  return controlSpotifyPlayback(withDeviceId(`/me/player/repeat?state=${mode}`, deviceId), 'PUT');
}

export function setSpotifyVolume(volumePercent: number, deviceId?: string): Promise<boolean> {
  const volume = Math.max(0, Math.min(100, Math.round(volumePercent)));
  return controlSpotifyPlayback(withDeviceId(`/me/player/volume?volume_percent=${volume}`, deviceId), 'PUT');
}

export function setSpotifyShuffle(enabled: boolean, deviceId?: string): Promise<boolean> {
  return controlSpotifyPlayback(withDeviceId(`/me/player/shuffle?state=${enabled}`, deviceId), 'PUT');
}

export async function transferSpotifyPlayback(deviceId: string, play = false): Promise<boolean> {
  return controlSpotifyPlayback('/me/player', 'PUT', { device_ids: [deviceId], play });
}

/**
 * Disconnects Spotify User session
 */
export function disconnectSpotifyUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('spotify_user_token');
  localStorage.removeItem('spotify_user_token_expires_at');
}

/**
 * Queries Spotify API for currently playing track in user's active player (Desktop or Mobile app)
 */
export async function fetchCurrentlyPlayingTrack(): Promise<SpotifyLivePlaybackInfo | null> {
  try {
    const res = await spotifyFetch('/me/player/currently-playing');

    if (res.status === 204 || res.status > 400) {
      if (res.status === 401) {
        disconnectSpotifyUser();
      }
      return null;
    }

    const data = await res.json();
    if (!data || !data.item) return null;

    const item = data.item;
    const artists = item.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist';
    const coverUrl = item.album?.images?.[0]?.url || item.album?.images?.[1]?.url || '';

    return {
      isPlaying: Boolean(data.is_playing),
      progressSec: Math.floor((data.progress_ms || 0) / 1000),
      durationSec: Math.floor((item.duration_ms || 0) / 1000),
      trackId: item.id,
      title: item.name,
      artist: artists,
      album: item.album?.name || '',
      coverUrl: coverUrl,
      spotifyUri: item.uri || `spotify:track:${item.id}`,
    };
  } catch (err) {
    console.warn('Could not fetch Spotify currently-playing track:', err);
    return null;
  }
}

export async function fetchSpotifyTrackMetrics(trackId: string): Promise<{ likes: number; listeners: number } | null> {
  if (!trackId) return null;

  try {
    const trackResponse = await spotifyFetch(`/tracks/${encodeURIComponent(trackId)}`);
    if (!trackResponse.ok) return null;
    const trackData = await trackResponse.json();

    const popularity = Number(trackData.popularity ?? 0);
    const artistId = trackData.artists?.[0]?.id;

    let followers = 0;
    if (artistId) {
      const artistResponse = await spotifyFetch(`/artists/${encodeURIComponent(artistId)}`);
      if (artistResponse.ok) {
        const artistData = await artistResponse.json();
        followers = Number(artistData.followers?.total ?? 0);
      }
    }

    return {
      likes: Math.max(1, Math.round(popularity * 1.2)),
      listeners: Math.max(1, Math.round(followers / 1000)),
    };
  } catch (error) {
    console.warn('Could not fetch Spotify public track metrics:', error);
    return null;
  }
}

export async function fetchSpotifyTrackLoudness(trackId: string): Promise<number | null> {
  if (!trackId) return null;

  try {
    const params = new URLSearchParams({ ids: trackId });
    const response = await spotifyFetch(`/audio-features?${params.toString()}`);
    if (!response.ok) return null;

    const data = await response.json();
    const loudness = data.audio_features?.[0]?.loudness;
    return typeof loudness === 'number' && Number.isFinite(loudness) ? loudness : null;
  } catch (error) {
    console.warn('Could not fetch Spotify track loudness:', error);
    return null;
  }
}

/**
 * Builds Spotify web URL
 */
export function buildSpotifyUrl(type: 'playlist' | 'track', id: string): string {
  const cleanId = id.replace(/^(spotify:(playlist|track):)/, '');
  return `https://open.spotify.com/${type}/${cleanId}`;
}

/**
 * Builds Spotify deep link URI for native desktop/mobile app
 */
export function buildSpotifyAppUri(type: 'playlist' | 'track', id: string): string {
  const cleanId = id.replace(/^(spotify:(playlist|track):)/, '');
  return `spotify:${type}:${cleanId}`;
}

/**
 * Determines current active time slot key based on local hour
 * 6 AM - 9 AM: morning
 * 9 AM - 11 AM: afternoon (Golden Age / Afternoon Community)
 * 11 AM - 3 PM: lunch
 * 3 PM - 10 PM: evening
 * 10 PM - 6 AM: evening chill / morning preparation
 */
export function getCurrentSlotKey(): 'morning' | 'afternoon' | 'lunch' | 'evening' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 9) return 'morning';
  if (hour >= 9 && hour < 11) return 'afternoon';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 22) return 'evening';
  return 'evening'; // late night chill
}

export async function fetchCachedPlaylistTracks(playlistId: string): Promise<SpotifyPlaylistTrack[]> {
  const response = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}/tracks`);

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const message = contentType.includes('application/json')
      ? ((await response.json()) as { error?: string }).error
      : `Playlist API returned ${response.status} ${response.statusText} instead of JSON`;
    throw new SpotifyApiError(
      response.status,
      message || `Could not load cached playlist ${playlistId} (${response.status})`,
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new SpotifyApiError(
      response.status,
      'Playlist API is unavailable in this environment. Please use the deployed app or configure the local API proxy.',
    );
  }

  return response.json();
}
