import test from 'node:test';
import assert from 'node:assert/strict';

test('extension login, manual queue, auto cooldown, suspension recovery and logout', async (t) => {
  const local = {}, session = {}, alarms = new Map(), listeners = {};
  const area = (data) => ({
    setAccessLevel: async () => {},
    get: async (key) => ({ [key]: structuredClone(data[key]) }),
    set: async (values) => Object.assign(data, structuredClone(values)),
    remove: async (key) => { delete data[key]; },
  });
  let oauthPrompts = 0;
  let oauthFailure = false;
  globalThis.chrome = {
    storage: { local: area(local), session: area(session) },
    identity: {
      getRedirectURL: () => 'https://test.chromiumapp.org/spotify',
      launchWebAuthFlow: async ({ url }) => {
        oauthPrompts++;
        if (oauthFailure) throw new Error('Authorization page could not be loaded.');
        const state = new URL(url).searchParams.get('state');
        return `https://test.chromiumapp.org/spotify?state=${state}&code=code`;
      },
    },
    runtime: {
      id: 'test', getURL: (path) => `chrome-extension://test/${path}`,
      onMessage: { addListener: (fn) => { listeners.message = fn; } },
      onInstalled: { addListener: (fn) => { listeners.installed = fn; } },
      onStartup: { addListener: (fn) => { listeners.startup = fn; } },
    },
    action: { onClicked: { addListener: () => {} } },
    tabs: { create: async () => {} },
    alarms: {
      create: async (name, options) => alarms.set(name, options),
      get: async (name) => alarms.get(name),
      clear: async (name) => alarms.delete(name),
      clearAll: async () => alarms.clear(),
      onAlarm: { addListener: (fn) => { listeners.alarm = fn; } },
    },
  };
  t.after(() => { delete globalThis.chrome; });
  const playlists = [
    { id: 'a', name: 'Morning', slots: ['morning'], cache: 'not-yet' },
    { id: 'b', name: 'Evening', slots: ['evening'], cache: 'not-yet' },
  ];
  let rateLimit = false;
  const syncs = [];
  t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    if (url.endsWith('/music/playlists.json')) return Response.json({ us: { morning: [playlists[0]], evening: [playlists[1]] } });
    if (url.endsWith('/api/sync/config')) return Response.json({ clientId: 'client' });
    if (url.includes('/api/token')) return Response.json({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 });
    assert.equal(options.headers.Authorization, 'Bearer access');
    if (url.endsWith('/api/admin/playlists')) return Response.json({ user: { id: 'manager', name: 'Manager' }, playlists });
    if (rateLimit) return Response.json({ error: 'Wait' }, { status: 429, headers: { 'Retry-After': '120' } });
    const id = url.split('/').at(-2);
    syncs.push({ id, ...JSON.parse(options.body) });
    return Response.json({ ...playlists.find((item) => item.id === id), cache: 'cached', checkedAt: Date.now() });
  });
  await import('../extension/background.js');
  const message = (data) => new Promise((resolve) => listeners.message(data, { id: 'test', url: 'chrome-extension://test/dashboard.html' }, resolve));
  const until = async (predicate) => {
    for (let i = 0; i < 100; i++) {
      if (predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.fail('Extension state did not settle');
  };
  const initialized = await message({ type: 'initialize' });
  assert.equal(initialized.data.user, null);
  assert.equal(initialized.data.playlists.length, 2);
  assert.equal(initialized.data.playlists[0].cache, 'unknown');
  assert.equal(oauthPrompts, 0);
  const connected = await message({ type: 'login' });
  assert.equal(connected.data.user.id, 'manager');
  assert.equal(oauthPrompts, 1);
  assert.equal(session.spotify.refreshToken, 'refresh');
  assert.ok(!JSON.stringify(local).includes('accessToken'));
  assert.equal(initialized.data.auto, false);
  assert.equal(listeners.message({ type: 'state' }, { id: 'other', url: 'https://evil.test' }, () => {}), false);
  await message({ type: 'initialize' });
  assert.equal(oauthPrompts, 1);

  await message({ type: 'sync', ids: ['a', 'b'] });
  await until(() => local.dashboard.job === null);
  assert.deepEqual(syncs, [{ id: 'a', force: true }, { id: 'b', force: true }]);
  assert.equal(local.dashboard.lastRun.failures, 0);

  rateLimit = true;
  await message({ type: 'auto', enabled: true });
  await until(() => local.dashboard.retryAt > Date.now());
  assert.equal(local.dashboard.job.pending.length, 2);
  assert.equal(alarms.get('gate7-auto-sync').periodInMinutes, 1);
  rateLimit = false;
  local.dashboard.retryAt = 0;
  // A new module instance simulates service-worker suspension/restart. The job is persisted.
  await import('../extension/background.js?restart');
  listeners.alarm({ name: 'gate7-resume-sync' });
  await until(() => local.dashboard.job === null);
  assert.deepEqual(syncs.slice(-2), [{ id: 'a', force: false }, { id: 'b', force: false }]);
  await message({ type: 'logout' });
  assert.equal(session.spotify, undefined);
  assert.equal(local.dashboard.user, null);
  assert.equal(local.dashboard.auto, false);
  assert.equal(alarms.size, 0);

  await message({ type: 'initialize' });
  oauthFailure = true;
  const failed = await message({ type: 'login' });
  assert.match(failed.error, /https:\/\/test.chromiumapp.org\/spotify/);
  assert.equal(local.dashboard.authIssue, true);
  assert.equal(local.dashboard.connecting, false);
  assert.equal(local.dashboard.playlists.length, 2);
  assert.equal(session.spotify, undefined);
  assert.match((await message({ type: 'sync', ids: ['a'] })).error, /authorized/);
  oauthFailure = false;
  assert.equal((await message({ type: 'login' })).data.user.id, 'manager');
  assert.equal(local.dashboard.authIssue, false);
  await message({ type: 'logout' });
});
