import type { Playlist, Track } from '../types';

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

/** Return the playlist sequence that follows the currently playing track. */
export function getFollowingPlaylistTracks(tracks: Track[], currentTrack: Track): Track[] {
  const currentIndex = tracks.findIndex((track) => isSameTrack(track, currentTrack));
  return currentIndex < 0 ? [] : tracks.slice(currentIndex + 1);
}

/** Fill Spotify's short SDK look-ahead with tracks from the active playlist. */
export function getUpcomingPlaylistQueue(
  spotifyNextTracks: Track[],
  playlistTracks: Track[],
  currentTrack: Track,
  limit = 7,
): Track[] {
  const upcoming: Track[] = [];
  for (const track of [...spotifyNextTracks, ...getFollowingPlaylistTracks(playlistTracks, currentTrack)]) {
    if (isSameTrack(track, currentTrack) || upcoming.some((queued) => isSameTrack(queued, track))) continue;
    upcoming.push(track);
    if (upcoming.length === limit) break;
  }
  return upcoming;
}

/** Resolve the single playlist that owns the current playback context. */
export function getActivePlaylistId(
  playlists: Playlist[],
  currentTrack: Track,
  contextSpotifyId?: string,
  previousPlaylistId?: string,
): string {
  if (contextSpotifyId) {
    const contextPlaylists = playlists.filter((playlist) => playlist.spotifyId === contextSpotifyId);
    const previousContextPlaylist = contextPlaylists.find((playlist) => playlist.id === previousPlaylistId);
    // Spotify's context is authoritative even when the local playlist cache is
    // stale and does not contain the newly started track yet.
    if (previousContextPlaylist) return previousContextPlaylist.id;
    if (contextPlaylists[0]) return contextPlaylists[0].id;
  }

  const matchingPlaylists = playlists.filter((playlist) => playlistContainsTrack(playlist.tracks, currentTrack));
  return matchingPlaylists.find((playlist) => playlist.id === previousPlaylistId)?.id
    || matchingPlaylists[0]?.id
    || '';
}
