import configuration from '../public/music/playlists.json' with { type: 'json' };

const entries = new Map();
for (const slots of Object.values(configuration)) {
  for (const [slot, playlists] of Object.entries(slots)) {
    for (const playlist of playlists) {
      const entry = entries.get(playlist.id) || { ...playlist, slots: [] };
      if (!entry.slots.includes(slot)) entry.slots.push(slot);
      entries.set(playlist.id, entry);
    }
  }
}
export const playlistCatalog = [...entries.values()];

export class SyncError extends Error {
  constructor(message, status = 502, retryAfter = 0) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export function syncResponse(data, status = 200, retryAfter = 0) {
  return Response.json(data, { status, headers: {
    'Cache-Control': 'no-store',
    ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}),
  } });
}

export async function spotifyJSON(path, token, timeout = 8000) {
  const response = await fetch(`https://api.spotify.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) {
    const seconds = Math.max(1, Number(response.headers.get('Retry-After')) || 30);
    throw new SyncError(
      response.status === 401 ? 'Spotify session expired. Reconnect Spotify.'
        : response.status === 403 ? 'Spotify denied access. The manager must own or collaborate on this playlist.'
          : `Spotify request failed (${response.status}).`,
      response.status, response.status === 429 ? seconds : 0,
    );
  }
  return response.json();
}

export async function authorizeManager(request, env) {
  const allowed = (env.SPOTIFY_SYNC_ADMIN_IDS || '').split(',').map((id) => id.trim()).filter(Boolean);
  if (!allowed.length) throw new SyncError('Manager access is not configured: set SPOTIFY_SYNC_ADMIN_IDS.', 503);
  const token = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new SyncError('Sign in to Spotify first.', 401);
  const user = await spotifyJSON('me', token);
  if (!allowed.includes(user.id)) throw new SyncError(`Spotify account ${user.id} is not an authorized Gate 7 manager.`, 403);
  return { token, user: { id: user.id, name: user.display_name || user.id } };
}

function metadata(data) {
  if (!data.snapshot_id) throw new SyncError('Spotify returned no playlist snapshot.');
  return {
    snapshotId: data.snapshot_id,
    metadata: { name: data.name || '', description: data.description || '', coverUrl: data.images?.[0]?.url || '' },
  };
}

export function countChanges(previous, next) {
  const counts = new Map();
  for (const track of previous) counts.set(track.id, (counts.get(track.id) || 0) + 1);
  let added = 0;
  for (const track of next) {
    const count = counts.get(track.id) || 0;
    if (count) counts.set(track.id, count - 1);
    else added++;
  }
  return { added, removed: [...counts.values()].reduce((sum, value) => sum + value, 0) };
}

export function publicSummary(record) {
  if (!record) return null;
  return {
    revision: record.revision || `legacy-${record.checkedAt || 0}`,
    snapshotId: record.snapshotId || '', metadata: record.metadata,
    updatedAt: record.updatedAt || record.checkedAt, syncedAt: record.syncedAt || record.checkedAt,
    trackCount: record.tracks.length,
    durationSec: record.tracks.reduce((sum, track) => sum + (track.durationSec || 0), 0),
    changes: record.changes || null,
  };
}

// One named object serializes every publisher, including the website's cold-cache loader.
// No OAuth credentials are persisted in this object's storage.
export class PlaylistSyncCoordinator {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.tail = Promise.resolve();
  }

  fetch(request) {
    const work = this.tail.then(() => this.handle(request));
    this.tail = work.catch(() => {});
    return work;
  }

  async readRecord(id) {
    const count = await this.ctx.storage.get(`chunks:${id}`);
    if (count) {
      const keys = Array.from({ length: count }, (_, i) => `record:${id}:${i}`);
      const chunks = await this.ctx.storage.get(keys);
      return JSON.parse(keys.map((key) => chunks.get(key)).join(''));
    }
    return this.env.SPOTIFY_PLAYLIST_CACHE.get(`playlist:${id}`, 'json');
  }

  async saveRecord(id, record) {
    const json = JSON.stringify(record);
    // Small chunks also work with the Durable Object storage value-size limit.
    const chunks = json.match(/[\s\S]{1,16000}/g) || [];
    await this.ctx.storage.transaction(async (tx) => {
      const oldCount = await tx.get(`chunks:${id}`) || 0;
      for (let i = 0; i < chunks.length; i++) await tx.put(`record:${id}:${i}`, chunks[i]);
      for (let i = chunks.length; i < oldCount; i++) await tx.delete(`record:${id}:${i}`);
      await tx.put(`chunks:${id}`, chunks.length);
      await tx.put(`summary:${id}`, publicSummary(record));
    });
  }

  async handle(request) {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    try {
      if (url.pathname === '/status') {
        const playlists = [];
        for (const entry of playlistCatalog) {
          const summary = await this.ctx.storage.get(`summary:${entry.id}`)
            || publicSummary(await this.env.SPOTIFY_PLAYLIST_CACHE.get(`playlist:${entry.id}`, 'json'));
          const state = await this.ctx.storage.get(`status:${entry.id}`) || {};
          playlists.push({ ...entry, ...summary, cache: summary ? 'cached' : 'not-yet', ...state });
        }
        return syncResponse({ playlists });
      }
      if (!entries.has(id)) throw new SyncError('Unknown configured playlist.', 404);
      if (url.pathname === '/record') return syncResponse(await this.readRecord(id));
      if (url.pathname !== '/sync' || request.method !== 'POST') throw new SyncError('Not found.', 404);
      const retryAt = await this.ctx.storage.get('retryAt') || 0;
      if (retryAt > Date.now()) throw new SyncError('Spotify rate limit cooldown is active.', 429, Math.ceil((retryAt - Date.now()) / 1000));
      const { token, force = false } = await request.json();
      const previous = await this.readRecord(id);
      const deadline = Date.now() + 22000;
      const get = (path) => {
        if (Date.now() >= deadline) throw new SyncError('Sync took too long. Previous playlist retained; please retry.', 504);
        return spotifyJSON(path, token, Math.min(8000, deadline - Date.now()));
      };
      let record;
      for (let attempt = 0; attempt < 2; attempt++) {
        const before = metadata(await get(`playlists/${id}?fields=snapshot_id,name,description,images`));
        const same = previous?.snapshotId === before.snapshotId && JSON.stringify(previous.metadata) === JSON.stringify(before.metadata);
        const status = await this.ctx.storage.get(`status:${id}`);
        if (same && !force && status?.cache !== 'error') {
          await this.ctx.storage.put(`status:${id}`, { cache: 'cached', checkedAt: Date.now(), error: null });
          return syncResponse({ ...entries.get(id), ...publicSummary(previous), cache: 'cached', checkedAt: Date.now(), changed: false });
        }
        const tracks = [];
        let offset = 0;
        for (let page = 0; ; page++) {
          if (page >= 200) throw new SyncError('Playlist exceeds the supported 10,000 items. Previous cache retained.', 422);
          const data = await get(`playlists/${id}/items?limit=50&offset=${offset}`);
          if (!Array.isArray(data.items) || !Number.isInteger(data.total) || data.total < 0) throw new SyncError('Incomplete Spotify playlist response.');
          for (const entry of data.items) {
            const item = entry.item || entry.track;
            if (!item?.id || item.type === 'episode' || entry.is_local) continue;
            tracks.push({
              id: item.id, title: item.name || '', artist: item.artists?.map((artist) => artist.name).join(', ') || 'Unknown Artist',
              artistId: item.artists?.[0]?.id, album: item.album?.name || '', albumId: item.album?.id,
              durationSec: Math.floor((item.duration_ms || 0) / 1000), coverUrl: item.album?.images?.[0]?.url || '',
              spotifyUri: item.uri || `spotify:track:${item.id}`,
            });
          }
          offset += data.items.length;
          if (offset >= data.total) break;
          if (!data.items.length) throw new SyncError('Spotify pagination ended early. Previous cache retained.');
        }
        const after = metadata(await get(`playlists/${id}?fields=snapshot_id,name,description,images`));
        if (JSON.stringify(before) !== JSON.stringify(after)) continue;
        const changed = !previous || !same || JSON.stringify(previous.tracks) !== JSON.stringify(tracks);
        record = {
          schemaVersion: 2, playlistId: id, ...after, tracks,
          revision: changed ? crypto.randomUUID() : previous.revision,
          checkedAt: Date.now(), syncedAt: Date.now(), updatedAt: changed ? Date.now() : previous.updatedAt,
          changes: changed ? countChanges(previous?.tracks || [], tracks) : previous.changes,
        };
        break;
      }
      if (!record) throw new SyncError('Playlist kept changing during sync. Previous cache retained; retry shortly.', 409);
      // The coordinator is authoritative during KV propagation and retries failed KV writes.
      await this.saveRecord(id, record);
      try {
        await this.env.SPOTIFY_PLAYLIST_CACHE.put(`playlist:${id}`, JSON.stringify(record));
      } catch {
        throw new SyncError('Cloudflare KV write failed. Retry sync to publish the latest playlist.', 503);
      }
      await this.ctx.storage.put(`status:${id}`, { cache: 'cached', checkedAt: record.checkedAt, error: null });
      return syncResponse({ ...entries.get(id), ...publicSummary(record), cache: 'cached', checkedAt: record.checkedAt, changed: previous?.revision !== record.revision });
    } catch (error) {
      if (error.status === 429) await this.ctx.storage.put('retryAt', Date.now() + error.retryAfter * 1000);
      if (entries.has(id) && url.pathname === '/sync') {
        await this.ctx.storage.put(`status:${id}`, { cache: 'error', checkedAt: Date.now(), error: error.message });
      }
      return syncResponse({ error: error.message || 'Playlist sync failed.' }, error.status || 502, error.retryAfter);
    }
  }
}

export function coordinator(env, path, body) {
  if (!env.PLAYLIST_SYNC) throw new SyncError('Deploy the PLAYLIST_SYNC Durable Object binding first.', 503);
  const stub = env.PLAYLIST_SYNC.get(env.PLAYLIST_SYNC.idFromName('gate7-playlist-sync'));
  return stub.fetch(new Request(`https://sync.internal${path}`, body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  } : undefined));
}

export async function handleSyncRoutes(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/sync/config' && request.method === 'GET') {
    return syncResponse({ clientId: env.SPOTIFY_CLIENT_ID });
  }
  if (url.pathname === '/api/playlists/manifest' && request.method === 'GET') {
    if (env.PLAYLIST_SYNC) {
      const response = await coordinator(env, '/status');
      if (!response.ok) return response;
      const { playlists } = await response.json();
      return syncResponse({ playlists: playlists.map(({ id, revision, metadata, updatedAt, trackCount, durationSec }) => ({
        id, revision, metadata, updatedAt, trackCount, durationSec,
      })) });
    }
    const playlists = await Promise.all(playlistCatalog.map(async (entry) => {
      const record = await env.SPOTIFY_PLAYLIST_CACHE.get(`playlist:${entry.id}`, 'json');
      return { id: entry.id, ...publicSummary(record) };
    }));
    return syncResponse({ playlists });
  }
  if (!url.pathname.startsWith('/api/admin/')) return null;
  try {
    const { token, user } = await authorizeManager(request, env);
    if (url.pathname === '/api/admin/playlists' && request.method === 'GET') {
      const response = await coordinator(env, '/status');
      if (!response.ok) return response;
      return syncResponse({ user, ...await response.json() });
    }
    const match = url.pathname.match(/^\/api\/admin\/playlists\/([A-Za-z0-9]{22})\/sync$/);
    if (match && request.method === 'POST') {
      const body = await request.json();
      return coordinator(env, `/sync?id=${match[1]}`, { token, force: body.force === true });
    }
    return syncResponse({ error: 'Not found.' }, 404);
  } catch (error) {
    return syncResponse({ error: error.message }, error instanceof SyntaxError ? 400 : error.status || 502, error.retryAfter);
  }
}
