import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['src/utils/tracks.ts'], bundle: true, write: false,
  platform: 'node', format: 'esm',
});
const { getActivePlaylistId, getFollowingPlaylistTracks, getUpcomingPlaylistQueue, isSameTrack, playlistContainsTrack } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);

const track = (overrides = {}) => ({
  id: 'local-id',
  spotifyId: 'spotify-id',
  title: 'Mariage D’amour',
  artist: 'Richard Clayderman',
  duration: '2:42',
  durationSec: 162,
  ...overrides,
});

test('matches cached and SDK tracks by Spotify ID even when local IDs differ', () => {
  assert.equal(isSameTrack(track(), track({ id: 'spotify-spotify-id' })), true);
  assert.equal(playlistContainsTrack([track()], track({ id: 'another-id' })), true);
});

test('matches a market-relinked Spotify track by stable metadata and duration', () => {
  assert.equal(isSameTrack(
    track({ spotifyId: 'original-id' }),
    track({ id: 'spotify-relinked-id', spotifyId: 'relinked-id', durationSec: 163 }),
  ), true);
});

test('does not match a different recording with a materially different duration', () => {
  assert.equal(isSameTrack(
    track(),
    track({ id: 'other-local-id', spotifyId: 'other-id', durationSec: 180 }),
  ), false);
});

test('builds the upcoming queue from the selected playlist track', () => {
  const first = track({ spotifyId: 'first', title: 'First' });
  const current = track({ spotifyId: 'current', title: 'Current' });
  const next = track({ spotifyId: 'next', title: 'Next' });
  const last = track({ spotifyId: 'last', title: 'Last' });

  assert.deepEqual(
    getFollowingPlaylistTracks([first, current, next, last], track({ id: 'sdk-current', spotifyId: 'current' })),
    [next, last],
  );
});

test('does not borrow a queue from a playlist that lacks the current track', () => {
  assert.deepEqual(
    getFollowingPlaylistTracks([track({ spotifyId: 'other' })], track({ spotifyId: 'current' })),
    [],
  );
});

const playlist = (overrides = {}) => ({
  id: 'local-playlist',
  spotifyId: 'spotify-playlist',
  title: 'Playlist',
  slotId: 'slot-morning',
  slotName: 'Morning',
  description: '',
  trackCount: 0,
  duration: '0:00',
  icon: 'music',
  accentColor: '#fff',
  tracks: [],
  ...overrides,
});

test('keeps Spotify playlist context active when the new track is missing from stale cache', () => {
  assert.equal(
    getActivePlaylistId(
      [playlist({ tracks: [track({ spotifyId: 'old-track' })] })],
      track({ spotifyId: 'new-track' }),
      'spotify-playlist',
    ),
    'local-playlist',
  );
});

test('uses the previous placement when one Spotify playlist appears in multiple slots', () => {
  const playlists = [
    playlist({ id: 'afternoon-placement' }),
    playlist({ id: 'lunch-placement' }),
  ];

  assert.equal(
    getActivePlaylistId(playlists, track({ spotifyId: 'new-track' }), 'spotify-playlist', 'lunch-placement'),
    'lunch-placement',
  );
});

test('fills a one-track SDK queue with seven upcoming playlist tracks', () => {
  const current = track({ spotifyId: 'current', title: 'Current' });
  const following = Array.from({ length: 8 }, (_, index) => track({
    id: `spotify-next-${index + 1}`,
    spotifyId: `next-${index + 1}`,
    title: `Next ${index + 1}`,
  }));

  const queue = getUpcomingPlaylistQueue([following[0]], [current, ...following], current);

  assert.equal(queue.length, 7);
  assert.deepEqual(queue.map((item) => item.spotifyId), following.slice(0, 7).map((item) => item.spotifyId));
});
