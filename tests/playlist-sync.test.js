import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { PlaylistSyncCoordinator, playlistCatalog, countChanges } from '../src/playlist-sync.js';

const id = playlistCatalog[0].id;
const admin = '9c5zfo7a4yk73b3u14zm3gt9u';
const meta = (snapshot = 'v1', name = 'Morning coffee') => ({ snapshot_id: snapshot, name, description: 'For Gate 7', images: [] });
const track = (id) => ({ item: { id, type: 'track', name: id, artists: [{ id: 'artist', name: 'Artist' }], duration_ms: 125000, album: { name: 'Album', images: [] } } });

function fixture() {
  const data = new Map(), kv = new Map(), writes = [];
  const storage = {
    get: async (key) => Array.isArray(key) ? new Map(key.filter((item) => data.has(item)).map((item) => [item, structuredClone(data.get(item))])) : structuredClone(data.get(key)),
    put: async (key, value) => { data.set(key, structuredClone(value)); },
    delete: async (key) => data.delete(key),
    transaction: async (callback) => callback(storage),
  };
  const env = {
    SPOTIFY_CLIENT_ID: 'client', SPOTIFY_SYNC_ADMIN_IDS: admin,
    SPOTIFY_PLAYLIST_CACHE: {
      get: async (key) => structuredClone(kv.get(key) || null),
      put: async (key, value) => { writes.push(key); kv.set(key, JSON.parse(value)); },
    },
  };
  const object = new PlaylistSyncCoordinator({ storage }, env);
  env.PLAYLIST_SYNC = { idFromName: () => 'singleton', get: () => object };
  const sync = (force = false) => object.fetch(new Request(`https://sync.internal/sync?id=${id}`, { method: 'POST', body: JSON.stringify({ token: 'token', force }) }));
  const request = (path, options) => worker.fetch(new Request(`https://music.gate7.vn${path}`, options), env, { waitUntil: () => {} });
  return { data, kv, writes, env, object, sync, request };
}

test('catalog deduplicates languages and preserves every time slot', () => {
  assert.equal(playlistCatalog.length, 20);
  assert.deepEqual(playlistCatalog.find((entry) => entry.id === '08si8IrCPeJrDQsLPdSXqX').slots, ['afternoon', 'lunch']);
});

test('diff counts duplicate occurrences, additions and removals', () => {
  assert.deepEqual(countChanges([{ id: 'a' }, { id: 'a' }, { id: 'b' }], [{ id: 'a' }, { id: 'c' }]), { added: 1, removed: 2 });
});

test('sync publishes complete tracks, unchanged checks skip downloads, manual sync refetches', async (t) => {
  const f = fixture(); let pages = 0;
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url.includes('/items?')) { pages++; return Response.json({ items: [track('a'), track('a')], total: 2 }); }
    return Response.json(meta());
  });
  const first = await (await f.sync()).json();
  assert.equal(first.cache, 'cached');
  assert.deepEqual(first.changes, { added: 2, removed: 0 });
  assert.equal(f.kv.get(`playlist:${id}`).tracks.length, 2);
  const same = await (await f.sync()).json();
  assert.equal(same.changed, false);
  assert.equal(same.revision, first.revision);
  assert.equal(pages, 1);
  const forced = await (await f.sync(true)).json();
  assert.equal(forced.revision, first.revision);
  assert.equal(pages, 2);
  assert.equal(f.writes.length, 2);
});

test('metadata-only changes and valid empty playlists are published', async (t) => {
  const f = fixture(); let name = 'First'; let items = [track('a')];
  t.mock.method(globalThis, 'fetch', async (url) => Response.json(url.includes('/items?') ? { items, total: items.length } : meta('same-snapshot', name)));
  const first = await (await f.sync()).json();
  name = 'Renamed';
  const renamed = await (await f.sync()).json();
  assert.notEqual(first.revision, renamed.revision);
  assert.equal(renamed.metadata.name, name);
  items = [];
  const empty = await (await f.sync(true)).json();
  assert.equal(empty.trackCount, 0);
  assert.equal(empty.changes.removed, 1);
});

test('pagination preserves order and drops unavailable/local items without looping', async (t) => {
  const f = fixture();
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (!url.includes('/items?')) return Response.json(meta());
    return Response.json(url.includes('offset=0')
      ? { items: [track('a'), { item: null }], total: 4 }
      : { items: [{ ...track('local'), is_local: true }, track('b')], total: 4 });
  });
  assert.equal((await f.sync()).status, 200);
  assert.deepEqual(f.kv.get(`playlist:${id}`).tracks.map((item) => item.id), ['a', 'b']);
});

test('mid-download edits retry a whole snapshot and never publish the partial version', async (t) => {
  const f = fixture(); let metadataCalls = 0; let pageCalls = 0;
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url.includes('/items?')) return Response.json({ items: [track(++pageCalls === 1 ? 'old' : 'new')], total: 1 });
    return Response.json(meta(++metadataCalls === 1 ? 'v1' : 'v2'));
  });
  assert.equal((await f.sync()).status, 200);
  assert.equal(f.writes.length, 1);
  assert.equal(f.kv.get(`playlist:${id}`).tracks[0].id, 'new');
});

