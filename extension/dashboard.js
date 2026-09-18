const $ = (id) => document.getElementById(id);
let current;
let busy = false;
const date = (value) => value ? new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not yet';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function render(data) {
  current = data;
  const connected = Boolean(data.user);
  $('account').textContent = data.connecting ? 'Connecting to Spotify…' : connected ? `Connected · ${data.user.name}` : 'Connect your Spotify manager account';
  $('connection-dot').classList.toggle('connected', connected);
  $('connect').hidden = connected;
  $('connect').disabled = data.connecting || busy;
  $('disconnect').hidden = !connected;
  $('disconnect').disabled = busy || data.connecting;
  $('auto').disabled = !connected || busy;
  $('auto').setAttribute('aria-pressed', String(data.auto));
  $('auto').textContent = `Auto-detected synchronization · ${data.auto ? 'On' : 'Off'}`;
  $('sync-all').disabled = !connected || Boolean(data.job) || busy;
  $('refresh').disabled = !connected || Boolean(data.job) || busy;
  $('redirect').textContent = data.redirectUri || '';
  $('total').textContent = data.playlists.length || '—';
  $('cached').textContent = data.playlists.filter((item) => item.cache === 'cached').length;
  $('errors').textContent = data.playlists.filter((item) => item.cache !== 'cached').length;
  $('last-run').textContent = date(data.lastRun?.finishedAt);
  $('notice').hidden = !data.error;
  $('notice').textContent = data.error || '';
  $('progress').textContent = data.job
    ? `${data.job.force ? 'Syncing' : 'Checking'} playlists · ${data.job.completed} of ${data.job.total} completed${data.retryAt > Date.now() ? ` · Resumes after ${date(data.retryAt)}` : !connected ? ' · Reconnect Spotify to resume' : ''}`
    : data.lastRun ? `Last run complete · ${data.lastRun.total - data.lastRun.failures} succeeded${data.lastRun.failures ? ` · ${data.lastRun.failures} need attention` : ''}` : '';
  $('empty').hidden = data.playlists.length > 0;
  const rows = data.playlists.map((item) => {
    const tr = element('tr');
    const info = element('td');
    const wrap = element('div', undefined, 'playlist');
    const cover = item.metadata?.coverUrl || item.coverUrl;
    const img = element('img', undefined, 'art');
    img.alt = '';
    if (cover?.startsWith('https://')) img.src = cover;
    const description = element('div');
    const link = element('a', item.metadata?.name || item.name);
    link.href = `https://open.spotify.com/playlist/${encodeURIComponent(item.id)}`;
    link.target = '_blank'; link.rel = 'noopener';
    description.append(link, element('span', item.slots.join(' / '), 'slots'));
    wrap.append(img, description); info.append(wrap);
    const updated = element('td', date(item.updatedAt));
    updated.append(element('span', `Checked ${date(item.checkedAt)}`, 'sub'));
    const delta = element('td', item.changes ? `+${item.changes.added} added` : '—', 'delta');
    if (item.changes) delta.append(element('span', `−${item.changes.removed} removed`, 'sub'));
    const status = element('td');
    const active = data.activeId === item.id;
    status.append(element('span', active ? 'Syncing…' : item.cache === 'cached' ? 'Cached' : item.cache === 'error' ? 'Error' : 'Not yet', `badge ${active ? 'syncing' : item.cache}`));
    if (item.error) status.append(element('span', item.error, 'row-error'));
    const action = element('td');
    const button = element('button', active ? 'Syncing…' : 'Sync', 'quiet');
    button.disabled = !connected || Boolean(data.job) || busy;
    button.setAttribute('aria-label', `Sync ${item.metadata?.name || item.name}`);
    button.addEventListener('click', () => command({ type: 'sync', ids: [item.id] }));
    action.append(button);
    tr.append(info, element('td', item.trackCount ?? '—'), updated, delta, status, action);
    return tr;
  });
  $('playlists').replaceChildren(...rows);
}

async function command(message) {
  busy = true;
  if (current) render(current);
  try {
    const result = await chrome.runtime.sendMessage(message);
    if (result.error) throw new Error(result.error);
    if (result.data) render(result.data);
  } catch (error) {
    $('notice').textContent = error.message;
    $('notice').hidden = false;
  } finally {
    busy = false;
    // Keep an action error visible until the next state change.
    if (current) {
      const error = $('notice').hidden ? null : $('notice').textContent;
      render(current);
      if (error) { $('notice').textContent = error; $('notice').hidden = false; }
    }
  }
}

$('connect').addEventListener('click', () => command({ type: 'login' }));
$('disconnect').addEventListener('click', () => command({ type: 'logout' }));
$('refresh').addEventListener('click', () => command({ type: 'refresh' }));
$('sync-all').addEventListener('click', () => command({ type: 'sync', ids: current.playlists.map((item) => item.id) }));
$('auto').addEventListener('click', () => command({ type: 'auto', enabled: !current.auto }));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.dashboard?.newValue) render(changes.dashboard.newValue);
});
await command({ type: 'state' });
await command({ type: 'initialize' });
