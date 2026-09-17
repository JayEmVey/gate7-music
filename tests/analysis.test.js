import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const id = '1qy9fiVrFG1ARMVkcnLSbN';
const analysis = { track_id: id, bpm: 110, energy: 0.2, key: 'C major' };
function setup(cached = null, upstream = () => Response.json(analysis)) {
  const calls = [], writes = [];
  const env = {
    ANALYSIS_CACHE: {
      get: async () => cached,
      put: async (...args) => { writes.push(args); cached = JSON.parse(args[1]); },
    },
    AUDIO_ANALYZER: { fetch: async (request) => { calls.push(request); return upstream(); } },
  };
  return { env, calls, writes, request: () => worker.fetch(new Request(`https://music.gate7.vn/api/analysis?track_id=${id}`), env) };
}

test('cache hit bypasses analyzer', async () => {
  const f = setup(analysis);
  const response = await f.request();
  assert.deepEqual(await response.json(), analysis);
  assert.equal(response.headers.get('X-Cache'), 'HIT');
  assert.equal(f.calls.length, 0);
});

test('miss calls analyzer, persists result, and next request hits KV', async () => {
  const f = setup(null, () => Response.json({ ...analysis, cache: 'MISS' }));
  const response = await f.request();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Cache'), 'MISS');
  assert.deepEqual(await response.json(), analysis);
  assert.equal(f.calls[0].url, `https://music.gate7.vn/analyzer?track_id=${id}`);
  assert.deepEqual(f.writes[0], [`analysis:v1:${id}`, JSON.stringify(analysis), { expirationTtl: 2592000 }]);
  assert.equal((await f.request()).headers.get('X-Cache'), 'HIT');
  assert.equal(f.calls.length, 1);
});

for (const status of [404, 429, 502, 503]) {
  test(`upstream ${status} is not cached and preserves retry guidance`, async () => {
    const f = setup(null, () => new Response('failure', { status, headers: { 'Retry-After': '30' } }));
    const response = await f.request();
    assert.equal(response.status, status);
    assert.equal(response.headers.get('Retry-After'), '30');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(f.writes.length, 0);
  });
}
for (const data of [{ error: 'bad' }, { ...analysis, track_id: 'wrong' }, { ...analysis, bpm: null }]) {
  test(`invalid upstream payload is rejected: ${JSON.stringify(data)}`, async () => {
    const f = setup(null, () => Response.json(data));
    assert.equal((await f.request()).status, 502);
    assert.equal(f.writes.length, 0);
  });
}
test('missing service binding returns configuration failure', async () => {
  const f = setup();
  delete f.env.AUDIO_ANALYZER;
  assert.equal((await f.request()).status, 503);
});
test('invalid track ID never reaches analyzer', async () => {
  const f = setup();
  const response = await worker.fetch(new Request('https://music.gate7.vn/api/analysis?track_id=bad'), f.env);
  assert.equal(response.status, 400);
  assert.equal(f.calls.length, 0);
});
test('cache write failure still returns usable analysis', async () => {
  const f = setup();
  f.env.ANALYSIS_CACHE.put = async () => { throw new Error('KV unavailable'); };
  const response = await f.request();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Cache'), 'WRITE-ERROR');
  assert.deepEqual(await response.json(), analysis);
});
test('upstream timeout returns 504', async () => {
  const f = setup(null, () => { throw new DOMException('Timed out', 'TimeoutError'); });
  assert.equal((await f.request()).status, 504);
  assert.equal(f.writes.length, 0);
});
