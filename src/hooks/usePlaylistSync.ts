import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { Playlist, TimeSlot, Track } from '../types';
import { fetchCachedPlaylistTracks, enrichSpotifyPlaylistTracksWithAudioFeatures } from '../utils/spotify';

type SpotifyTrack = Awaited<ReturnType<typeof fetchCachedPlaylistTracks>>[number];
const durationLabel = (seconds: number) => `${Math.floor(seconds / 3600)}H ${Math.floor(seconds % 3600 / 60)}M`;

export function usePlaylistSync({ setSlots, setSelected, mapTrack }: {
  setSlots: Dispatch<SetStateAction<TimeSlot[]>>;
  setSelected: Dispatch<SetStateAction<Playlist | null>>;
  mapTrack: (track: SpotifyTrack) => Track;
}) {
  const cache = useRef(new Map<string, Track[]>());
  const generations = useRef(new Map<string, number>());
  const requests = useRef(new Map<string, Promise<void>>());
  const mounted = useRef(true);

  const publish = useCallback((id: string, tracks: Track[]) => {
    cache.current.set(id, tracks);
    const patch = (playlist: Playlist): Playlist => playlist.spotifyId === id ? {
      ...playlist, tracks, trackCount: tracks.length, loadError: undefined,
      duration: durationLabel(tracks.reduce((sum, track) => sum + track.durationSec, 0)),
    } : playlist;
    setSlots((previous) => previous.map((slot) => ({ ...slot, playlists: slot.playlists.map(patch) })));
    setSelected((previous) => previous ? patch(previous) : previous);
  }, [setSlots, setSelected]);

  const refresh = useCallback((id: string): Promise<void> => {
    const key = id;
    const existing = requests.current.get(key);
    if (existing) return existing;
    const generation = (generations.current.get(id) || 0) + 1;
    generations.current.set(id, generation);
    const isCurrent = () => mounted.current && generations.current.get(id) === generation;
    const request = (async () => {
      try {
        const spotifyTracks = await fetchCachedPlaylistTracks(id);
        if (!isCurrent()) return;
        const previous = new Map<string | undefined, Track>((cache.current.get(id) || []).map((track) => [track.spotifyId, track]));
        let tracks = spotifyTracks.map((track) => {
          const mapped = mapTrack(track);
          const old = previous.get(track.id);
          return old?.audioFeaturesSource === 'worker' ? { ...mapped, audioFeatures: old.audioFeatures, audioFeaturesSource: old.audioFeaturesSource } : mapped;
        });
        publish(id, tracks);
        const save = () => {
          try { sessionStorage.setItem(`gate7_playlist_tracks:v5:${id}`, JSON.stringify({ tracks })); } catch { /* Optional warm cache. */ }
        };
        save();
        // Enrichment is cache-only and may finish after a newer playlist refresh.
        if (tracks.some((track) => !track.audioFeatures)) {
          const enriched = await enrichSpotifyPlaylistTracksWithAudioFeatures(spotifyTracks);
          if (!isCurrent()) return;
          tracks = enriched.map((track, index) => track.audioFeatures ? mapTrack(track) : tracks[index]);
          publish(id, tracks);
          save();
        }
      } catch (error) {
        if (!isCurrent()) return;
        setSelected((previous) => previous?.spotifyId === id ? {
          ...previous, loadError: error instanceof Error ? error.message : 'Could not refresh this playlist.',
        } : previous);
      } finally {
        requests.current.delete(key);
      }
    })();
    requests.current.set(key, request);
    return request;
  }, [mapTrack, publish, setSelected]);

  const loadPlaylistTracks = useCallback(async (playlist: Playlist) => {
    setSelected({ ...playlist, loadError: undefined });
    const id = playlist.spotifyId;
    if (!id) return;
    let tracks = cache.current.get(id);
    if (!tracks) {
      try {
        const warm = JSON.parse(sessionStorage.getItem(`gate7_playlist_tracks:v5:${id}`) || 'null');
        if (Array.isArray(warm?.tracks)) tracks = warm.tracks;
      } catch { /* Ignore outdated or damaged optional cache. */ }
    }
    if (tracks) publish(id, tracks);
    // Fetch only when the visitor opens or explicitly retries a playlist.
    // Automatic Spotify update detection belongs to the manager's extension.
    await refresh(id);
  }, [publish, refresh, setSelected]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return loadPlaylistTracks;
}
