import React from 'react';
import { Track, Language, Theme } from '../types';
import { getTrackCover } from '../data';
import { useModalBehavior } from './useModalBehavior';

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
  theme?: Theme;
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
  theme = 'dark',
}) => {
  const [searchInput, setSearchInput] = React.useState(query);
  const isLight = theme === 'light';

  React.useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`relative w-full max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] border-4 border-[#FEBC11] shadow-brutal-xl p-4 sm:p-8 overflow-y-auto overflow-x-hidden ${
          isLight ? 'bg-white text-black' : 'bg-[#18181C] text-gray-100'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-5 right-5 z-20 w-8 h-8 hover:bg-[#FEBC11] hover:text-[#0D0D0E] border-2 border-[#FEBC11] flex items-center justify-center font-black text-sm transition-all cursor-pointer shadow-brutal ${
            isLight ? 'bg-white text-black' : 'bg-[#222018]'
          }`}
          aria-label={language === 'vi' ? 'Đóng kết quả tìm kiếm' : 'Close search results'}
        >
          ✕
        </button>

        <div className={`border-b-2 pb-5 mb-5 pr-10 ${isLight ? 'border-gray-200' : 'border-[#2E2E38]'}`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#FEBC11]">
            <span id="search-modal-title">{language === 'vi' ? 'KẾT QUẢ TÌM KIẾM' : 'SEARCH RESULTS'}</span>
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
              className={`min-w-0 flex-1 border-2 focus:border-[#FEBC11] outline-none px-3 py-2 text-sm sm:text-base font-black uppercase ${
                isLight
                  ? 'bg-[#F9FAFB] border-gray-300 text-black'
                  : 'bg-[#101014] border-[#3E3E4C] text-white'
              }`}
            />
            <button
              type="submit"
              className="shrink-0 h-10 px-3 bg-[#FEBC11] hover:bg-yellow-400 text-[#0D0D0E] border-2 border-black shadow-brutal font-black uppercase text-xs cursor-pointer"
            >
              <i className="fa-solid fa-magnifying-glass" />
            </button>
          </form>
        </div>

        {isLoading && (
          <p className={`px-3 py-8 text-center text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
            {language === 'vi' ? 'Đang tìm bài hát...' : 'Searching for songs...'}
          </p>
        )}
        {!isLoading && error && (
          <p className={`border-2 border-amber-400 px-3 py-3 text-sm ${
            isLight ? 'bg-amber-50 text-amber-900' : 'bg-amber-950/40 text-amber-100'
          }`}>{error}</p>
        )}
        {!isLoading && !error && tracks.length === 0 && (
          <p className={`px-3 py-8 text-center text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
            {language === 'vi' ? 'Không tìm thấy bài hát phù hợp.' : 'No matching songs found.'}
          </p>
        )}

        {!isLoading && !error && tracks.length > 0 && (
          <div className="space-y-2">
            <div className={`flex items-center justify-between text-[11px] font-black uppercase px-3 pb-1 border-b ${
              isLight ? 'text-gray-500 border-gray-200' : 'text-gray-400 border-[#2A2A34]'
            }`}>
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
                    isCurrent
                      ? isLight
                        ? 'bg-[#FFFDF0] border-[#FEBC11]'
                        : 'bg-[#26241B] border-[#FEBC11]'
                      : isLight
                        ? 'bg-[#F9FAFB] border-gray-300 hover:border-[#FEBC11]/80 hover:bg-gray-100'
                        : 'bg-[#1E1E24] border-[#2E2E38] hover:border-[#FEBC11]/80 hover:bg-[#24242C]'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`w-7 h-7 border flex items-center justify-center text-xs font-mono font-bold shrink-0 group-hover:bg-[#FEBC11] group-hover:text-black ${
                      isLight
                        ? 'bg-white border-gray-300 text-gray-500'
                        : 'bg-[#141416] border-[#3E3E4C] text-gray-400'
                    }`}>
                      {isCurrent && isPlaying ? <i className="fa-solid fa-volume-high text-[#FEBC11] group-hover:text-black animate-pulse" /> : String(index + 1).padStart(2, '0')}
                    </span>
                    <img src={getTrackCover(track)} alt="" className="w-10 h-10 object-cover border border-black shadow-sm shrink-0" />
                    <span className="min-w-0">
                      <strong className={`block text-xs font-black truncate group-hover:text-[#FEBC11] ${
                        isCurrent ? 'text-[#FEBC11]' : isLight ? 'text-black' : 'text-white'
                      }`}>{track.title}</strong>
                      <span className={`block text-[11px] truncate ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                        {track.artist}{track.album ? ` • ${track.album}` : ''}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-mono font-bold ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{track.duration}</span>
                    <span className={`w-7 h-7 flex items-center justify-center border text-xs shadow-brutal ${
                      isCurrent
                        ? 'bg-[#FEBC11] text-[#0D0D0E] border-black'
                        : isLight
                          ? 'bg-white text-gray-600 border-gray-300 group-hover:bg-[#FEBC11] group-hover:text-black'
                          : 'bg-[#141416] text-gray-300 border-[#363644] group-hover:bg-[#FEBC11] group-hover:text-black'
                    }`}>
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
