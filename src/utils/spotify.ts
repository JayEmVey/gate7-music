// Gate 7 Coffee Roastery - Spotify Web API Integration
// User authentication uses OAuth Authorization Code with PKCE.

export const SPOTIFY_CONFIG = {
  clientId: 'b25c3d0a87e54a79ad8f3fe8ae961938',
  scopes: 'streaming user-read-email user-read-private user-read-playback-state user-read-currently-playing user-modify-playback-state playlist-read-private playlist-read-collaborative',
};

export const SPOTIFY_SCOPE_VERSION = 'web-playback-playlists-v4';

const PKCE_VERIFIER_KEY = 'spotify_pkce_verifier';
const PKCE_STATE_KEY = 'spotify_oauth_state';
const PKCE_REDIRECT_URI_KEY = 'spotify_oauth_redirect_uri';
const AUDIO_ANALYZER_URL = import.meta.env.CLOUDFLARE_WORKER_URL?.trim();
let spotifyRequestQueue: Promise<unknown> = Promise.resolve();
let spotifyRateLimitUntil = 0;

export interface SpotifyTelemetrySnapshot {
  apiRequests: number;
  apiSuccesses: number;
  apiErrors: number;
  rateLimited: number;
  averageLatencyMs: number;
  lastLatencyMs: number;
  inFlight: number;
  peakInFlight: number;
  workerHits: number;
  workerMisses: number;
  workerStale: number;
  workerErrors: number;
  lastEndpoint: string;
  lastCacheStatus: string;
  updatedAt: number;
}

const EMPTY_TELEMETRY: SpotifyTelemetrySnapshot = {
  apiRequests: 0,
  apiSuccesses: 0,
  apiErrors: 0,
  rateLimited: 0,
  averageLatencyMs: 0,
  lastLatencyMs: 0,
  inFlight: 0,
  peakInFlight: 0,
  workerHits: 0,
  workerMisses: 0,
  workerStale: 0,
  workerErrors: 0,
  lastEndpoint: '-',
  lastCacheStatus: '-',
  updatedAt: 0,
};

let spotifyTelemetry = { ...EMPTY_TELEMETRY };
const telemetryListeners = new Set<() => void>();

function publishSpotifyTelemetry(): void {
  if (!import.meta.env.DEV) return;
  spotifyTelemetry = { ...spotifyTelemetry, updatedAt: Date.now() };
  telemetryListeners.forEach((listener) => listener());
}

function recordSpotifyApiRequest(endpoint: string, status: number, latencyMs: number): void {
  if (!import.meta.env.DEV) return;
  spotifyTelemetry.apiRequests += 1;
  spotifyTelemetry.apiSuccesses += status >= 200 && status < 400 ? 1 : 0;
  spotifyTelemetry.apiErrors += status >= 400 ? 1 : 0;
  spotifyTelemetry.rateLimited += status === 429 ? 1 : 0;
  spotifyTelemetry.averageLatencyMs = Math.round(((spotifyTelemetry.averageLatencyMs * (spotifyTelemetry.apiRequests - 1)) + latencyMs) / spotifyTelemetry.apiRequests);
  spotifyTelemetry.lastLatencyMs = latencyMs;
  spotifyTelemetry.lastEndpoint = endpoint;
  console.info('[Spotify API]', { endpoint, status, latencyMs });
  publishSpotifyTelemetry();
}

function startSpotifyApiRequest(endpoint: string): (status: number) => void {
  if (!import.meta.env.DEV) return () => undefined;
  spotifyTelemetry.inFlight += 1;
  spotifyTelemetry.peakInFlight = Math.max(spotifyTelemetry.peakInFlight, spotifyTelemetry.inFlight);
  publishSpotifyTelemetry();
  const startedAt = performance.now();
  return (status: number) => {
    spotifyTelemetry.inFlight = Math.max(0, spotifyTelemetry.inFlight - 1);
    recordSpotifyApiRequest(endpoint, status, Math.round(performance.now() - startedAt));
  };
}

