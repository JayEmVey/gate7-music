import React from 'react';
import { Track, Language } from '../types';
import { getTrackCover } from '../data';

interface SearchResultsModalProps {
  query: string;
  tracks: Track[];
  isOpen: boolean;
  isLoading: boolean;
  error?: string;
  currentTrackId: string;
  isPlaying: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  onPlayTrack: (track: Track) => void;
  language: Language;
}

export const SearchResultsModal: React.FC<SearchResultsModalProps> = ({
  query,
  tracks,
  isOpen,
  isLoading,
  error,
  currentTrackId,
  isPlaying,
  onClose,
  onSearch,
  onPlayTrack,
  language,
}) => {
  const [searchInput, setSearchInput] = React.useState(query);

  React.useEffect(() => {
    setSearchInput(query);
  }, [query]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl bg-[#18181C] border-4 border-[#FEBC11] shadow-brutal-xl p-6 sm:p-8 overflow-y-auto max-h-[90vh] text-gray-100"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 bg-[#222018] hover:bg-[#FEBC11] hover:text-[#0D0D0E] border-2 border-[#FEBC11] flex items-center justify-center font-black text-sm transition-all cursor-pointer shadow-brutal"
          aria-label={language === 'vi' ? 'Đóng kết quả tìm kiếm' : 'Close search results'}
        >
          ✕
        </button>

        <div className="border-b-2 border-[#2E2E38] pb-5 mb-5 pr-10">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#FEBC11]">
            {language === 'vi' ? 'KẾT QUẢ TÌM KIẾM' : 'SEARCH RESULTS'}
          </span>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const nextQuery = searchInput.trim();
              if (nextQuery) onSearch(nextQuery);
            }}
            className="mt-2 flex items-center gap-2"
          >
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              aria-label={language === 'vi' ? 'Từ khóa tìm kiếm' : 'Search keyword'}
              className="min-w-0 flex-1 bg-[#101014] border-2 border-[#3E3E4C] focus:border-[#FEBC11] outline-none px-3 py-2 text-lg sm:text-2xl font-black uppercase text-white"
            />
            <button
              type="submit"
              className="shrink-0 h-10 px-3 bg-[#FEBC11] hover:bg-yellow-400 text-[#0D0D0E] border-2 border-black shadow-brutal font-black uppercase text-xs cursor-pointer"
            >
              <i className="fa-solid fa-magnifying-glass" />
            </button>
          </form>
        </div>

        {isLoading && <p className="px-3 py-8 text-center text-sm text-gray-400">{language === 'vi' ? 'Đang tìm bài hát...' : 'Searching for songs...'}</p>}
        {!isLoading && error && <p className="border-2 border-amber-400 bg-amber-950/40 px-3 py-3 text-sm text-amber-100">{error}</p>}
        {!isLoading && !error && tracks.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-gray-400">{language === 'vi' ? 'Không tìm thấy bài hát phù hợp.' : 'No matching songs found.'}</p>
        )}

        {!isLoading && !error && tracks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black uppercase text-gray-400 px-3 pb-1 border-b border-[#2A2A34]">
              <span>{language === 'vi' ? 'BÀI HÁT' : 'TRACK'}</span>
              <span>{language === 'vi' ? 'PHÁT' : 'PLAY'}</span>
            </div>
            {tracks.map((track, index) => {
              const isCurrent = track.id === currentTrackId;
              return (
                <button
                  type="button"
                  key={`${track.id}-${index}`}
                  onClick={() => onPlayTrack(track)}
                  className={`w-full p-3 border-2 flex items-center justify-between gap-3 shadow-brutal transition-all text-left cursor-pointer group ${
                    isCurrent ? 'bg-[#26241B] border-[#FEBC11]' : 'bg-[#1E1E24] border-[#2E2E38] hover:border-[#FEBC11]/80 hover:bg-[#24242C]'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-7 h-7 bg-[#141416] border border-[#3E3E4C] flex items-center justify-center text-xs font-mono font-bold text-gray-400 shrink-0 group-hover:bg-[#FEBC11] group-hover:text-black">
                      {isCurrent && isPlaying ? <i className="fa-solid fa-volume-high text-[#FEBC11] group-hover:text-black animate-pulse" /> : String(index + 1).padStart(2, '0')}
                    </span>
                    <img src={getTrackCover(track)} alt="" className="w-10 h-10 object-cover border border-black shadow-sm shrink-0" />
                    <span className="min-w-0">
                      <strong className={`block text-xs font-black truncate group-hover:text-[#FEBC11] ${isCurrent ? 'text-[#FEBC11]' : 'text-white'}`}>{track.title}</strong>
                      <span className="block text-[11px] text-gray-400 truncate">{track.artist}{track.album ? ` • ${track.album}` : ''}</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono font-bold text-gray-400">{track.duration}</span>
                    <span className={`w-7 h-7 flex items-center justify-center border text-xs shadow-brutal ${isCurrent ? 'bg-[#FEBC11] text-[#0D0D0E] border-black' : 'bg-[#141416] text-gray-300 border-[#363644] group-hover:bg-[#FEBC11] group-hover:text-black'}`}>
                      <i className={`fa-solid ${isCurrent && isPlaying ? 'fa-pause' : 'fa-play ml-0.5'}`} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};