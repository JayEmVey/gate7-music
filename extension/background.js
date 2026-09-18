import { SITE, createAuthorization, authorizationCode, authorizationFailure, requestTokens } from './auth.js';
import { playlistCatalog } from './catalog.js';

const AUTO_ALARM = 'gate7-auto-sync';
const RESUME_ALARM = 'gate7-resume-sync';
let stateTail = Promise.resolve();
let tokenPromise;
let loginPromise;
let runner;
let generation = 0;

const ready = Promise.all([
  chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
]);

async function state() {
  await ready;
  const { dashboard = {} } = await chrome.storage.local.get('dashboard');
  return { playlists: [], auto: false, user: null, job: null, ...dashboard, redirectUri: chrome.identity.getRedirectURL('spotify') };
}

function update(change) {
  const work = stateTail.then(async () => {
    const previous = await state();
    const next = { ...previous, ...(typeof change === 'function' ? change(previous) : change) };
    await chrome.storage.local.set({ dashboard: next });
    return next;
  });
  stateTail = work.catch(() => {});
  return work;
}

async function configuration() {
  const response = await fetch(`${SITE}/api/sync/config`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) {
    throw new Error('Deploy the Gate 7 playlist sync Worker before connecting this extension.');
  }
  const data = await response.json();
  if (!data.clientId) throw new Error('The Worker is missing SPOTIFY_CLIENT_ID.');
  await update({ clientId: data.clientId });
  return data;
}

