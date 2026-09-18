# Gate 7 Playlist Sync

A Manifest V3 Chrome extension for the Gate 7 manager. Its dashboard shows all 19 configured playlists, all of their time slots, playable track counts, last successful change/sync/check times, added and removed track counts, and Cloudflare KV status.

## Activate

1. In the [Spotify developer dashboard](https://developer.spotify.com/dashboard), open the app with client ID `b25c3d0a87e54a79ad8f3fe8ae961938`. Add this exact redirect URI and save:

   ```text
   https://ppbkbidkldgknkljdkppmhchilabbkkk.chromiumapp.org/spotify
   ```

   The public `key` in `manifest.json` keeps the unpacked extension ID stable. It is not an OAuth secret. Keep it when installing on another computer. A future Chrome Web Store listing may require registering that listing's callback too.

2. Deploy the website and Worker together from the repository root:

   ```sh
   npm run lint
   npm test
   npm run build
   npx wrangler deploy
   ```

   `wrangler.jsonc` includes the SQLite Durable Object migration, the existing KV namespace, and manager allowlist `SPOTIFY_SYNC_ADMIN_IDS=9c5zfo7a4yk73b3u14zm3gt9u`. Additional manager IDs can be comma-separated. The existing curator secrets continue to support cold-cache loads; extension sync uses the manager's OAuth token instead.

3. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select this repository's `extension` directory. Chrome 120 or newer is required.
4. Pin the extension and click its toolbar icon. The dashboard opens in a tab and requests Spotify sign-in on its first load. Sign in as the allowlisted manager. If sign-in is cancelled, use **Connect Spotify** to retry.
5. Click **Sync all playlists** once to create the initial baseline, then enable **Auto-detected synchronization** if desired.

To distribute a ZIP, run `npm run extension:package`. This creates `build/gate7-playlist-sync-1.0.0.zip`. Extract it before choosing **Load unpacked**. No extension build step or third-party browser scripts are needed.

## Controls and status

- **Auto-detected synchronization** checks each configured playlist every minute using Chrome alarms, compares Spotify snapshot and metadata, and downloads tracks only when needed. It defaults to off. It continues when the dashboard tab closes, while Chrome is running. Turning it off stops future automatic runs; an already queued run finishes.
- **Sync** always reads that playlist's latest metadata and every page of tracks, even when its snapshot appears unchanged.
- **Sync all playlists** queues the same manual operation for all unique Spotify IDs. One inaccessible playlist does not stop the others.
- **Refresh status** reloads the server's cache status without triggering a Spotify playlist sync.
- **Disconnect** clears this extension's session credentials, disables automatic checks and clears its pending queue. A request already accepted by the server may still finish. Disconnecting locally does not revoke the Spotify app grant.

“Last change synced” is the time Gate 7 observed and saved a content change, not the original Spotify edit time. “Checked” includes unchanged checks. Added/removed counts compare duplicate track occurrences with the previous saved version; the initial baseline counts every imported track as added. Counts remain visible until the next content change. Reordering or metadata-only changes can show `+0 / −0`.

Cache states:

- **Not yet:** no saved playlist record.
- **Cached:** Cloudflare accepted the KV write (or an existing record was found).
- **Error:** a check, download, or cache write failed. The row shows the reason; retry with **Sync**.

The website does not poll for playlist updates or request the revision manifest on page load, tab focus, or reconnect. Automatic Spotify update detection runs only in this extension. When a visitor opens or explicitly retries a playlist, the website requests its cached tracks and updates the displayed track count and duration. An already-open playlist stays as displayed until reopened or retried; playback is preserved. Website card names and covers continue to come from the configured playlist JSON. KV propagation, network outages and Spotify rate limits can delay visibility of updates.

## Authentication and authorization

Spotify Authorization Code with PKCE (`S256`) uses a fresh random verifier and state, with exact callback and state validation. The extension requests only `playlist-read-private`, `playlist-read-collaborative`, and `user-read-private`. No Spotify client secret or Cloudflare API credential is shipped in the extension.

Access and refresh tokens live in `chrome.storage.session`, restricted to trusted extension contexts. They survive extension service-worker suspension but are cleared when Chrome exits or the extension reloads. Reopen the dashboard to sign in again after restarting Chrome. Background alarms never open an authentication window.

Every admin request sends the Spotify bearer token over HTTPS to the Gate 7 Worker. The Worker checks `/v1/me` against its manager allowlist and only permits the configured playlist IDs. It fetches Spotify data itself; the extension cannot upload arbitrary tracks into the cache. OAuth credentials are not saved in KV or the Durable Object. In Spotify Development Mode, the account must have the required app access and own or collaborate on each playlist; otherwise its row will show Spotify's access failure.

## Implementation

- `src/playlist-sync.js`: shared catalog from `public/music/playlists.json`, manager authorization, Spotify pagination and snapshot checks, persistent rate-limit cooldown, serial sync coordinator and status API.
- `src/index.js`: admin routes, public manifest, existing array-shaped track API with revision headers, coordinator fallback during KV propagation.
- `src/hooks/usePlaylistSync.ts`: on-demand cached-track loading, session-cache migration, updates across repeated playlist placements, and protection against late fetch/enrichment responses. No polling or focus/reconnect refreshes.
- `extension/background.js`: OAuth lifecycle, persistent work queue, Chrome alarms and dashboard commands.
- `extension/dashboard.*`: dashboard without external scripts or fonts.

API routes:

| Route | Access | Purpose |
| --- | --- | --- |
| `GET /api/sync/config` | Public | Public Spotify client ID |
| `GET /api/admin/playlists` | Manager bearer token | Identity and authoritative dashboard status |
| `POST /api/admin/playlists/:id/sync` | Manager bearer token | `{ "force": true }` for manual sync; `false` for detection and sync |
| `GET /api/playlists/manifest` | Public | Lightweight published revisions and display metadata |
| `GET /api/playlists/:id/tracks?revision=…` | Public | Compatible track array, with `X-Playlist-Revision` |

A single named Durable Object serializes publishers and retains complete records plus status in durable storage. It checks the Spotify snapshot before and after pagination, retries one changing snapshot, and preserves the previous complete dataset on download failure. Each request has a 22-second download budget and a 10,000-item cap; hitting either produces a visible error instead of publishing a partial playlist. Unavailable items, local files and podcast episodes are omitted from the site's music list.

The coordinator stores a complete downloaded record before mirroring it to KV. If KV fails, the row reports **Error**, and the next automatic/manual check retries publication even if Spotify is unchanged. The complete record remains recoverable. `429 Retry-After` is persisted by the coordinator and extension; automatic runs resume after cooldown. Interrupted extension jobs resume from their persisted pending IDs. A lost response can cause a safe repeat sync.

The extension does not intercept Spotify's UI or receive a Spotify webhook. Automatic detection requires Chrome to be running and an authenticated session. No Cloudflare Cron Trigger is installed. New playlist IDs or time-slot assignments still come from `public/music/playlists.json` and require a deployment.

## Verification

`npm test` covers authorization rejection, PKCE/state validation, pagination, duplicates, metadata-only and empty updates, concurrent writers, mid-download edits, KV failure recovery, KV propagation, token handling, automatic/manual queues, rate limits and extension service-worker restart. `npm run lint`, `npm run build`, and `npx wrangler deploy --dry-run` validate the app and Worker bundle.

Before using with customers, complete one live sign-in and sync after the callback registration/deployment. Add and remove a track in a manager-owned playlist, verify its dashboard counts, then reopen that playlist on the website to load the updated cache. Leaving the website idle or switching tabs must not send playlist-manifest requests.

References: [Spotify PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow), [Chrome identity](https://developer.chrome.com/docs/extensions/reference/api/identity), [Chrome alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms), [Chrome session storage](https://developer.chrome.com/docs/extensions/reference/api/storage), [Cloudflare KV consistency](https://developers.cloudflare.com/kv/concepts/how-kv-works/).
