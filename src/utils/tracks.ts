import type { Track } from '../types';

const normalizeText = (value?: string) =>
  value?.trim().toLocaleLowerCase().replace(/\s+/g, ' ') || '';

const spotifyIdFromTrack = (track: Track): string => {
  if (track.spotifyId) return track.spotifyId;
  return track.id.startsWith('spotify-') ? track.id.slice('spotify-'.length) : '';
};

/** Match the same song across local, cached, and Spotify SDK track shapes. */
export function isSameTrack(left: Track, right: Track): boolean {
  if (left.id === right.id) return true;

  const leftSpotifyId = spotifyIdFromTrack(left);
  const rightSpotifyId = spotifyIdFromTrack(right);
  if (leftSpotifyId && rightSpotifyId && leftSpotifyId === rightSpotifyId) return true;

  // Spotify can relink a track to another market-specific ID. Use metadata only
  // when title, artist, and duration all agree closely enough to identify it.
  const sameMetadata = normalizeText(left.title) === normalizeText(right.title)
    && normalizeText(left.artist) === normalizeText(right.artist);
  const durationDifference = Math.abs((left.durationSec || 0) - (right.durationSec || 0));
  return sameMetadata && durationDifference <= 2;
}

export function playlistContainsTrack(tracks: Track[], currentTrack: Track): boolean {
  return tracks.some((track) => isSameTrack(track, currentTrack));
}
