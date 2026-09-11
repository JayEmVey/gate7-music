import React, { useState } from 'react';
import { TimeSlot, Playlist, Language } from '../types';
import { DEFAULT_TRACK_COVER } from '../data';
import { getCurrentSlotKey } from '../utils/spotify';
import { SpotifyItemTarget } from './SpotifyChooserModal';

interface PlaylistGridProps {
  timeSlots: TimeSlot[];
  activePlaylistId: string;
  onSelectPlaylist: (playlist: Playlist) => void;
  onViewAllSlot?: (slot: TimeSlot) => void;
  onOpenSpotify?: (target: SpotifyItemTarget) => void;
  activeFilterTag: string | null;
  searchQuery: string;
  language: Language;
  theme?: 'dark' | 'light';
}

export const PlaylistGrid: React.FC<PlaylistGridProps> = ({
  timeSlots,
  activePlaylistId,
  onSelectPlaylist,
  onOpenSpotify,
  activeFilterTag,
  searchQuery,
  language,
  theme = 'dark',
}) => {
  // Manual override for View All / Collapse. null = follow now-playing auto rules.
  const [manualShowAll, setManualShowAll] = useState<boolean | null>(null);
  const [, forceClockRefresh] = useState(() => Date.now());
  const isLight = theme === 'light';

  React.useEffect(() => {
    const interval = window.setInterval(() => forceClockRefresh(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const currentSlotId = `slot-${getCurrentSlotKey()}`;

  // Auto expand when the active playlist lives outside the clock's current slot;
  // stay collapsed when it belongs to the current slot (or is unknown).
  const activePlaylistInCurrentSlot = React.useMemo(
    () =>
      timeSlots
        .find((slot) => slot.id === currentSlotId)
        ?.playlists.some((playlist) => playlist.id === activePlaylistId) ?? false,
    [timeSlots, currentSlotId, activePlaylistId],
  );

  // Re-apply auto rules whenever playback source or clock slot changes.
  React.useEffect(() => {
    setManualShowAll(null);
  }, [activePlaylistId, currentSlotId]);

  const showAllTimeSlots = manualShowAll ?? !activePlaylistInCurrentSlot;

  const setShowAllTimeSlots = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === 'function' ? next(showAllTimeSlots) : next;
    setManualShowAll(resolved);
  };

  const getSlotStartMinutes = (slot: TimeSlot) => {
    const match = slot.timeRange.match(/(\d+)\s*([AP]M)/i);
    if (!match) return Number.MAX_SAFE_INTEGER;
    let hour = Number(match[1]) % 12;
    if (match[2].toUpperCase() === 'PM') hour += 12;
    return hour * 60;
  };

  const playlistCover = (playlist: Playlist) =>
    playlist.coverUrl || playlist.tracks.find((track) => track.coverUrl)?.coverUrl || DEFAULT_TRACK_COVER;

  // Filter logic based on search and tag
  const matchesSearch = (pl: Playlist) => {
    if (!searchQuery && !activeFilterTag) return true;
    const q = searchQuery.toLowerCase();
    const tag = activeFilterTag?.replace('#', '').toLowerCase() || '';

    const textMatch =
      !searchQuery ||
      pl.title.toLowerCase().includes(q) ||
      pl.description.toLowerCase().includes(q) ||
      pl.tracks.some((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));

    const tagMatch =
      !activeFilterTag ||
      pl.title.toLowerCase().includes(tag) ||
      pl.description.toLowerCase().includes(tag) ||
      (tag.includes('lo-fi') && (pl.title.toLowerCase().includes('lofi') || pl.title.toLowerCase().includes('chill'))) ||
      (tag.includes('indie') && pl.title.toLowerCase().includes('indie')) ||
      (tag.includes('jazz') && (pl.title.toLowerCase().includes('jazz') || pl.id.includes('bossa'))) ||
      (tag.includes('acoustic') && (pl.description.toLowerCase().includes('acoustic') || pl.id.includes('ambient'))) ||
      (tag.includes('deepwork') && (pl.slotId === 'slot-lunch' || pl.title.toLowerCase().includes('focus')));

    return textMatch && tagMatch;
  };

  // When auto-expanded for an out-of-slot playlist, scroll that slot into view once.
  React.useEffect(() => {
    if (manualShowAll !== null) return;
    const inCurrentSlot = timeSlots
      .find((slot) => slot.id === currentSlotId)
      ?.playlists.some((playlist) => playlist.id === activePlaylistId) ?? false;
    if (inCurrentSlot) return;

    const activeSlot = timeSlots.find((slot) =>
      slot.playlists.some((playlist) => playlist.id === activePlaylistId),
    );
    if (!activeSlot) return;

    const timer = window.setTimeout(() => {
      document.getElementById(activeSlot.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
    return () => window.clearTimeout(timer);
    // Only re-scroll when the playback playlist or clock slot changes — not on every timeSlots refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlaylistId, currentSlotId]);

  return (
    <div className="space-y-10">
      {(showAllTimeSlots ? [...timeSlots].sort((a, b) => getSlotStartMinutes(a) - getSlotStartMinutes(b)) : timeSlots.filter((slot) => slot.id === currentSlotId)).map((slot) => {
        const isCurrentSlot = slot.id === currentSlotId;

        const matchingPlaylists = slot.playlists.filter(matchesSearch);
        if (matchingPlaylists.length === 0 && (searchQuery || activeFilterTag)) {
          return null;
        }

        return (
          <section key={slot.id} id={slot.id} className="space-y-4">
            {/* Slot Header */}
            <div
              className={`flex flex-wrap items-end justify-between gap-3 border-b-2 pb-3 ${
                isLight ? 'border-black' : 'border-[#33333E]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2.5">
                  {isCurrentSlot ? (
                    <span
                      className={`text-xs font-black uppercase px-2.5 py-1 border border-black shadow-brutal ${
                        isLight ? 'bg-black text-[#FEBC11]' : 'bg-[#FEBC11] text-[#0D0D0E]'
                      }`}
                    >
                      ★ {language === 'vi' ? 'NOW' : 'NOW'}
                    </span>
                  ) : (
                    <span
                      className="w-3 h-3 border border-black inline-block"
                      style={{ backgroundColor: slot.accentColor }}
                    ></span>
                  )}
                  <h2
                    className={`text-xl md:text-2xl font-black tracking-tight uppercase ${
                      isLight ? 'text-black' : 'text-white'
                    }`}
                  >
                    {slot.timeRange}: {slot.name}
                  </h2>
                </div>
                <p className={`text-xs md:text-sm font-semibold mt-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                  {slot.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Non-current slots show their slot number badge (e.g. SLOT #1, SLOT #3, SLOT #4) */}
                {!isCurrentSlot && (
                  <span
                    className={`text-xs font-mono font-bold border-2 border-black px-2.5 py-0.5 shadow-brutal ${
                      isLight ? 'bg-white text-black' : 'bg-[#202026] text-[#FEBC11]'
                    }`}
                  >
                    {slot.slotNumber}
                  </span>
                )}

                {/* Current slot has the "View All" toggle button (Image 1 / Image 2) */}
                {isCurrentSlot && (
                  <button
                    id="view-all-playlists-btn"
                    onClick={() => setShowAllTimeSlots((prev) => !prev)}
                    className="text-xs font-black uppercase tracking-wider bg-[#FEBC11] hover:bg-yellow-400 text-[#0D0D0E] px-3.5 py-1.5 border-2 border-black shadow-brutal transition-all cursor-pointer flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <span>
                      {language === 'vi'
                        ? (showAllTimeSlots ? 'THU GỌN' : `XEM TẤT CẢ (${slot.playlists.length} KHUNG GIỜ)`)
                        : (showAllTimeSlots ? 'COLLAPSE' : `VIEW ALL (${slot.playlists.length} SLOTS)`)}
                    </span>
                    <span>{showAllTimeSlots ? '←' : '→'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Grid of Playlist Cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
              {matchingPlaylists.map((playlist) => {
                // Single source of truth: only the active Spotify playback playlist.
                // Do not OR with track-membership flags — shared tracks across
                // playlists previously lit multiple LIVE cards at once.
                const isActive = playlist.id === activePlaylistId;
                const cover = playlistCover(playlist);

                return (
                  <div
                    key={playlist.id}
                    onClick={() => onSelectPlaylist(playlist)}
                    className={`group flex flex-col cursor-pointer transition-all hover:-translate-y-1 overflow-hidden ${
                      isActive
                        ? isLight
                          ? 'border-3 border-black shadow-[5px_5px_0px_#000000] bg-[#FFFDF0]'
                          : 'border-2 border-[#FEBC11] shadow-brutal bg-[#1A1A1E]'
                        : isLight
                          ? 'border-2 border-black shadow-[4px_4px_0px_#000000] bg-white hover:shadow-[6px_6px_0px_#000000]'
                          : 'border-2 border-[#24242C] shadow-brutal bg-[#1A1A1E] hover:border-[#FEBC11]/70'
                    }`}
                  >
                    {/* Cover image — full bleed, square aspect ratio */}
                    <div className="relative w-full aspect-square overflow-hidden">
                      <img
                        src={cover}
                        alt={playlist.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Dark gradient overlay at the bottom for legibility */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                      {/* NOW PLAYING badge — top right */}
                      {/* {isActive && (
                        <div className="absolute top-0 right-0 bg-black text-[#FEBC11] text-[9px] font-black uppercase px-2 py-1 border-b border-l border-black tracking-wider">
                          NOW PLAYING
                        </div>
                      )} */}

                      {/* Equalizer animation overlay at bottom-left when now playing */}
                      {isActive && (
                        <div className="absolute bottom-2 left-2 flex items-end gap-0.5 h-4">
                          <span className="w-1 bg-[#FEBC11] rounded-t animate-equalizer-1 h-full opacity-90"></span>
                          <span className="w-1 bg-[#FEBC11] rounded-t animate-equalizer-2 h-full opacity-90"></span>
                          <span className="w-1 bg-[#FEBC11] rounded-t animate-equalizer-3 h-full opacity-90"></span>
                          <span className="w-1 bg-[#FEBC11] rounded-t animate-equalizer-4 h-full opacity-90"></span>
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="flex flex-col flex-1 p-3">
                      <h4
                        className={`font-black text-sm uppercase leading-tight truncate transition-colors ${
                          isLight
                            ? 'text-black group-hover:text-amber-800'
                            : 'text-white group-hover:text-[#FEBC11]'
                        }`}
                      >
                        {playlist.title}
                      </h4>
                      <p className={`text-xs font-medium mt-1 line-clamp-2 leading-relaxed ${
                        isLight ? 'text-gray-700' : 'text-gray-400'
                      }`}>
                        {playlist.description}
                      </p>

                      {/* Footer: track count + duration */}
                      <div
                        className={`mt-auto pt-2.5 flex items-center justify-between font-mono text-xs font-bold ${
                          isLight
                            ? 'border-t border-black/15 text-gray-700'
                            : 'border-t border-[#2A2A35] text-gray-400'
                        }`}
                      >
                        <span>
                          {playlist.duration} • {playlist.trackCount} {language === 'vi' ? 'bài' : 'tracks'}
                        </span>
                        {isActive && (
                          <span className="bg-[#FEBC11] text-[#0D0D0E] px-1.5 py-0.5 font-sans font-black text-[9px] border border-black uppercase">
                            {language === 'vi' ? 'Đang phát' : 'Now Playing'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Collapse button when expanded */}
      {showAllTimeSlots && !searchQuery && !activeFilterTag && (
        <div className="pt-2 flex justify-center">
          <button
            onClick={() => {
              setShowAllTimeSlots(false);
              const currentSlot = timeSlots.find((slot) => slot.id === currentSlotId);
              if (currentSlot) {
                const el = document.getElementById(currentSlot.id);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className={`text-xs font-black uppercase tracking-wider px-4 py-2 border-2 border-black shadow-brutal transition-all cursor-pointer flex items-center gap-2 ${
              isLight
                ? 'bg-white hover:bg-[#FEBC11] text-black'
                : 'bg-[#202026] hover:bg-[#FEBC11] text-gray-300 hover:text-[#0D0D0E] border-[#33333E]'
            }`}
          >
            <span>←</span>
            <span>
              {language === 'vi'
                ? 'Thu gọn về khung giờ hiện tại'
                : 'Collapse to current time frame'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

