import { handleSyncRoutes, coordinator, playlistCatalog } from './playlist-sync.js';
export { PlaylistSyncCoordinator } from './playlist-sync.js';

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
      'Cache-Control': 'no-store',
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

function isValidAnalysis(data, trackId) {
  return data?.track_id === trackId && !data.error
    && Number.isFinite(data.bpm) && data.bpm >= 0
    && Number.isFinite(data.energy) && data.energy >= 0;
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
      let spotifyMessage = '';
      try {
        const body = await response.json();
        spotifyMessage = typeof body?.error === 'string'
          ? body.error
          : body?.error?.message || '';
      } catch {
        // Spotify occasionally returns an empty/non-JSON error response.
      }
      const error = new Error(
        `Spotify playlist request failed (${response.status})${spotifyMessage ? `: ${spotifyMessage}` : ''}`,
      );
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

    try {
      const response = await handleSyncRoutes(request, env);
      if (response) return response;
    } catch {
      return playlistResponse({ error: 'Playlist service is temporarily unavailable.' }, 'ERROR', 503);
    }

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

    // Resolve cache misses through the analyzer service binding.
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

      try {
        const cached = await getCachedAnalysis(trackId, env);
        if (isValidAnalysis(cached, trackId)) return analysisResponse(cached, 'HIT');
        if (!env.AUDIO_ANALYZER) {
          return analysisResponse({ error: 'AUDIO_ANALYZER service binding is not configured' }, 'ERROR', 503);
        }

        const analyzerUrl = new URL('/analyzer', request.url);
        analyzerUrl.searchParams.set('track_id', trackId);
        const upstream = await env.AUDIO_ANALYZER.fetch(new Request(analyzerUrl, {
          signal: AbortSignal.timeout(110_000),
        }));
        if (upstream.status !== 200) {
          const status = upstream.ok ? 502 : upstream.status;
          const response = analysisResponse({ error: 'Audio analyzer could not produce analysis', track_id: trackId }, 'ERROR', status);
          const retryAfter = upstream.headers.get('Retry-After');
          if (retryAfter) response.headers.set('Retry-After', retryAfter);
          return response;
        }
        const data = await upstream.json();
        if (!isValidAnalysis(data, trackId)) {
          return analysisResponse({ error: 'Audio analyzer returned invalid analysis', track_id: trackId }, 'ERROR', 502);
        }
        // Persist before returning, rather than depending on the analyzer's background write.
        const { cache: _cache, ...analysis } = data;
        try {
          await env.ANALYSIS_CACHE.put(`analysis:v1:${trackId}`, JSON.stringify(analysis), {
            expirationTtl: 60 * 60 * 24 * 30,
          });
        } catch (error) {
          console.error('Analysis cache write failed', { trackId, error: String(error) });
          return analysisResponse(analysis, 'WRITE-ERROR');
        }
        return analysisResponse(analysis, 'MISS');
      } catch (error) {
        console.error('Analysis lookup failed', { trackId, error: String(error) });
        return analysisResponse({ error: 'Audio analysis temporarily unavailable', track_id: trackId }, 'ERROR', error.name === 'TimeoutError' ? 504 : 502);
      }
    }

    const playlistMatch = pathname.match(/^\/api\/playlists\/([^/]+)\/tracks$/);
    if (playlistMatch) {
      if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
      if (!env.SPOTIFY_PLAYLIST_CACHE) {
        return playlistResponse({ error: 'SPOTIFY_PLAYLIST_CACHE binding is not configured' }, 'ERROR', 500);
      }

      const playlistId = decodeURIComponent(playlistMatch[1]);
      const cacheKey = `playlist:${playlistId}`;
      const managed = env.PLAYLIST_SYNC && playlistCatalog.some((entry) => entry.id === playlistId);
      let cached = await env.SPOTIFY_PLAYLIST_CACHE.get(cacheKey, 'json');
      // Bridge KV propagation when a browser already knows a newer revision.
      if (managed && (!cached || (url.searchParams.has('revision') && cached.revision !== url.searchParams.get('revision')))) {
        const latest = await coordinator(env, `/record?id=${playlistId}`);
        if (latest.ok) cached = await latest.json() || cached;
      }
      const refreshRecord = async () => {
        if (!managed) {
          const record = await loadPlaylistTracks(playlistId, env);
          await env.SPOTIFY_PLAYLIST_CACHE.put(cacheKey, JSON.stringify(record));
          return record;
        }
        const response = await coordinator(env, `/sync?id=${playlistId}`, { token: await getSpotifyAccessToken(env), force: false });
        if (!response.ok) {
          const error = new Error((await response.json()).error);
          error.status = response.status;
          error.retryAfter = response.headers.get('Retry-After');
          throw error;
        }
        const latest = await coordinator(env, `/record?id=${playlistId}`);
        return latest.json();
      };
      if (cached?.tracks) {
        // Extension-managed records are explicitly refreshed by the manager.
        const stale = cached.schemaVersion !== 2 && Date.now() - Number(cached.checkedAt || 0) >= PLAYLIST_CACHE_TTL_MS;
        if (stale && ctx && !playlistRefreshes.has(playlistId)) {
          const refresh = refreshRecord()
            .catch((error) => console.error('Playlist background refresh failed', { playlistId, error: String(error) }))
            .finally(() => playlistRefreshes.delete(playlistId));
          playlistRefreshes.set(playlistId, refresh);
          ctx.waitUntil(refresh);
        }
        const response = playlistResponse(cached.tracks, stale ? 'STALE' : 'HIT');
        response.headers.set('X-Playlist-Revision', cached.revision || `legacy-${cached.checkedAt || 0}`);
        return response;
      }

      try {
        const record = await refreshRecord();
        const response = playlistResponse(record.tracks, 'MISS');
        response.headers.set('X-Playlist-Revision', record.revision || `legacy-${record.checkedAt || 0}`);
        return response;
      } catch (error) {
        const upstreamStatus = Number(error?.status);
        const responseStatus = Number.isInteger(upstreamStatus) && upstreamStatus >= 400 && upstreamStatus <= 599
          ? upstreamStatus
          : error?.name === 'TimeoutError' ? 504 : 502;
        const response = playlistResponse(
          { error: error instanceof Error ? error.message : 'Could not load playlist' },
          'ERROR',
          responseStatus,
        );
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
