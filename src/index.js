const PLAYLIST_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedSpotifyToken;

async function getSpotifyAccessToken(env) {
  if (cachedSpotifyToken && cachedSpotifyToken.expiresAt > Date.now() + 60_000) {
    return cachedSpotifyToken.accessToken;
  }

  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_CURATOR_REFRESH_TOKEN) {
    throw new Error('Spotify Worker secrets are not configured');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: env.SPOTIFY_CURATOR_REFRESH_TOKEN
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(`Spotify token request failed (${response.status}: ${data.error || 'unknown_error'})`);
    error.status = response.status;
    throw error;
  }

  cachedSpotifyToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000
  };
  return cachedSpotifyToken.accessToken;
}

function playlistResponse(body, cacheStatus = 'MISS', status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'public, max-age=300',
      'X-Cache': cacheStatus
    }
  });
}

async function loadPlaylistTracks(playlistId, env) {
  const token = await getSpotifyAccessToken(env);
  const tracks = [];
  let offset = 0;
  let total = 0;
  let snapshotId = '';

  do {
    let response;
    for (let attempt = 0; ; attempt += 1) {
      response = await fetch(`https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items?limit=50&offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status !== 429 || attempt >= 2) break;
      const retryAfter = Number(response.headers.get('Retry-After') || 0);
      const delayMs = Math.min(Math.max(retryAfter || 2 ** attempt, 1), 30) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    if (!response.ok) {
      const error = new Error(`Spotify playlist request failed (${response.status})`);
      error.status = response.status;
      error.retryAfter = response.headers.get('Retry-After') || '30';
      throw error;
    }

    const data = await response.json();
    snapshotId = data.snapshot_id || snapshotId;
    total = Number(data.total || 0);
    for (const entry of data.items || []) {
      const item = entry.track || entry.item;
      if (!item?.id) continue;
      tracks.push({
        id: item.id,
        title: item.name || '',
        artist: item.artists?.map((artist) => artist.name).join(', ') || 'Unknown Artist',
        album: item.album?.name || '',
        durationSec: Math.floor((item.duration_ms || 0) / 1000),
        coverUrl: item.album?.images?.[0]?.url || '',
        spotifyUri: item.uri || `spotify:track:${item.id}`
      });
    }
    offset += (data.items || []).length;
  } while (offset > 0 && offset < total);

  return { playlistId, snapshotId, checkedAt: Date.now(), tracks };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    const playlistMatch = pathname.match(/^\/api\/playlists\/([^/]+)\/tracks$/);
    if (playlistMatch) {
      if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
      if (!env.SPOTIFY_PLAYLIST_CACHE) {
        return playlistResponse({ error: 'SPOTIFY_PLAYLIST_CACHE binding is not configured' }, 'ERROR', 500);
      }

      const playlistId = decodeURIComponent(playlistMatch[1]);
      const cacheKey = `playlist:${playlistId}`;
      const cached = await env.SPOTIFY_PLAYLIST_CACHE.get(cacheKey, 'json');
      if (cached && Date.now() - Number(cached.checkedAt || 0) < PLAYLIST_CACHE_TTL_MS) {
        return playlistResponse(cached.tracks || [], 'HIT');
      }

      try {
        const record = await loadPlaylistTracks(playlistId, env);
        await env.SPOTIFY_PLAYLIST_CACHE.put(cacheKey, JSON.stringify(record));
        return playlistResponse(record.tracks, 'MISS');
      } catch (error) {
        if (cached?.tracks) return playlistResponse(cached.tracks, 'STALE', 200);
        const response = playlistResponse({ error: error instanceof Error ? error.message : 'Could not load playlist' }, 'ERROR', error.status === 429 ? 429 : 502);
        if (error.status === 429) response.headers.set('Retry-After', error.retryAfter || '30');
        return response;
      }
    }

    if (pathname === '/api/spotify/refresh') {
      if (request.method !== 'POST' || !env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
        return new Response('Not found', { status: 404 });
      }

      const form = await request.formData();
      const refreshToken = form.get('refresh_token');
      if (typeof refreshToken !== 'string' || !refreshToken) {
        return Response.json({ error: 'refresh_token is required' }, { status: 400 });
      }

      const spotifyResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
      });

      return new Response(spotifyResponse.body, {
        status: spotifyResponse.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not Found', { status: 404 });
  }
};
