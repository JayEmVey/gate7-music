export const SITE = 'https://music.gate7.vn';
export const SCOPES = 'playlist-read-private playlist-read-collaborative user-read-private';

export function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export async function createAuthorization(clientId, redirectUri) {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(64)));
  const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  const query = new URLSearchParams({
    client_id: clientId, response_type: 'code', redirect_uri: redirectUri,
    scope: SCOPES, state, code_challenge_method: 'S256', code_challenge: challenge,
  });
  return { verifier, state, url: `https://accounts.spotify.com/authorize?${query}` };
}

export function authorizationCode(callback, redirectUri, state) {
  const url = new URL(callback);
  const expected = new URL(redirectUri);
  if (url.origin !== expected.origin || url.pathname !== expected.pathname || url.searchParams.get('state') !== state) {
    throw new Error('Spotify sign-in could not be verified. Please try again.');
  }
  if (url.searchParams.has('error')) throw new Error('Spotify sign-in was cancelled or denied.');
  const code = url.searchParams.get('code');
  if (!code) throw new Error('Spotify did not return an authorization code.');
  return code;
}

export async function requestTokens(parameters) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(parameters), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const error = new Error('Spotify session could not be renewed. Reconnect Spotify.');
    error.status = response.status === 400 || response.status === 401 ? 401 : response.status;
    throw error;
  }
  const data = await response.json();
  if (!data.access_token) throw new Error('Spotify returned no access token.');
  if (data.scope && SCOPES.split(' ').some((scope) => !data.scope.split(' ').includes(scope))) {
    throw new Error('Spotify did not grant all required read permissions. Reconnect Spotify.');
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + data.expires_in * 1000 };
}
