const PLAYLIST_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedSpotifyToken;
const playlistRefreshes = new Map();
let spotifyRetryAt = 0;

async function getSpotifyAccessToken(env) {
  if (cachedSpotifyToken && cachedSpotifyToken.expiresAt > Date.now() + 60_000) {
    return cachedSpotifyToken.accessToken;
  }

  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_CURATOR_REFRESH_TOKEN) {
    throw new Error('Spotify Worker secrets are not configured');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    signal: AbortSignal.timeout(5000),
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
      'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store',
      'X-Cache': cacheStatus
    }
  });
}

function analysisResponse(body, cacheStatus, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': cacheStatus === 'HIT' ? 'public, max-age=86400' : 'no-store',
      'Access-Control-Allow-Origin': '*',
      'X-Cache': cacheStatus
    }
  });
}

async function getCachedAnalysis(trackId, env) {
  if (!env.ANALYSIS_CACHE) return null;
  return env.ANALYSIS_CACHE.get(`analysis:v1:${trackId}`, 'json');
}

async function loadPlaylistTracks(playlistId, env) {
  if (Date.now() < spotifyRetryAt) throw new Error('Spotify refresh is cooling down');
  const token = await getSpotifyAccessToken(env);
  const tracks = [];
  let offset = 0;
  let total = 0;
  let snapshotId = '';

  do {
    let response;
    for (let attempt = 0; ; attempt += 1) {
      response = await fetch(`https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items?limit=50&offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000)
      });
      if (response.status === 429) {
        spotifyRetryAt = Date.now() + Math.max(1, Number(response.headers.get('Retry-After') || 30)) * 1000;
      }
      break;
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
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/api/analysis/batch') {
      if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
      const ids = [...new Set((url.searchParams.get('ids') || '').split(','))];
      if (ids.length > 100 || ids.some((id) => !/^[A-Za-z0-9]{22}$/.test(id))) {
        return Response.json({ error: 'Provide 1–100 Spotify track IDs' }, { status: 400 });
      }
      const started = Date.now();
      const requestId = crypto.randomUUID();
      try {
        if (!env.ANALYSIS_CACHE) throw new Error('ANALYSIS_CACHE binding missing');
        const records = await env.ANALYSIS_CACHE.get(ids.map((id) => `analysis:v1:${id}`), { type: 'json', cacheTtl: 60 });
        const tracks = Object.fromEntries(ids.map((id) => {
          const analysis = records.get(`analysis:v1:${id}`);
          return [id, analysis ? { status: 'ready', analysis } : { status: 'missing' }];
        }));
        return Response.json({ tracks }, { headers: {
          'Cache-Control': 'public, max-age=60',
          'X-Request-ID': requestId,
          'Server-Timing': `kv;dur=${Date.now() - started}`,
        } });
      } catch (error) {
        console.error('Analysis batch failed', { requestId, error: String(error) });
        return Response.json({ error: 'Analysis temporarily unavailable', requestId }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' } });
      }
    }

    // /analyzer belongs to the existing analysis service; this app only reads KV.
    if (pathname === '/api/analysis') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }
      if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
      if (!env.ANALYSIS_CACHE) {
        return analysisResponse({ error: 'ANALYSIS_CACHE binding is not configured' }, 'ERROR', 500);
      }

      const trackId = url.searchParams.get('track_id')?.trim() || '';
      if (!/^[A-Za-z0-9]{22}$/.test(trackId)) {
        return analysisResponse({ error: 'A valid Spotify track_id is required' }, 'ERROR', 400);
      }

      const cached = await getCachedAnalysis(trackId, env);
      return cached
        ? analysisResponse(cached, 'HIT')
        : analysisResponse({ error: 'Audio analysis is not cached', track_id: trackId }, 'MISS', 404);
    }

    const playlistMatch = pathname.match(/^\/api\/playlists\/([^/]+)\/tracks$/);
    if (playlistMatch) {
      if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
      if (!env.SPOTIFY_PLAYLIST_CACHE) {
        return playlistResponse({ error: 'SPOTIFY_PLAYLIST_CACHE binding is not configured' }, 'ERROR', 500);
      }

      const playlistId = decodeURIComponent(playlistMatch[1]);
      const cacheKey = `playlist:${playlistId}`;
      const cached = await env.SPOTIFY_PLAYLIST_CACHE.get(cacheKey, 'json');
      if (cached?.tracks) {
        const stale = Date.now() - Number(cached.checkedAt || 0) >= PLAYLIST_CACHE_TTL_MS;
        if (stale && ctx && !playlistRefreshes.has(playlistId)) {
          const refresh = loadPlaylistTracks(playlistId, env)
            .then((record) => env.SPOTIFY_PLAYLIST_CACHE.put(cacheKey, JSON.stringify(record)))
            .catch((error) => console.error('Playlist background refresh failed', { playlistId, error: String(error) }))
            .finally(() => playlistRefreshes.delete(playlistId));
          playlistRefreshes.set(playlistId, refresh);
          ctx.waitUntil(refresh);
        }
        return playlistResponse(cached.tracks, stale ? 'STALE' : 'HIT');
      }

      try {
        const record = await loadPlaylistTracks(playlistId, env);
        await env.SPOTIFY_PLAYLIST_CACHE.put(cacheKey, JSON.stringify(record));
        return playlistResponse(record.tracks, 'MISS');
      } catch (error) {
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
