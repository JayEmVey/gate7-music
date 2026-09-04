import React, { useState } from 'react';
import { TimeSlot, Playlist, Language } from '../types';
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
  // By default, only show playlists in the same time frame (slot-current).
  // Clicking "View All" toggles to show all time frames.
  const [showAllTimeSlots, setShowAllTimeSlots] = useState<boolean>(false);
  const isLight = theme === 'light';

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

  return (
    <div className="space-y-10">
      {timeSlots.map((slot) => {
        const isCurrentSlot = Boolean(slot.isCurrentSlot);

        // When not filtering/searching:
        // By default show only playlists in the current time frame (Image 2).
        // If showAllTimeSlots is true, show all time frames (Image 1).
        if (!showAllTimeSlots && !isCurrentSlot && !searchQuery && !activeFilterTag) {
          return null;
        }

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
                      ★ {language === 'vi' ? 'ĐANG CHỌN PHÁT' : 'NOW PLAYING SLOT'}
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
                        ? (showAllTimeSlots ? 'THU GỌN' : `XEM TẤT CẢ (${slot.playlists.length} LIST)`)
                        : (showAllTimeSlots ? 'COLLAPSE' : `VIEW ALL (${slot.playlists.length} LISTS)`)}
                    </span>
                    <span>{showAllTimeSlots ? '←' : '→'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Grid of Playlist Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {matchingPlaylists.map((playlist) => {
                const isActive = playlist.id === activePlaylistId;
                const isNowPlaying = playlist.isNowPlaying;
                const isHighlighted = playlist.isHighlighted;

                // Active / Now Playing Card (Image 1 / 2)
                if (isActive || isNowPlaying) {
                  return (
                    <div
                      key={playlist.id}
                      onClick={() => onSelectPlaylist(playlist)}
                      className={`group p-4 flex flex-col justify-between hover:-translate-y-1 transition-all relative overflow-hidden cursor-pointer ${
                        isLight
                          ? 'bg-[#FFFDF0] border-3 border-black shadow-[5px_5px_0px_#000000]'
                          : 'bg-[#1A1A1E] border-2 border-[#FEBC11] shadow-brutal'
                      }`}
                    >
                      <div className="absolute top-0 right-0 bg-black text-[#FEBC11] text-[9px] font-black uppercase px-2 py-0.5 border-b border-l border-black">
                        {language === 'vi' ? 'NOW PLAYING' : 'ACTIVE'}
                      </div>

                      <div>
                        <div className="w-10 h-10 bg-[#FEBC11] border-2 border-black shadow-brutal flex items-center justify-center text-[#0D0D0E] mb-3 group-hover:rotate-6 transition-transform">
                          <i className={`fa-solid ${playlist.icon} text-base`}></i>
                        </div>
                        <h4
                          className={`font-black text-sm uppercase truncate transition-colors ${
                            isLight ? 'text-black group-hover:text-amber-800' : 'text-white group-hover:text-[#FEBC11]'
                          }`}
                        >
                          {playlist.title}
                        </h4>
                        <p className={`text-xs font-medium mt-1 line-clamp-2 ${isLight ? 'text-gray-800' : 'text-gray-400'}`}>
                          {playlist.description}
                        </p>
                      </div>

                      <div
                        className={`mt-4 pt-3 flex items-center justify-between font-mono text-xs font-bold ${
                          isLight ? 'border-t-2 border-black/15 text-black' : 'border-t border-[#2A2A35]'
                        }`}
                      >
                        <span className={isLight ? 'text-black font-bold' : 'text-gray-400'}>
                          {playlist.trackCount} {language === 'vi' ? 'BÀI' : 'TRACKS'}
                        </span>
                        <span className="bg-[#FEBC11] text-[#0D0D0E] px-2 py-0.5 font-sans font-black border border-black">
                          {playlist.duration}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Highlighted Card (e.g. Bossa Nova Jazz Mix in Slot 1)
                if (isHighlighted) {
                  return (
                    <div
                      key={playlist.id}
                      onClick={() => onSelectPlaylist(playlist)}
                      className={`group p-4 flex flex-col justify-between hover:-translate-y-1 transition-all cursor-pointer ${
                        isLight
                          ? 'bg-white border-2 border-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000]'
                          : 'bg-[#1A1A1E] border-2 border-[#FEBC11] shadow-brutal'
                      }`}
                    >
                      <div>
                        <div className="w-10 h-10 bg-[#24242E] text-white border-2 border-black flex items-center justify-center font-bold text-base mb-2.5 group-hover:rotate-6 transition-transform">
                          <i className={`fa-solid ${playlist.icon}`}></i>
                        </div>
                        <h4 className={`font-black text-sm uppercase truncate ${isLight ? 'text-black' : 'text-white'}`}>
                          {playlist.title}
                        </h4>
                        <p className={`text-xs font-medium mt-1 line-clamp-2 ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>
                          {playlist.description}
                        </p>
                      </div>
                      <div
                        className={`mt-3 pt-2 flex items-center justify-between text-xs font-mono font-bold ${
                          isLight ? 'border-t-2 border-black/10 text-black' : 'border-t border-[#2A2A35] text-gray-400'
                        }`}
                      >
                        <span>{playlist.duration}</span>
                        <span className="bg-[#FEBC11] text-[#0D0D0E] px-1.5 py-0.5 font-sans font-black border border-black">
                          {playlist.trackCount} {language === 'vi' ? 'bài' : 'tracks'}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Standard Cards
                return (
                  <div
                    key={playlist.id}
                    onClick={() => onSelectPlaylist(playlist)}
                    className={`group p-4 flex flex-col justify-between hover:-translate-y-1 transition-all cursor-pointer ${
                      isLight
                        ? 'bg-white border-2 border-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000]'
                        : 'bg-[#1A1A1E] border-2 border-[#24242C] shadow-brutal hover:border-[#FEBC11]/70'
                    }`}
                  >
                    <div>
                      <div
                        className="w-10 h-10 border-2 border-black flex items-center justify-center font-bold text-base mb-2.5 group-hover:rotate-6 transition-transform"
                        style={{
                          backgroundColor: isLight ? `${playlist.accentColor}25` : `${playlist.accentColor}18`,
                          color: playlist.accentColor,
                        }}
                      >
                        <i className={`fa-solid ${playlist.icon}`}></i>
                      </div>
                      <h4
                        className={`font-black text-sm uppercase transition-colors truncate ${
                          isLight ? 'text-black group-hover:text-amber-800' : 'text-white group-hover:text-[#FEBC11]'
                        }`}
                      >
                        {playlist.title}
                      </h4>
                      <p className={`text-xs font-medium mt-1 line-clamp-2 ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>
                        {playlist.description}
                      </p>
                    </div>

                    <div
                      className={`mt-4 pt-3 flex items-center justify-between font-mono text-xs font-bold ${
                        isLight ? 'border-t-2 border-black/10 text-black' : 'border-t border-[#2A2A35] text-gray-400'
                      }`}
                    >
                      {isCurrentSlot ? (
                        <>
                          <span className={isLight ? 'text-black font-bold' : 'text-gray-400'}>
                            {playlist.trackCount} {language === 'vi' ? 'BÀI' : 'TRACKS'}
                          </span>
                          <span className={isLight ? 'text-black font-bold' : 'text-gray-400'}>{playlist.duration}</span>
                        </>
                      ) : (
                        <>
                          <span className={isLight ? 'text-black font-bold' : 'text-gray-400'}>{playlist.duration}</span>
                          <span className={isLight ? 'text-black font-bold' : 'text-gray-400'}>
                            {playlist.trackCount} {language === 'vi' ? 'bài' : 'tracks'}
                          </span>
                        </>
                      )}
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
              const currentSlot = timeSlots.find(s => s.isCurrentSlot);
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