test('incomplete pagination retains the last valid KV record', async (t) => {
  const f = fixture();
  f.kv.set(`playlist:${id}`, { tracks: [{ id: 'retained' }] });
  t.mock.method(globalThis, 'fetch', async (url) => Response.json(url.includes('/items?') ? { items: [], total: 50 } : meta()));
  assert.equal((await f.sync()).status, 502);
  assert.equal(f.writes.length, 0);
  assert.equal(f.kv.get(`playlist:${id}`).tracks[0].id, 'retained');
});

test('rate limit cooldown survives coordinator recreation', async (t) => {
  const f = fixture(); let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({}, { status: 429, headers: { 'Retry-After': '120' } }); });
  const first = await f.sync();
  assert.equal(first.status, 429);
  assert.equal(first.headers.get('Retry-After'), '120');
  const restarted = new PlaylistSyncCoordinator(f.object.ctx, f.env);
  const second = await restarted.fetch(new Request(`https://sync.internal/sync?id=${id}`, { method: 'POST', body: JSON.stringify({ token: 'token' }) }));
  assert.equal(second.status, 429);
  assert.equal(calls, 1);
});

test('KV write failure is reported and unchanged auto check retries publication', async (t) => {
  const f = fixture();
  t.mock.method(globalThis, 'fetch', async (url) => Response.json(url.includes('/items?') ? { items: [track('a')], total: 1 } : meta()));
  const put = f.env.SPOTIFY_PLAYLIST_CACHE.put;
  f.env.SPOTIFY_PLAYLIST_CACHE.put = async () => { throw new Error('unavailable'); };
  assert.equal((await f.sync()).status, 503);
  const status = await (await f.object.fetch(new Request('https://sync.internal/status'))).json();
  assert.equal(status.playlists[0].cache, 'error');
  f.env.SPOTIFY_PLAYLIST_CACHE.put = put;
  assert.equal((await f.sync()).status, 200);
  assert.equal(f.kv.get(`playlist:${id}`).tracks[0].id, 'a');
});

test('concurrent refreshes serialize and do not fetch an unchanged playlist twice', async (t) => {
  const f = fixture(); let pageCalls = 0;
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url.includes('/items?')) { pageCalls++; return Response.json({ items: [], total: 0 }); }
    return Response.json(meta());
  });
  const responses = await Promise.all([f.sync(), f.sync()]);
  assert.deepEqual(responses.map((response) => response.status), [200, 200]);
  assert.equal(pageCalls, 1);
});

test('public manifest and requested revision bypass stale KV through coordinator', async (t) => {
  const f = fixture();
  t.mock.method(globalThis, 'fetch', async (url) => Response.json(url.includes('/items?') ? { items: [track('latest')], total: 1 } : meta()));
  const published = await (await f.sync()).json();
  f.kv.set(`playlist:${id}`, { schemaVersion: 2, revision: 'stale', tracks: [{ id: 'old' }] });
  const manifest = await (await f.request('/api/playlists/manifest')).json();
  assert.equal(manifest.playlists[0].revision, published.revision);
  const response = await f.request(`/api/playlists/${id}/tracks?revision=${published.revision}`);
  assert.equal(response.headers.get('X-Playlist-Revision'), published.revision);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal((await response.json())[0].id, 'latest');
});

test('admin API denies missing, unconfigured and non-manager credentials before writes', async (t) => {
  const f = fixture(); let identity = 'stranger';
  t.mock.method(globalThis, 'fetch', async () => Response.json({ id: identity }));
  const path = `/api/admin/playlists/${id}/sync`;
  assert.equal((await f.request(path, { method: 'POST', body: '{}' })).status, 401);
  const options = { method: 'POST', headers: { Authorization: 'Bearer token' }, body: '{}' };
  assert.equal((await f.request(path, options)).status, 403);
  identity = admin;
  assert.equal((await f.request('/api/admin/playlists', { headers: options.headers })).status, 200);
  f.env.SPOTIFY_SYNC_ADMIN_IDS = '';
  assert.equal((await f.request(path, options)).status, 503);
  assert.equal(f.writes.length, 0);
});

test('admin ignores supplied playlist content and only publishes Spotify data', async (t) => {
  const f = fixture();
  t.mock.method(globalThis, 'fetch', async (url) => Response.json(url.endsWith('/me') ? { id: admin } : url.includes('/items?') ? { items: [track('real')], total: 1 } : meta()));
  const response = await f.request(`/api/admin/playlists/${id}/sync`, {
    method: 'POST', headers: { Authorization: 'Bearer token' }, body: JSON.stringify({ tracks: [{ id: 'spoofed' }], force: true }),
  });
  assert.equal(response.status, 200);
  assert.equal(f.kv.get(`playlist:${id}`).tracks[0].id, 'real');
  assert.equal((await f.request('/api/admin/playlists/0000000000000000000000/sync', {
    method: 'POST', headers: { Authorization: 'Bearer token' }, body: '{}',
  })).status, 404);
});
