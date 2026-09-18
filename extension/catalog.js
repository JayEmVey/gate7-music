// This is public website configuration, not authenticated Spotify/cache status.
export function playlistCatalog(configuration) {
  const entries = new Map();
  for (const slots of Object.values(configuration || {})) {
    if (!slots || typeof slots !== 'object') continue;
    for (const [slot, playlists] of Object.entries(slots)) {
      if (!Array.isArray(playlists)) continue;
      for (const playlist of playlists) {
        if (typeof playlist?.id !== 'string' || typeof playlist.name !== 'string') continue;
        const entry = entries.get(playlist.id) || { id: playlist.id, name: playlist.name, coverUrl: playlist.coverUrl, slots: [], cache: 'unknown' };
        if (!entry.slots.includes(slot)) entry.slots.push(slot);
        entries.set(playlist.id, entry);
      }
    }
  }
  return [...entries.values()];
}
