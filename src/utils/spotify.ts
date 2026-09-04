// Gate 7 Coffee Roastery - Spotify Web API Integration
// Automated authentication with Gate 7 Client ID and Client Secret

export const SPOTIFY_CONFIG = {
  clientId: 'be83df152a954a5fbe64cd9f065cb832',
  clientSecret: 'eabdc8fb352a4504aab3e1379d8ad6a5',
  scopes: 'user-read-currently-playing user-read-playback-state',
};

export interface SpotifyAuthStatus {
  authenticated: boolean;
  token?: string;
  source: 'client_credentials' | 'cached' | 'error';
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
export function getSpotifyUserAuthUrl(redirectUri?: string): string {
  const targetRedirect = redirectUri || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '');
  
  const params = new URLSearchParams({
    client_id: SPOTIFY_CONFIG.clientId,
    response_type: 'code', // Switch to code flow since token flow is disabled/deprecated
    redirect_uri: targetRedirect,
    scope: SPOTIFY_CONFIG.scopes,
    show_dialog: 'true',
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
    // Fallback: check hash for token just in case implicit grant somehow worked
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const tokenFromHash = hashParams.get('access_token');
    if (tokenFromHash) {
      spotifyDiagnostics.log('Found token in hash (Implicit Grant fallback)');
      localStorage.setItem('spotify_user_token', tokenFromHash);
      const expiresIn = hashParams.get('expires_in');
      if (expiresIn) {
        localStorage.setItem('spotify_user_token_expires_at', String(Date.now() + Number(expiresIn) * 1000));
      }
      window.history.replaceState(null, '', window.location.pathname);
      return tokenFromHash;
    }
    
    spotifyDiagnostics.log('No authorization code found in URL');
    return null;
  }

  spotifyDiagnostics.log('Authorization code found, exchanging for access token...');
  
  try {
    const targetRedirect = `${window.location.origin}${window.location.pathname}`;
    const auth = btoa(`${SPOTIFY_CONFIG.clientId}:${SPOTIFY_CONFIG.clientSecret}`);
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: targetRedirect,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      spotifyDiagnostics.log('Failed to exchange code for token', { status: response.status, error: errorText });
      return null;
    }

    const data = await response.json();
    if (data.access_token) {
      spotifyDiagnostics.log('Successfully exchanged code for access token', { expiresIn: data.expires_in });
      localStorage.setItem('spotify_user_token', data.access_token);
      
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
  const token = getSpotifyUserToken();
  if (!token) return null;

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

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

/**
 * Automatically authenticates with Spotify using Gate 7 Coffee Client Credentials.
 * Safe for in-browser client credentials or token caching in localStorage.
 */
export async function getSpotifyAccessToken(): Promise<string | null> {
  try {
    const cachedToken = localStorage.getItem('spotifyAccessToken');
    const cachedExpiresAt = Number(localStorage.getItem('spotifyTokenExpiresAt') || 0);

    // If cached token is still valid (with 60s margin), use it
    if (cachedToken && Date.now() < cachedExpiresAt - 60000) {
      return cachedToken;
    }

    // Authenticate via client credentials flow
    const auth = btoa(`${SPOTIFY_CONFIG.clientId}:${SPOTIFY_CONFIG.clientSecret}`);
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      console.warn('Spotify auth response error:', response.status, response.statusText);
      // If client credentials fail, check if we still have any token
      return cachedToken || null;
    }

    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem('spotifyAccessToken', data.access_token);
      const expiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000;
      localStorage.setItem('spotifyTokenExpiresAt', String(expiresAt));
      return data.access_token;
    }

    return null;
  } catch (error) {
    console.warn('Spotify authentication failed:', error);
    return localStorage.getItem('spotifyAccessToken') || null;
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