async function loadCatalog() {
  const response = await fetch(`${SITE}/music/playlists.json`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Could not load Gate 7’s public playlist catalog. Check your connection and reopen the dashboard.');
  const playlists = playlistCatalog(await response.json());
  if (!playlists.length) throw new Error('Gate 7’s public playlist catalog is empty or invalid.');
  await update({ playlists });
}

async function accessToken() {
  if (tokenPromise) return tokenPromise;
  const authGeneration = generation;
  tokenPromise = (async () => {
    const { spotify } = await chrome.storage.session.get('spotify');
    if (!spotify?.refreshToken) throw Object.assign(new Error('Connect Spotify to start syncing.'), { status: 401 });
    if (spotify.expiresAt > Date.now() + 60000) return spotify.accessToken;
    const { clientId } = await configuration();
    const next = await requestTokens({ grant_type: 'refresh_token', refresh_token: spotify.refreshToken, client_id: clientId });
    if (generation !== authGeneration) throw new Error('Spotify was disconnected.');
    next.refreshToken ||= spotify.refreshToken;
    await chrome.storage.session.set({ spotify: next });
    return next.accessToken;
  })().finally(() => { tokenPromise = null; });
  return tokenPromise;
}

async function api(path, body, retry = true) {
  const authGeneration = generation;
  const token = await accessToken();
  if (generation !== authGeneration) throw new Error('Spotify was disconnected.');
  const response = await fetch(`${SITE}${path}`, {
    method: body ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(28000),
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (generation !== authGeneration) throw new Error('Spotify was disconnected.');
  if (response.status === 401 && retry) {
    const { spotify } = await chrome.storage.session.get('spotify');
    if (spotify) await chrome.storage.session.set({ spotify: { ...spotify, expiresAt: 0 } });
    return api(path, body, false);
  }
  const data = response.headers.get('Content-Type')?.includes('application/json') ? await response.json() : {};
  if (!response.ok) {
    throw Object.assign(new Error(data.error || `Gate 7 returned ${response.status}.`), {
      status: response.status, retryAfter: Number(response.headers.get('Retry-After')) || 60,
    });
  }
  return data;
}

async function refreshStatus() {
  const data = await api('/api/admin/playlists');
  await update({ user: data.user, playlists: data.playlists, error: null, authIssue: false });
  return data;
}

async function login() {
  if (loginPromise) return loginPromise;
  const authGeneration = generation;
  loginPromise = (async () => {
    await update({ connecting: true, error: null, authIssue: false });
    const { clientId } = await configuration();
    const redirectUri = chrome.identity.getRedirectURL('spotify');
    const auth = await createAuthorization(clientId, redirectUri);
    let callback;
    try {
      callback = await chrome.identity.launchWebAuthFlow({ url: auth.url, interactive: true });
    } catch (error) {
      throw authorizationFailure(error, clientId, redirectUri);
    }
    if (!callback) throw new Error('Spotify sign-in was cancelled.');
    const code = authorizationCode(callback, redirectUri, auth.state);
    const tokens = await requestTokens({
      client_id: clientId, grant_type: 'authorization_code', code,
      redirect_uri: redirectUri, code_verifier: auth.verifier,
    });
    if (!tokens.refreshToken) throw new Error('Spotify did not issue a refresh token. Please reconnect.');
    if (generation !== authGeneration) throw new Error('Spotify was disconnected.');
    await chrome.storage.session.set({ spotify: tokens });
    await refreshStatus();
    await restoreAlarms();
    void resume();
  })().catch(async (error) => {
    await chrome.storage.session.remove('spotify');
    await update({ user: null, error: error.message, authIssue: true });
    throw error;
  }).finally(async () => {
    await update({ connecting: false });
    loginPromise = null;
  });
  return loginPromise;
}

async function row(id, patch) {
  await update((current) => ({ playlists: current.playlists.map((item) => item.id === id ? { ...item, ...patch } : item) }));
}

async function start(ids, force) {
  await update((current) => {
    if (!current.user) throw new Error('Connect an authorized Spotify manager account first.');
    if (current.job) throw new Error('A sync is already queued. It will resume automatically.');
    if (!Array.isArray(ids) || !ids.length || ids.some((id) => !current.playlists.some((item) => item.id === id))) throw new Error('Select a configured playlist.');
    const pending = [...new Set(ids)];
    return { job: { pending, total: pending.length, force, startedAt: Date.now(), completed: 0, failures: 0 }, error: null };
  });
  await chrome.alarms.create(RESUME_ALARM, { periodInMinutes: 0.5 });
  void resume();
}

async function resume() {
  if (runner) return runner;
  const runGeneration = generation;
  runner = (async () => {
    for (;;) {
      const current = await state();
      if (runGeneration !== generation || !current.job || !current.user) return;
      if (current.retryAt > Date.now()) return;
      const id = current.job.pending[0];
      if (!id) {
        await update({ job: null, lastRun: { finishedAt: Date.now(), total: current.job.total, failures: current.job.failures }, activeId: null });
        await chrome.alarms.clear(RESUME_ALARM);
        return;
      }
      await update({ activeId: id });
      let failed = false;
      try {
        const result = await api(`/api/admin/playlists/${id}/sync`, { force: current.job.force });
        if (runGeneration !== generation) return;
        await row(id, { ...result, error: null });
      } catch (error) {
        if (runGeneration !== generation) return;
        failed = true;
        await row(id, { cache: 'error', error: error.message, checkedAt: Date.now() });
        if (error.status === 429) {
          await update({ retryAt: Date.now() + error.retryAfter * 1000, activeId: null, error: 'Spotify is busy. Sync will resume after the cooldown.' });
          return;
        }
        if (error.status === 401) {
          await chrome.storage.session.remove('spotify');
          await update({ user: null, activeId: null, error: 'Spotify session expired. Reconnect to resume the queued sync.' });
          return;
        }
      }
      await update((latest) => ({
        activeId: null, retryAt: null, error: null,
        job: latest.job ? { ...latest.job, pending: latest.job.pending.slice(1), completed: latest.job.completed + 1, failures: latest.job.failures + Number(failed) } : null,
      }));
    }
  })().catch(async (error) => {
    await update({ activeId: null, error: error.message });
  }).finally(() => { runner = null; });
  return runner;
}

async function restoreAlarms() {
  const current = await state();
  if (current.auto) {
    if (!await chrome.alarms.get(AUTO_ALARM)) await chrome.alarms.create(AUTO_ALARM, { periodInMinutes: 1 });
  } else await chrome.alarms.clear(AUTO_ALARM);
  if (current.job && !await chrome.alarms.get(RESUME_ALARM)) await chrome.alarms.create(RESUME_ALARM, { periodInMinutes: 0.5 });
}

async function handle(message) {
  await ready;
  switch (message.type) {
    case 'state': return state();
    case 'initialize': {
      await restoreAlarms();
      let catalogError = null;
      try { await loadCatalog(); }
      catch (error) { catalogError = error.message; }
      const { spotify } = await chrome.storage.session.get('spotify');
      // Show the sign-in prompt on first load. Chrome recommends launching the
      // interactive OAuth window from an explicit user action, not initialization.
      if (!spotify) await update({ user: null, connecting: false, error: catalogError });
      else {
        try { await refreshStatus(); }
        catch (error) {
          if (error.status === 401) {
            await chrome.storage.session.remove('spotify');
            await update({ user: null, connecting: false, error: 'Your Spotify session expired. Click Connect Spotify to sign in again.' });
          }
          else { await update({ user: null, error: error.message }); throw error; }
        }
      }
      void resume();
      return state();
    }
    case 'login': await login(); return state();
    case 'logout':
      generation++;
      await chrome.storage.session.remove('spotify');
      await update({ user: null, auto: false, job: null, activeId: null, error: null, connecting: false, authIssue: false });
      await chrome.alarms.clearAll();
      return state();
    case 'refresh': await refreshStatus(); return state();
    case 'sync': await start(message.ids, true); return state();
    case 'auto': {
      await update({ auto: Boolean(message.enabled) });
      await restoreAlarms();
      const current = await state();
      if (current.auto && current.user && !current.job) await start(current.playlists.map((item) => item.id), false);
      return state();
    }
    default: throw new Error('Unknown extension command.');
  }
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL('dashboard.html'))) return false;
  handle(message).then((data) => respond({ data })).catch((error) => respond({ error: error.message }));
  return true;
});
chrome.action.onClicked.addListener(() => { void chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') }); });
chrome.runtime.onInstalled.addListener(() => { void restoreAlarms(); });
chrome.runtime.onStartup.addListener(() => {
  void update({ user: null, activeId: null, connecting: false, error: 'Open this dashboard and reconnect Spotify to resume syncing.' }).then(restoreAlarms);
});
chrome.alarms.onAlarm.addListener((alarm) => {
  void (async () => {
    const current = await state();
    if (current.job) return resume();
    if (alarm.name === AUTO_ALARM && current.auto && current.user) await start(current.playlists.map((item) => item.id), false);
  })().catch((error) => update({ error: error.message }));
});
