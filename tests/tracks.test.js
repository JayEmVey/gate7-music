import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['src/utils/tracks.ts'], bundle: true, write: false,
  platform: 'node', format: 'esm',
});
const { isSameTrack, playlistContainsTrack } = await import(
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
