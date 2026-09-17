import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['src/utils/spotify.ts'], bundle: true, write: false,
  platform: 'browser', format: 'esm', define: { 'import.meta.env': '{}' },
});
const { fetchSpotifyTrackAudioFeatures } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('404 makes one request, with no automatic retries', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 404 }));
  globalThis.window = { location: { origin: 'https://music.gate7.vn' } };
  try {
    assert.equal(await fetchSpotifyTrackAudioFeatures('missing'), null);
    assert.equal(fetch.mock.callCount(), 1);
  } finally { delete globalThis.window; }
});

test('concurrent callers share request and successful result is retained', async (t) => {
  let finish;
  t.mock.method(globalThis, 'fetch', () => new Promise((resolve) => { finish = resolve; }));
  globalThis.window = { location: { origin: 'https://music.gate7.vn' } };
  try {
    const first = fetchSpotifyTrackAudioFeatures('ready');
    const second = fetchSpotifyTrackAudioFeatures('ready');
    assert.equal(first, second);
    finish(Response.json({ track_id: 'ready', bpm: 110, energy: 0.2 }));
    assert.equal((await first).tempo, 110);
    assert.equal((await fetchSpotifyTrackAudioFeatures('ready')).energy, 0.2);
    assert.equal(fetch.mock.callCount(), 1);
  } finally { delete globalThis.window; }
});