function recordWorkerCacheStatus(endpoint: string, status: string): void {
  if (!import.meta.env.DEV) return;
  const normalized = status.toUpperCase();
  if (normalized === 'HIT') spotifyTelemetry.workerHits += 1;
  else if (normalized === 'MISS') spotifyTelemetry.workerMisses += 1;
  else if (normalized === 'STALE') spotifyTelemetry.workerStale += 1;
  else if (normalized === 'ERROR') spotifyTelemetry.workerErrors += 1;
  spotifyTelemetry.lastEndpoint = endpoint;
  spotifyTelemetry.lastCacheStatus = normalized;
  console.info('[Spotify Worker KV]', { endpoint, cache: normalized });
  publishSpotifyTelemetry();
}

export function getSpotifyTelemetry(): SpotifyTelemetrySnapshot {
  return { ...spotifyTelemetry };
}

export function subscribeSpotifyTelemetry(listener: () => void): () => void {
  telemetryListeners.add(listener);
  return () => telemetryListeners.delete(listener);
}

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
  type: 'playlist' | 'track' | 'user';
  id: string;
  name: string;
  artist?: string;
  coverUrl?: string;
  slotName?: string;
}

export interface SpotifyPlaylistTrack {
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

export interface SpotifyPlaybackState {
  device?: { id?: string; name?: string; type?: string; is_active?: boolean; volume_percent?: number };
  is_playing: boolean;
  progress_ms: number;
  item?: any;
  context?: { uri?: string; type?: string };
  shuffle_state?: boolean;
  /** Undocumented field returned by Get Playback State when Smart Shuffle is active. */
  smart_shuffle?: boolean;
  repeat_state?: 'track' | 'context' | 'off';
}

export interface SpotifyQueueState {
  currently_playing?: any;
  queue?: any[];
}

export async function fetchSpotifyPlaybackState(): Promise<SpotifyPlaybackState | null> {
  const response = await spotifyFetch('/me/player');
  if (response.status === 204 || !response.ok) return null;
  return response.json();
}

export async function fetchSpotifyCurrentUser(): Promise<{
  id: string;
  displayName: string;
  profileUrl: string;
  imageUrl?: string;
} | null> {
  const response = await spotifyFetch('/me');
  if (!response.ok) return null;
  const data = await response.json();
  if (!data?.id) return null;
  return {
    id: data.id,
    displayName: data.display_name || data.id,
    profileUrl: data.external_urls?.spotify || `https://open.spotify.com/user/${data.id}`,
    imageUrl: data.images?.[0]?.url,
  };
}

export async function fetchSpotifyQueue(): Promise<SpotifyQueueState | null> {
  const response = await spotifyFetch('/me/player/queue');
  if (!response.ok) return null;
  return response.json();
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
  return (data.tracks?.items || []).filter((item: any) => item?.id).map((item: any) => mapSpotifyTrackItem(item));
}

function mapSpotifyTrackItem(item: any, fallbackAlbum?: { name?: string; id?: string; images?: { url: string }[]; album_type?: string; release_date?: string }): SpotifyPlaylistTrack {
  const album = item.album || fallbackAlbum || {};
  return {
    id: item.id,
    title: item.name,
    artist: item.artists?.map((artist: { name: string }) => artist.name).join(', ') || 'Unknown Artist',
    artistId: item.artists?.[0]?.id,
    album: album.name || '',
    albumId: album.id,
    albumType: album.album_type,
    releaseDate: album.release_date,
    durationSec: Math.floor((item.duration_ms || 0) / 1000),
    coverUrl: album.images?.[0]?.url || item.album?.images?.[0]?.url || '',
    spotifyUri: item.uri || `spotify:track:${item.id}`,
  };
}

export async function fetchSpotifyPlaylistMeta(playlistId: string): Promise<{ id: string; name: string } | null> {
  if (!playlistId) return null;
  const response = await spotifyFetch(`/playlists/${encodeURIComponent(playlistId)}`);
  if (!response.ok) return null;
  const data = await response.json();
  if (!data?.id) return null;
  return { id: data.id, name: data.name || 'Playlist' };
}

export async function fetchSpotifyAlbum(albumId: string): Promise<{
  id: string;
  name: string;
  albumType: string;
  releaseDate: string;
  totalTracks: number;
  coverUrl: string;
  artists: { id: string; name: string }[];
  copyrights: string[];
  tracks: SpotifyPlaylistTrack[];
} | null> {
  if (!albumId) return null;
  const response = await spotifyFetch(`/albums/${encodeURIComponent(albumId)}?market=US`);
  if (!response.ok) {
    throw new SpotifyApiError(response.status, `Could not load album (${response.status})`);
  }
  const data = await response.json();
  const albumMeta = {
    name: data.name,
    id: data.id,
    images: data.images,
    album_type: data.album_type,
    release_date: data.release_date,
  };
  return {
    id: data.id,
    name: data.name || 'Album',
    albumType: data.album_type || 'album',
    releaseDate: data.release_date || '',
    totalTracks: Number(data.total_tracks || data.tracks?.items?.length || 0),
    coverUrl: data.images?.[0]?.url || '',
    artists: (data.artists || []).map((artist: { id: string; name: string }) => ({
      id: artist.id,
      name: artist.name,
    })),
    copyrights: (data.copyrights || []).map((entry: { text?: string; type?: string }) => {
      const mark = entry.type === 'P' ? '℗' : '©';
      return `${mark} ${entry.text || ''}`.trim();
    }),
    tracks: (data.tracks?.items || [])
      .filter((item: any) => item?.id)
      .map((item: any) => mapSpotifyTrackItem(item, albumMeta)),
  };
}

export async function fetchSpotifyArtist(artistId: string): Promise<{
  id: string;
  name: string;
  imageUrl?: string;
  followers: number;
} | null> {
  if (!artistId) return null;
  const response = await spotifyFetch(`/artists/${encodeURIComponent(artistId)}`);
  if (!response.ok) {
    throw new SpotifyApiError(response.status, `Could not load artist (${response.status})`);
  }
  const data = await response.json();
  return {
    id: data.id,
    name: data.name || 'Artist',
    imageUrl: data.images?.[0]?.url,
    followers: Number(data.followers?.total ?? 0),
  };
}

async function fetchTracksFromArtistAlbums(artistId: string, limit = 10): Promise<SpotifyPlaylistTrack[]> {
  const albumsResponse = await spotifyFetch(
    `/artists/${encodeURIComponent(artistId)}/albums?include_groups=album,single&market=US&limit=5`,
  );
  if (!albumsResponse.ok) return [];

  const albumsData = await albumsResponse.json();
  const albumIds = (albumsData.items || [])
    .map((album: { id?: string }) => album?.id)
    .filter((id: string | undefined): id is string => Boolean(id));

  const tracks: SpotifyPlaylistTrack[] = [];
  const seen = new Set<string>();
  for (const albumId of albumIds) {
    if (tracks.length >= limit) break;
    try {
      const album = await fetchSpotifyAlbum(albumId);
      for (const track of album?.tracks || []) {
        if (seen.has(track.id)) continue;
        if (track.artistId && track.artistId !== artistId) continue;
        seen.add(track.id);
        tracks.push(track);
        if (tracks.length >= limit) break;
      }
    } catch {
      // Skip albums that fail individually.
    }
  }
  return tracks;
}

/**
 * Approximate an artist's "popular" tracks.
 * Spotify removed GET /artists/{id}/top-tracks for Development Mode apps (Feb 2026),
 * so we search the catalog and fall back to recent album tracks.
 */
export async function fetchSpotifyArtistTopTracks(
  artistId: string,
  artistName?: string,
): Promise<SpotifyPlaylistTrack[]> {
  if (!artistId) return [];

  let name = artistName?.trim();
  if (!name) {
    const artist = await fetchSpotifyArtist(artistId);
    name = artist?.name;
  }
  if (!name) return fetchTracksFromArtistAlbums(artistId);

  const safeName = name.replace(/"/g, '');
  const params = new URLSearchParams({
    q: `artist:"${safeName}"`,
    type: 'track',
    limit: '10',
    market: 'US',
  });
  const response = await spotifyFetch(`/search?${params.toString()}`);
  if (!response.ok) {
    // Search can fail for some accounts; album discography still works.
    return fetchTracksFromArtistAlbums(artistId);
  }
  const data = await response.json();
  const fromSearch = (data.tracks?.items || [])
    .filter((item: any) => item?.id && item.artists?.some((artist: { id?: string }) => artist.id === artistId))
    .map((item: any) => mapSpotifyTrackItem(item));

  if (fromSearch.length > 0) return fromSearch;
  return fetchTracksFromArtistAlbums(artistId);
}

/**
 * Genre/keyword search terms per sonic category.
 * Used to query /search since /recommendations was deprecated by Spotify in Nov 2024.
 * Each entry is an array of query strings — we run 2-3 searches and merge results
 * to produce a diverse set of ~20 tracks that fit the sonic profile.
 */
export const SONIC_CATEGORY_QUERIES: Record<string, string[]> = {
  'High Energy / Fast Tempo':        ['genre:rock high energy fast tempo', 'genre:punk genre:alternative fast', 'genre:electronic upbeat dance'],
  'Acoustic / Grounded Energy':      ['genre:folk acoustic slow', 'genre:singer-songwriter acoustic guitar', 'genre:indie-folk fingerpicking'],
  'Warm Soul / Mid Tempo':           ['genre:soul jazz r&b smooth', 'genre:neo-soul warm mid tempo', 'genre:jazz cafe coffeehouse'],
  'Deep Chocolate Groove':           ['genre:soul funk groove deep bass', 'genre:r-n-b chocolate slow groove', 'genre:blues groove rich dark'],
  'Bright / Tropical Groove':        ['genre:tropical pop happy', 'genre:reggaeton dancehall tropical', 'genre:afrobeats sunny upbeat'],
  'Instrumental / Zen Flow':         ['genre:ambient instrumental zen', 'genre:study instrumental focus', 'genre:new-age piano peaceful'],
  'Cinematic Pop / Layered':         ['genre:indie-pop cinematic layered', 'genre:alternative pop atmospheric', 'genre:dream-pop ethereal'],
  'Floral / Delicate Acoustic':      ['genre:folk acoustic gentle floral', 'genre:singer-songwriter soft delicate', 'genre:indie acoustic dreamy'],
  'Tropical / Vibrant Groove':       ['genre:tropical house vibrant', 'genre:latin pop dance energetic', 'genre:world music upbeat groove'],
  'Gentle Acoustic / Sweet Clarity': ['genre:folk soft acoustic gentle', 'genre:acoustic singer-songwriter sweet', 'genre:indie-folk calm'],
};

/**
 * Fetch tracks that match a sonic pairing category by running targeted
 * Spotify keyword/genre searches. Falls back to a seed-track artist search
 * if genre queries return too few results.
 */
export async function fetchSpotifyRecommendationsBySonicCategory(
  seedTrackId: string,
  sonicCategory: string,
  limit = 20,
): Promise<SpotifyPlaylistTrack[]> {
  const queries = SONIC_CATEGORY_QUERIES[sonicCategory] ?? ['genre:indie acoustic chill'];
  const seen = new Set<string>();
  const results: SpotifyPlaylistTrack[] = [];
  const perQuery = Math.ceil(limit / queries.length);

  for (const q of queries) {
    if (results.length >= limit) break;
    const params = new URLSearchParams({
      q,
      type: 'track',
      limit: String(Math.min(perQuery + 5, 50)),
      market: 'VN',
    });
    try {
      const response = await spotifyFetch(`/search?${params.toString()}`);
      if (!response.ok) continue;
      const data = await response.json();
      for (const item of (data.tracks?.items ?? [])) {
        if (!item?.id || seen.has(item.id) || item.id === seedTrackId) continue;
        seen.add(item.id);
        results.push({
          id: item.id,
          title: item.name,
          artist: item.artists?.map((a: { name: string }) => a.name).join(', ') || 'Unknown',
          album: item.album?.name || '',
          durationSec: Math.floor((item.duration_ms || 0) / 1000),
          coverUrl: item.album?.images?.[0]?.url || '',
          spotifyUri: item.uri || `spotify:track:${item.id}`,
        });
        if (results.length >= limit) break;
      }
    } catch {
      // Continue to next query on individual failure
    }
  }

  return results;
}

export async function fetchSpotifyTrackAudioFeatures(trackId: string): Promise<SpotifyTrackAudioFeatures | null> {
  if (!trackId || !AUDIO_ANALYZER_URL) return null;

  try {
    const analyzerUrl = new URL(AUDIO_ANALYZER_URL);
    analyzerUrl.searchParams.set('track_id', trackId);
    const response = await fetch(analyzerUrl);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || typeof data.bpm !== 'number') return null;

    const keyMatch = typeof data.key === 'string' ? data.key.match(/^([A-G](?:#|b)?)(?:\s+(major|minor))?$/i) : null;
    const keyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const normalizedKey = keyMatch?.[1]?.replace('b', '#');
    const key = normalizedKey ? keyNames.indexOf(normalizedKey) : -1;
    const mode = keyMatch?.[2]?.toLowerCase() === 'major' ? 1 : keyMatch?.[2] ? 0 : -1;
    const energy = Number(data.energy ?? 0);

    return {
      acousticness: 0,
      danceability: 0,
      energy,
      instrumentalness: 0,
      key,
      liveness: 0,
      loudness: 0,
      mode,
      tempo: Number(data.bpm),
      valence: 0.5,
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
  const endpoint = path.split('?')[0];
  const finishRequest = startSpotifyApiRequest(endpoint);
  let response: Response;
  try {
    response = await queueSpotifyRequest(() => fetch(`https://api.spotify.com/v1${path}`, { ...init, headers }));
  } catch (error) {
    finishRequest(0);
    throw error;
  }
  finishRequest(response.status);
  if (response.status === 401) {
    token = await refreshSpotifyUserToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      response = await queueSpotifyRequest(() => fetch(`https://api.spotify.com/v1${path}`, { ...init, headers }));
      finishRequest(response.status);
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
    finishRequest(response.status);
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
      tracks.push(mapSpotifyTrackItem(item));
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
export function buildSpotifyUrl(type: 'playlist' | 'track' | 'user', id: string): string {
  const cleanId = id.replace(/^(spotify:(playlist|track|user):)/, '');
  return `https://open.spotify.com/${type}/${cleanId}`;
}

/**
 * Builds Spotify deep link URI for native desktop/mobile app
 */
export function buildSpotifyAppUri(type: 'playlist' | 'track' | 'user', id: string): string {
  const cleanId = id.replace(/^(spotify:(playlist|track|user):)/, '');
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
  const endpoint = `/api/playlists/${encodeURIComponent(playlistId)}/tracks`;
  const startedAt = import.meta.env.DEV ? performance.now() : 0;
  let response: Response;
  try {
    response = await fetch(endpoint);
  } catch (error) {
    if (import.meta.env.DEV) {
      recordWorkerCacheStatus(endpoint, 'ERROR');
      console.warn('[Spotify Worker KV]', { endpoint, cache: 'ERROR', latencyMs: Math.round(performance.now() - startedAt) });
    }
    throw error;
  }
  recordWorkerCacheStatus(endpoint, response.headers.get('X-Cache') || (response.ok ? 'UNKNOWN' : 'ERROR'));
  if (import.meta.env.DEV) {
    console.info('[Spotify Worker]', { endpoint, status: response.status, latencyMs: Math.round(performance.now() - startedAt) });
  }

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
