import React, { useState, useEffect } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Language } from '../types';
import { SonicPairingG7Icon } from './SonicPairingG7Icon';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchSubmit: () => void;
  onRequestClick: () => void;
  onSpotifyClick?: () => void;
  onBoothClick: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  onRequestClick,
  onSpotifyClick,
  onBoothClick,
  language,
  setLanguage,
  theme,
  onToggleTheme,
}) => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const daysVi = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'];
      const daysEn = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const dayName = language === 'vi' ? daysVi[now.getDay()] : daysEn[now.getDay()];
      setCurrentTime(`${hours}:${minutes}:${seconds} • ${dayName}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  const isLight = theme === 'light';

  return (
    <>
      {/* Top Ticker Tape Banner */}
      <div className="bg-[#FEBC11] border-b-2 border-black py-1.5 px-4 text-xs font-black uppercase tracking-wider flex items-center justify-between overflow-hidden select-none z-30 text-[#0D0D0E]">
        <div className="flex items-center gap-4 sm:gap-6 whitespace-nowrap overflow-x-hidden font-extrabold text-[11px] md:text-xs">
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-bolt text-[#0D0D0E] animate-bounce"></i>
            {language === 'vi' ? 'TRẠM PHÁT SÓNG CÀ PHÊ GATE 7' : 'GATE 7 COFFEE ROASTERY SOUNDSTAGE'}
          </span>
          <span>★</span>
          <span className="bg-[#0D0D0E] text-[#FEBC11] px-2 py-0.5 rounded-sm">
            {language === 'vi' ? 'GIAI ĐIỆU ĐÁNH THỨC VỊ GIÁC' : 'FLAVOR-AWAKENING MELODIES'}
          </span>
          <span>★</span>
          <span>LIVE ROASTERY BEATS 72dB LO-FI ACOUSTIC</span>

          <span>★</span>
          <span className="hidden md:inline"> SOUNDSTAGE</span>
        </div>

        
      </div>

      {/* Main Header */}
      <header
        className={`sticky top-0 z-40 px-4 lg:px-8 py-3.5 transition-colors duration-200 ${
          isLight
            ? 'bg-white border-b-3 border-black shadow-md text-black'
            : 'bg-[#17171A] border-b-2 border-[#2A2A32] shadow-xl text-white'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Gate 7 Official Brand Logo - Gently placed directly on the page */}
          <div className="flex items-center shrink-0">
            <div
              onClick={onBoothClick}
              className="cursor-pointer transition-transform hover:scale-[1.02] flex items-center py-1 select-none"
              title="Gate 7 Coffee Roastery"
            >
              <img
                alt="Gate 7 Coffee Roastery"
                src={
                  isLight
                    ? 'https://gate7.vn/images/logo-color-white-bg1.webp'
                    : 'https://gate7.vn/images/logo-color-black-bg1-large.webp'
                }
                className={`h-9 md:h-11 w-auto object-contain transition-all ${
                  isLight ? 'mix-blend-multiply' : 'mix-blend-screen'
                }`}
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl hidden md:flex items-center gap-2">
            <div className="relative w-full">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onSearchSubmit();
                  }
                }}
                placeholder={language === 'vi' ? 'Tìm bài hát, nghệ sĩ, playlist đang phát tại Gate 7...' : 'Search songs, artists, playlists at Gate 7...'}
                className={`w-full text-xs font-bold pl-10 pr-4 py-2.5 border-2 border-black shadow-brutal focus:outline-none focus:border-[#FEBC11] transition-all ${
                  isLight
                    ? 'bg-white text-black placeholder-gray-500'
                    : 'bg-[#1F1F24] text-white placeholder-gray-400'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black ${
                    isLight ? 'text-gray-600 hover:text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Request Button 
            <button
              id="header-request-btn"
              onClick={onRequestClick}
              className="flex items-center gap-1.5 bg-[#FEBC11] hover:bg-yellow-400 text-[#0D0D0E] font-black text-xs px-3.5 py-2 border-2 border-black shadow-brutal active:translate-x-0.5 active:translate-y-0.5 transition-all uppercase tracking-wide cursor-pointer"
            >
              <i className="fa-solid fa-hand-holding-heart text-sm"></i>
              <span className="hidden sm:inline">{language === 'vi' ? 'Yêu cầu bài' : 'Song Request'}</span>
              <span className="sm:hidden">Request</span>
            </button> */}

            {/* Auto-Connected Spotify Indicator 
            <div
              className={`hidden sm:flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1.5 border-2 border-black shadow-brutal select-none ${
                isLight
                  ? 'bg-[#E8F8F0] text-[#0A7336]'
                  : 'bg-[#1DB954]/15 text-[#1ed760]'
              }`}
              title="Spotify Connected (Gate 7 Roastery)"
            >
              <i className="fa-brands fa-spotify text-sm text-[#1DB954]"></i>
              <span className="hidden lg:inline">Gate 7 Spotify</span>
            </div> */}

            {/* Language Toggle */}
            <div className={`flex border-2 border-black p-0.5 font-black text-xs shadow-brutal ${isLight ? 'bg-white' : 'bg-[#141416]'}`}>
              <button
                onClick={() => setLanguage('vi')}
                className={`px-2 py-1 transition-all ${
                  language === 'vi'
                    ? 'bg-[#FEBC11] text-[#0D0D0E] shadow-sm'
                    : isLight
                    ? 'text-gray-600 hover:text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                VI
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 transition-all ${
                  language === 'en'
                    ? 'bg-[#FEBC11] text-[#0D0D0E] shadow-sm'
                    : isLight
                    ? 'text-gray-600 hover:text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            {/* Theme Toggle Button: Segmented Tối / Sáng control */}
            <div
              id="header-theme-toggle"
              className={`flex border-2 border-black p-0.5 font-black text-xs shadow-brutal ${
                isLight ? 'bg-white' : 'bg-[#141416]'
              }`}
            >
              <button
                type="button"
                onClick={() => isLight && onToggleTheme()}
                className={`px-2.5 py-1 transition-all flex items-center gap-1 cursor-pointer select-none ${
                  !isLight
                    ? 'bg-[#FEBC11] text-[#0D0D0E] shadow-sm'
                    : 'text-gray-600 hover:text-black'
                }`}
                title={language === 'vi' ? 'Chuyển sang Chế độ Tối' : 'Switch to Dark Mode'}
              >
                <span>🌙</span>
                <span>Tối</span>
              </button>
              <button
                type="button"
                onClick={() => !isLight && onToggleTheme()}
                className={`px-2.5 py-1 transition-all flex items-center gap-1 cursor-pointer select-none ${
                  isLight
                    ? 'bg-[#FEBC11] text-[#0D0D0E] shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
                title={language === 'vi' ? 'Chuyển sang Chế độ Sáng' : 'Switch to Light Mode'}
              >
                <span>☀️</span>
                <span>Sáng</span>
              </button>
            </div>

            {/* Gate 7 Sonic Flavor Pairings Interactive Badge with Coffee Bean & Note Hugging Animation */}
            <button
              id="header-booth-badge"
              onClick={onBoothClick}
              className={`flex items-center gap-2 px-2.5 py-1 border-2 border-black shadow-brutal active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer group ${
                isLight ? 'bg-white hover:bg-gray-50' : 'bg-[#1F1F24] hover:bg-[#282830] border-[#FEBC11]'
              }`}
              title={language === 'vi' ? 'Khám phá Gate 7 Sonic Flavor Pairings (Hòa âm & Vị giác)' : 'Explore Gate 7 Sonic Flavor Pairings'}
            >
              <SonicPairingG7Icon size="sm" showRipples={true} showSteam={true} />
              <div className="flex flex-col text-left leading-tight">
                <span
                  className={`text-[11px] font-black uppercase tracking-wider ${
                    isLight ? 'text-black group-hover:text-amber-800' : 'text-white group-hover:text-[#FEBC11]'
                  }`}
                >
                  SONIC PAIRINGS
                </span>
                <span className={`text-[9px] font-extrabold flex items-center gap-1 ${isLight ? 'text-gray-700' : 'text-[#FEBC11]'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  {language === 'vi' ? 'Thử Nghiệm' : 'Trial Mode'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

